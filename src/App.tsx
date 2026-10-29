import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { CalendarDays, Check, CircleHelp, Clock3, FileAudio, FileText, Home, Library, ListMusic, LogOut, Menu, Music2, Play, Plus, Search, Settings2, Share2, SlidersHorizontal, Sparkles, Users, X, Download, Copy, Mail, LockKeyhole, RefreshCw, ShieldCheck, ClipboardList, Shirt, Megaphone, UserCheck, Save, CalendarCheck, CheckCircle2, MessageCircle, Send, UserCircle, Guitar } from 'lucide-react';
import { isRvmBackendConfigured, supabase } from './lib/supabase';

type Choir = { id:string; name:string; invite_code:string };
type Song = { id:string; title:string; category:string; language:string; lyrics:string; composer:string; arranger:string; added:string; lastPerformed:string; event:string; favorite:boolean };
type SongFile = { id:string; storage_path:string; original_filename:string; mime_type:string; file_size_bytes:number; kind:string };
type RvmProfile = { user_id:string; display_name:string; email:string; approval_status:'pending'|'approved'|'rejected'|'suspended'; role:string; created_at?:string };
type RosterRow = { id:string; month_start:string; duty_type:string; title:string; member_user_id:string|null; notes:string|null; status:string };
type AdminItem = { id:string; item_type:string; title:string; details:string; event_date:string|null; status:string };
type ChoirMessage = {id:string;sender_id:string;recipient_id:string|null;topic:string|null;body:string;created_at:string;message_type?:'text'|'voice';audio_path?:string|null;transcript?:string|null;duration_ms?:number|null};
type MusicAssignment = {id:string;title:string;event_date:string|null;assignment_type:string;instrument_name:string;assigned_user_id:string|null;musical_key:string|null;tempo_bpm:number|null;time_signature:string|null;notes:string;status:string};
type MemberRoleAssignment = {id:string;user_id:string;role_key:string;instrument_name:string|null;created_at:string};
type MessageRead = {message_id:string;user_id:string;read_at:string};
const categories = ['All Songs','Hymns','Praise & Worship','Special Numbers','Christmas','Anthems','Traditional'];
const MicIcon=()=> <MessageCircle size={16}/>;
const SquareIcon=()=> <X size={16}/>;
const fmt=(date:string)=>date?new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'Not recorded';
const prettyError=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.';
const safeFilename=(name:string)=>name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100)||'choir-file';

export default function App(){
 const [user,setUser]=useState<User|null>(null);
 const [showAuth,setShowAuth]=useState(false);
 const [profile,setProfile]=useState<RvmProfile|null>(null);
 const [profileLoading,setProfileLoading]=useState(false);
 const [siteContent,setSiteContent]=useState<Record<string,{title:string;body:string}>>({welcome_headline:{title:'A choir that stays in harmony.',body:'RVM Choir brings your music library, rehearsals, monthly duties, Sunday service planning and choir administration into one organised space.'},welcome_about:{title:'More than a song library',body:'Find lyrics, arrangements, recordings and performance history; coordinate uniform rosters, backup and press-team duty; plan choir Sundays; and keep everyone aligned between rehearsals.'},church_theme:{title:'Monthly church theme',body:'The church owner can publish this month’s theme and scripture reference here.'},church_logo:{title:'Church logo URL',body:''}});
 const [memberProfiles,setMemberProfiles]=useState<RvmProfile[]>([]);
 const [directoryProfiles,setDirectoryProfiles]=useState<any[]>([]);
 const [communityMessages,setCommunityMessages]=useState<ChoirMessage[]>([]);
 const [messageBody,setMessageBody]=useState('');
 const [isRecordingVoice,setIsRecordingVoice]=useState(false);
 const [voiceUrls,setVoiceUrls]=useState<Record<string,string>>({});
 const [isDictating,setIsDictating]=useState(false);
 const mediaRecorderRef=useRef<MediaRecorder|null>(null);
 const mediaStreamRef=useRef<MediaStream|null>(null);
 const voiceChunksRef=useRef<Blob[]>([]);
 const recordingStartedAtRef=useRef(0);
 const recognitionRef=useRef<any>(null);
 const voiceRecognitionRef=useRef<any>(null);
 const voiceTranscriptRef=useRef('');
 const [messageTopic,setMessageTopic]=useState('');
 const [messageRecipient,setMessageRecipient]=useState('');
 const [messageTopicFilter,setMessageTopicFilter]=useState('');
 const [unreadMessageCount,setUnreadMessageCount]=useState(0);
 const [memberRoleAssignments,setMemberRoleAssignments]=useState<MemberRoleAssignment[]>([]);
 const [roleAssignmentForm,setRoleAssignmentForm]=useState({user_id:'',role_key:'instrumentalist',instrument_name:''});
 const [avatarFile,setAvatarFile]=useState<File|null>(null);
 const [memberForm,setMemberForm]=useState({display_name:'',voice_part:'',bio:'',instruments:''});
 const [musicAssignments,setMusicAssignments]=useState<MusicAssignment[]>([]);
 const [assignmentForm,setAssignmentForm]=useState({title:'',event_date:'',assignment_type:'service',instrument_name:'Keyboard/Piano',assigned_user_id:'',musical_key:'',tempo_bpm:'',time_signature:'4/4',notes:''});
 const [rosterRows,setRosterRows]=useState<RosterRow[]>([]);
 const [adminItems,setAdminItems]=useState<AdminItem[]>([]);
 const [rosterForm,setRosterForm]=useState({month_start:new Date().toISOString().slice(0,7)+'-01',duty_type:'uniform',title:'',member_user_id:'',notes:''});
 const [adminForm,setAdminForm]=useState({item_type:'choir_sunday',title:'',details:'',event_date:'',status:'planned'});
 const [cmsForm,setCmsForm]=useState({headlineTitle:'',headlineBody:'',aboutTitle:'',aboutBody:'',themeTitle:'',themeBody:'',logoUrl:''});
 const [cmsLogoFile,setCmsLogoFile]=useState<File|null>(null);
 const [authLoading,setAuthLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [authMode,setAuthMode]=useState<'signin'|'signup'|'reset'>('signin');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [displayName,setDisplayName]=useState('');
 const [authMessage,setAuthMessage]=useState('');
 const [choir,setChoir]=useState<Choir|null>(null);
 const [role,setRole]=useState('member');
 const [setupMode,setSetupMode]=useState<'create'|'join'>('create');
 const [choirName,setChoirName]=useState('');
 const [inviteCode,setInviteCode]=useState('');
 const [songs,setSongs]=useState<Song[]>([]);
 const [files,setFiles]=useState<SongFile[]>([]);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('All Songs');
 const [active,setActive]=useState('Library');
 const [selected,setSelected]=useState<string|null>(null);
 const [showAdd,setShowAdd]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const [notice,setNotice]=useState('');
 const [loadingSongs,setLoadingSongs]=useState(false);
 const [signedUrls,setSignedUrls]=useState<Record<string,string>>({});
 const [uploadFile,setUploadFile]=useState<File|null>(null);
 const [performanceEvent,setPerformanceEvent]=useState('');
 const [showPerformance,setShowPerformance]=useState(false);
 const [form,setForm]=useState({title:'',category:'Hymns',language:'English',lyrics:'',composer:'',arranger:'',event:'',lastPerformed:''});
 const isManager=['owner','admin','director','librarian'].includes(role);
 const canManageRoster=['owner','admin','director','uniform_coordinator','backup_coordinator','press_team'].includes(profile?.role||role);
 const canManageAdmin=['owner','admin','director'].includes(profile?.role||role);
 const tell=useCallback((message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(''),4200)},[]);

 useEffect(()=>{
  if(!isRvmBackendConfigured){setAuthLoading(false);return}
  let alive=true;
  supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)tell(error.message);setUser(data.session?.user??null);setAuthLoading(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setUser(next?.user??null);setAuthLoading(false)});
  return ()=>{alive=false;subscription.unsubscribe()};
 },[tell]);

 useEffect(()=>{
  let alive=true;
  if(!isRvmBackendConfigured){setProfileLoading(false);return}
  if(!user){setProfile(null);setProfileLoading(false);return}
  setProfileLoading(true);
  (async()=>{
   try{
    await supabase.rpc('rvm_ensure_profile');
    const {data,error}=await supabase.from('rvm_profiles').select('user_id,display_name,email,approval_status,role,created_at').eq('user_id',user.id).single();
    if(error)throw error;
    if(alive)setProfile(data as RvmProfile);
   }catch(e){if(alive)tell('Could not verify account approval: '+prettyError(e))}
   finally{if(alive)setProfileLoading(false)}
  })();
  return ()=>{alive=false};
 },[user,tell]);

 const loadWorkspace=useCallback(async(currentUser:User)=>{
  setBusy(true);
  try{
   const {data:membership,error:memberError}=await supabase.from('choir_members').select('choir_id,role').eq('user_id',currentUser.id).order('joined_at',{ascending:true}).limit(1).maybeSingle();
   if(memberError)throw memberError;
   if(!membership){setChoir(null);setRole('member');setSongs([]);return}
   const {data:choirData,error:choirError}=await supabase.from('choirs').select('id,name,invite_code').eq('id',membership.choir_id).single();
   if(choirError)throw choirError;
   setChoir(choirData as Choir);setRole(profile?.role||membership.role);
  }catch(e){tell('Could not load your choir: '+prettyError(e))}
  finally{setBusy(false)}
 },[tell]);

 useEffect(()=>{
  if(user&&profile?.approval_status==='approved')void loadWorkspace(user);
  else{setChoir(null);setSongs([]);setRole(profile?.role||'member')}
 },[user,profile,loadWorkspace]);

 useEffect(()=>{
  if(!isRvmBackendConfigured)return;
  supabase.from('rvm_site_content').select('content_key,title,body').then(({data})=>{
   if(data?.length)setSiteContent(previous=>({...previous,...Object.fromEntries(data.map(row=>[row.content_key,{title:row.title,body:row.body}]))}));
  });
 },[]);

 useEffect(()=>{
  if(profile?.role==='owner'){
   supabase.from('rvm_site_content').select('content_key,title,body').then(({data})=>{
    const rows=Object.fromEntries((data||[]).map(row=>[row.content_key,row]));
    setCmsForm({headlineTitle:rows.welcome_headline?.title||'',headlineBody:rows.welcome_headline?.body||'',aboutTitle:rows.welcome_about?.title||'',aboutBody:rows.welcome_about?.body||'',themeTitle:rows.church_theme?.title||'',themeBody:rows.church_theme?.body||'',logoUrl:rows.church_logo?.body||''});
   });
  }
 },[profile]);

 const loadSongs=useCallback(async()=>{
  if(!choir||!user)return;
  setLoadingSongs(true);
  try{
   const [{data:rows,error},{data:favourites,error:favError},{data:history,error:historyError}]=await Promise.all([
    supabase.from('songs').select('id,title,category,language,lyrics,composer,arranger,created_at,archived_at').eq('choir_id',choir.id).is('archived_at',null).order('title'),
    supabase.from('song_favourites').select('song_id').eq('user_id',user.id),
    supabase.from('song_performances').select('song_id,performed_on,event_name').eq('choir_id',choir.id).order('performed_on',{ascending:false})
   ]);
   if(error)throw error;if(favError)throw favError;if(historyError)throw historyError;
   const favSet=new Set((favourites??[]).map(x=>x.song_id));
   const latest=new Map<string,{date:string,event:string}>();
   for(const item of history??[])if(!latest.has(item.song_id))latest.set(item.song_id,{date:item.performed_on,event:item.event_name});
   setSongs((rows??[]).map(row=>({id:row.id,title:row.title,category:row.category||'Uncategorised',language:row.language||'English',lyrics:row.lyrics||'',composer:row.composer||'',arranger:row.arranger||'',added:(row.created_at||'').slice(0,10),lastPerformed:latest.get(row.id)?.date||'',event:latest.get(row.id)?.event||'',favorite:favSet.has(row.id)})));
  }catch(e){tell('Could not load songs: '+prettyError(e))}
  finally{setLoadingSongs(false)}
 },[choir,user,tell]);

 useEffect(()=>{void loadSongs()},[loadSongs]);

 const loadFiles=useCallback(async(songId:string)=>{
  if(!choir)return;
  const {data,error}=await supabase.from('song_files').select('id,storage_path,original_filename,mime_type,file_size_bytes,kind').eq('choir_id',choir.id).eq('song_id',songId).order('created_at');
  if(error){tell('Could not load attachments: '+prettyError(error));return}
  setFiles((data??[]) as SongFile[]);
 },[choir,tell]);
 useEffect(()=>{if(selected)void loadFiles(selected);else{setFiles([]);setSignedUrls({})}},[selected,loadFiles]);

 const filtered=useMemo(()=>songs.filter(s=>(category==='All Songs'||s.category===category)&&(active!=='Favorites'||s.favorite)&&(s.title+' '+s.lyrics+' '+s.category+' '+s.composer+' '+s.arranger+' '+s.event).toLowerCase().includes(query.toLowerCase())),[songs,category,active,query]);
 const chosen=songs.find(s=>s.id===selected);
 const stats=[{label:'Songs in library',value:songs.length,icon:Library},{label:'Categories',value:new Set(songs.map(s=>s.category)).size,icon:ListMusic},{label:'Recently performed',value:songs.filter(s=>s.lastPerformed&&Date.now()-new Date(s.lastPerformed).getTime()<30*86400000).length,icon:CalendarDays}];

 async function submitAuth(e:FormEvent){
  e.preventDefault();setBusy(true);setAuthMessage('');
  try{
   if(authMode==='signup'){
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:displayName.trim()},emailRedirectTo:window.location.origin}});
    if(error)throw error;
    if(data.session){setAuthMessage('Account created. You are signed in.');}
    else{setAuthMessage('Account created. Check your email to confirm your address, then sign in.');setAuthMode('signin')}
   }else if(authMode==='reset'){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
    if(error)throw error;setAuthMessage('If an account exists for this email, a password reset message has been sent.');
   }else{
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)throw error;setAuthMessage('Signed in successfully.');
   }
  }catch(e){setAuthMessage(prettyError(e))}finally{setBusy(false)}
 }
 async function signOut(){await supabase.auth.signOut();setChoir(null);setSongs([]);setSelected(null);tell('You have signed out.')}
 async function rotateInviteCode(){
  if(!choir)return;
  setBusy(true);
  try{const {data,error}=await supabase.rpc('rvm_rotate_invite_code');if(error)throw error;setChoir({...choir,invite_code:data});tell('A new invite code was created. The old code no longer works.')}
  catch(e){tell('Could not rotate invite code: '+prettyError(e))}
  finally{setBusy(false)}
 }
 async function createChoir(e:FormEvent){
  e.preventDefault();if(!choirName.trim())return;setBusy(true);
  try{const {error}=await supabase.rpc('rvm_create_choir',{choir_name:choirName.trim(),choir_description:null});if(error)throw error;await loadWorkspace(user!);tell('Choir workspace created.');setChoirName('')}
  catch(e){tell('Could not create choir: '+prettyError(e))}
  finally{setBusy(false)}
 }
 async function joinChoir(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{const {error}=await supabase.rpc('rvm_join_choir',{choir_invite_code:inviteCode.trim().toLowerCase()});if(error)throw error;await loadWorkspace(user!);tell('You have joined the choir.');setInviteCode('')}
  catch(e){tell('Could not join choir: '+prettyError(e))}
  finally{setBusy(false)}
 }
 async function addSong(e:FormEvent){
  e.preventDefault();if(!choir||!user||!isManager)return;
  if(!form.title.trim()){tell('Please enter a song title.');return}
  setBusy(true);
  try{
   const {data,error}=await supabase.from('songs').insert({choir_id:choir.id,title:form.title.trim(),category:form.category,language:form.language.trim()||'English',lyrics:form.lyrics.trim()||null,composer:form.composer.trim()||null,arranger:form.arranger.trim()||null,created_by:user.id}).select('id').single();
   if(error)throw error;
   if(uploadFile){await uploadAttachment(data.id,uploadFile)}
   if(form.lastPerformed){
    const {error:historyError}=await supabase.from('song_performances').insert({choir_id:choir.id,song_id:data.id,performed_on:form.lastPerformed,event_name:form.event.trim()||'Choir performance',created_by:user.id});
    if(historyError)throw historyError;
   }
   setShowAdd(false);setForm({title:'',category:'Hymns',language:'English',lyrics:'',composer:'',arranger:'',event:'',lastPerformed:''});setUploadFile(null);setCategory('All Songs');setQuery('');setActive('Library');await loadSongs();setSelected(data.id);tell('Song saved to your shared choir library.');
  }catch(e){tell('Could not save song: '+prettyError(e))}
  finally{setBusy(false)}
 }
 async function uploadAttachment(songId:string,file:File){
  if(!choir||!user)throw new Error('Sign in and select a choir first.');
  const allowed=['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'].includes(file.type);
  if(!allowed)throw new Error('Choose MP3, MP4/M4A, AAC, OGG, WAV, PDF, Word or text files.');
  if(file.size>50*1024*1024)throw new Error('Files must be 50 MB or smaller.');
  const path=choir.id+'/'+songId+'/'+crypto.randomUUID()+'-'+safeFilename(file.name);
  const {error:uploadError}=await supabase.storage.from('rvm-choir-files').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const kind=file.type.startsWith('audio/')?'audio':file.type==='application/pdf'?'score':'document';
  const {error:rowError}=await supabase.from('song_files').insert({choir_id:choir.id,song_id:songId,storage_path:path,original_filename:file.name,mime_type:file.type||'application/octet-stream',file_size_bytes:file.size,kind,uploaded_by:user.id});
  if(rowError){await supabase.storage.from('rvm-choir-files').remove([path]);throw rowError}
 }
 async function toggleFavorite(song:Song){
  if(!user)return;
  const previous=song.favorite;
  setSongs(p=>p.map(x=>x.id===song.id?{...x,favorite:!previous}:x));
  const result=previous?await supabase.from('song_favourites').delete().eq('song_id',song.id).eq('user_id',user.id):await supabase.from('song_favourites').insert({song_id:song.id,user_id:user.id});
  if(result.error){setSongs(p=>p.map(x=>x.id===song.id?{...x,favorite:previous}:x));tell('Could not update favourite: '+result.error.message)}
 }
 async function getFileUrl(file:SongFile){
  if(signedUrls[file.id])return signedUrls[file.id];
  const {data,error}=await supabase.storage.from('rvm-choir-files').createSignedUrl(file.storage_path,60*60);
  if(error)throw error;setSignedUrls(p=>({...p,[file.id]:data.signedUrl}));return data.signedUrl;
 }
 async function openFile(file:SongFile){
  try{const url=await getFileUrl(file);window.open(url,'_blank','noopener,noreferrer')}catch(e){tell('Could not open file: '+prettyError(e))}
 }
 async function recordPerformance(e:FormEvent){
  e.preventDefault();if(!chosen||!choir||!user)return;setBusy(true);
  try{const {error}=await supabase.from('song_performances').insert({choir_id:choir.id,song_id:chosen.id,performed_on:new Date().toISOString().slice(0,10),event_name:performanceEvent.trim()||'Choir performance',created_by:user.id});if(error)throw error;setShowPerformance(false);setPerformanceEvent('');await loadSongs();tell('Performance history updated.')}
  catch(e){tell('Could not record performance: '+prettyError(e))}finally{setBusy(false)}
 }
 const share=async(s:Song)=>{const text='RVM Choir · '+s.title+(s.composer?'\nComposer: '+s.composer:'')+(s.lyrics?'\n\n'+s.lyrics:'');try{if(navigator.share)await navigator.share({title:s.title,text});else{await navigator.clipboard.writeText(text);tell('Song details copied for sharing.')}}catch(e){if(e instanceof Error&&e.name!=='AbortError')tell('Could not share: '+e.message)}};


 const loadCommunityData=useCallback(async()=>{
  if(!choir||!user)return;
  const [{data:profiles,error:profileError},{data:messages,error:messageError},{data:assignments,error:assignmentError},{data:reads,error:readsError},{data:roles,error:rolesError}]=await Promise.all([
   supabase.from('rvm_profiles').select('user_id,display_name,approval_status,role,created_at,avatar_url,voice_part,bio,instruments').eq('approval_status','approved').order('display_name'),
   supabase.from('rvm_messages').select('id,sender_id,recipient_id,topic,body,created_at,message_type,audio_path,transcript,duration_ms').eq('choir_id',choir.id).order('created_at',{ascending:true}).limit(250),
   supabase.from('rvm_music_assignments').select('id,title,event_date,assignment_type,instrument_name,assigned_user_id,musical_key,tempo_bpm,time_signature,notes,status').eq('choir_id',choir.id).order('event_date',{ascending:true}),
   supabase.from('rvm_message_reads').select('message_id').eq('user_id',user.id),
   supabase.from('rvm_member_roles').select('id,user_id,role_key,instrument_name,created_at').eq('choir_id',choir.id).order('created_at',{ascending:false})
  ]);
  if(profileError)tell('Could not load member directory: '+profileError.message);else{setDirectoryProfiles(profiles||[]);const me=(profiles||[]).find(p=>p.user_id===user.id);if(me)setMemberForm({display_name:me.display_name||'',voice_part:me.voice_part||'',bio:me.bio||'',instruments:(me.instruments||[]).join(', ')});}
  if(messageError)tell('Could not load messages: '+messageError.message);else{
   const list=(messages||[]) as ChoirMessage[];setCommunityMessages(list);const nextVoiceUrls:Record<string,string>={};await Promise.all(list.filter(m=>m.message_type==='voice'&&m.audio_path).map(async m=>{const {data}=await supabase.storage.from('rvm-choir-chat-audio').createSignedUrl(m.audio_path!,60*60);if(data?.signedUrl)nextVoiceUrls[m.id]=data.signedUrl;}));setVoiceUrls(nextVoiceUrls);
   if(readsError)tell('Could not load read receipts: '+readsError.message);
   else{
    const readIds=new Set(((reads||[]) as MessageRead[]).map(x=>x.message_id));
    const unread=list.filter(m=>m.sender_id!==user.id&&!readIds.has(m.id)&&(m.recipient_id===null||m.recipient_id===user.id));
    setUnreadMessageCount(unread.length);
    if(active==='Community & music'&&unread.length){
     const {error:markError}=await supabase.from('rvm_message_reads').upsert(unread.map(m=>({message_id:m.id,user_id:user.id})),{onConflict:'message_id,user_id'});
     if(!markError)setUnreadMessageCount(0);else tell('Messages loaded, but read status could not be saved.');
    }
   }
  }
  if(assignmentError)tell('Could not load music assignments: '+assignmentError.message);else setMusicAssignments((assignments||[]) as MusicAssignment[]);
  if(rolesError)tell('Could not load role assignments: '+rolesError.message);else setMemberRoleAssignments((roles||[]) as MemberRoleAssignment[]);
 },[choir,user,tell,active]);
 useEffect(()=>{if(active==='Community & music'&&profile?.approval_status==='approved')void loadCommunityData()},[active,profile,loadCommunityData]);
 useEffect(()=>{
  if(!choir||!user||profile?.approval_status!=='approved')return;
  const channel=supabase.channel('rvm-chat-'+choir.id+'-'+user.id)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'rvm_messages',filter:'choir_id=eq.'+choir.id},payload=>{
    const m=payload.new as ChoirMessage;
    if(m.sender_id!==user.id&&(m.recipient_id===null||m.recipient_id===user.id)&&active!=='Community & music')tell('You have a new choir message.');
    void loadCommunityData();
   }).subscribe();
  const poll=window.setInterval(()=>void loadCommunityData(),30000);
  return()=>{window.clearInterval(poll);void supabase.removeChannel(channel)};
 },[choir,user,profile?.approval_status,active,loadCommunityData,tell]);
 async function saveMemberProfile(e:FormEvent){
  e.preventDefault();if(!user)return;setBusy(true);
  try{let avatarUrl=directoryProfiles.find(p=>p.user_id===user.id)?.avatar_url||'';
   if(avatarFile){if(!['image/png','image/jpeg','image/webp'].includes(avatarFile.type))throw new Error('Choose a PNG, JPG or WebP image.');if(avatarFile.size>5*1024*1024)throw new Error('Profile pictures must be 5 MB or smaller.');const path=user.id+'/'+Date.now()+'-'+safeFilename(avatarFile.name);const {error:uploadError}=await supabase.storage.from('rvm-choir-avatars').upload(path,avatarFile,{contentType:avatarFile.type,upsert:false});if(uploadError)throw uploadError;avatarUrl=supabase.storage.from('rvm-choir-avatars').getPublicUrl(path).data.publicUrl;}
   const {error}=await supabase.from('rvm_profiles').update({display_name:memberForm.display_name.trim(),voice_part:memberForm.voice_part||null,bio:memberForm.bio.trim(),instruments:memberForm.instruments.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8),avatar_url:avatarUrl||null}).eq('user_id',user.id);if(error)throw error;setAvatarFile(null);tell('Your member profile has been saved.');await loadCommunityData();
  }catch(e){tell('Could not save profile: '+prettyError(e))}finally{setBusy(false)}
 }
 async function sendCommunityMessage(e:FormEvent){
  e.preventDefault();if(!choir||!user||!messageBody.trim())return;setBusy(true);
  try{const {error}=await supabase.from('rvm_messages').insert({choir_id:choir.id,sender_id:user.id,recipient_id:messageRecipient||null,topic:messageTopic.trim()||null,body:messageBody.trim(),message_type:'text'});if(error)throw error;setMessageBody('');await loadCommunityData();}
  catch(e){tell('Could not send message: '+prettyError(e))}finally{setBusy(false)}
 }
 async function startVoiceRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){tell('Voice recording is not supported by this browser. Try the latest Chrome or Edge.');return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});mediaStreamRef.current=stream;voiceChunksRef.current=[];const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);mediaRecorderRef.current=recorder;recordingStartedAtRef.current=Date.now();voiceTranscriptRef.current='';const SpeechRecognitionCtor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(SpeechRecognitionCtor){try{const sr=new SpeechRecognitionCtor();sr.lang='en-NG';sr.continuous=true;sr.interimResults=false;sr.onresult=(event:any)=>{for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)voiceTranscriptRef.current+=(voiceTranscriptRef.current?' ':'')+event.results[i][0].transcript.trim();}};sr.onerror=()=>{};voiceRecognitionRef.current=sr;sr.start()}catch{voiceRecognitionRef.current=null}}recorder.ondataavailable=e=>{if(e.data.size)voiceChunksRef.current.push(e.data)};recorder.onstop=()=>{const blob=new Blob(voiceChunksRef.current,{type:recorder.mimeType||'audio/webm'});stream.getTracks().forEach(t=>t.stop());mediaStreamRef.current=null;try{voiceRecognitionRef.current?.stop()}catch{}voiceRecognitionRef.current=null;setIsRecordingVoice(false);if(blob.size)void sendVoiceMessage(blob,Date.now()-recordingStartedAtRef.current,recorder.mimeType||'audio/webm',voiceTranscriptRef.current)};recorder.start();setIsRecordingVoice(true);tell('Recording started. Stop when you are ready to send.');}
  catch(e){tell('Could not access the microphone: '+prettyError(e))}
 }
 function stopVoiceRecording(){if(mediaRecorderRef.current&&mediaRecorderRef.current.state!=='inactive')mediaRecorderRef.current.stop()}
 async function sendVoiceMessage(blob:Blob,durationMs:number,mimeType:string,transcript:string){
  if(!choir||!user)return;setBusy(true);
  try{const storageMime=mimeType.split(';')[0];const ext=storageMime.includes('mp4')?'m4a':storageMime.includes('ogg')?'ogg':storageMime.includes('mpeg')?'mp3':'webm';const path=choir.id+'/'+user.id+'/'+crypto.randomUUID()+'.'+ext;const {error:uploadError}=await supabase.storage.from('rvm-choir-chat-audio').upload(path,blob,{contentType:storageMime,upsert:false});if(uploadError)throw uploadError;
   const {error}=await supabase.from('rvm_messages').insert({choir_id:choir.id,sender_id:user.id,recipient_id:messageRecipient||null,topic:messageTopic.trim()||null,body:'Voice message',message_type:'voice',audio_path:path,transcript:transcript.trim()||null,duration_ms:Math.min(Math.max(0,Math.round(durationMs)),600000)});if(error){await supabase.storage.from('rvm-choir-chat-audio').remove([path]);throw error;}await loadCommunityData();tell('Voice message sent.');
  }catch(e){tell('Could not send voice message: '+prettyError(e))}finally{setBusy(false)}
 }
 function toggleDictation(){
  const SpeechRecognitionCtor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!SpeechRecognitionCtor){tell('Live speech-to-text is not supported in this browser. Try Chrome or Edge, or type your message.');return;}
  if(isDictating){recognitionRef.current?.stop();setIsDictating(false);return;}
  const recognition=new SpeechRecognitionCtor();recognition.lang='en-NG';recognition.continuous=true;recognition.interimResults=true;recognitionRef.current=recognition;
  recognition.onresult=(event:any)=>{let finalText='';for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)finalText+=event.results[i][0].transcript+' ';}if(finalText)setMessageBody(prev=>(prev?prev.trimEnd()+' ':'')+finalText.trim());};
  recognition.onerror=()=>{setIsDictating(false);tell('Speech transcription stopped. Check microphone permission and try again.')};
  recognition.onend=()=>setIsDictating(false);recognition.start();setIsDictating(true);tell('Speak now. Your words will appear in the message box.');
 }
 async function saveMusicAssignment(e:FormEvent){
  e.preventDefault();if(!choir||!user)return;setBusy(true);
  try{const {error}=await supabase.from('rvm_music_assignments').insert({choir_id:choir.id,title:assignmentForm.title.trim(),event_date:assignmentForm.event_date||null,assignment_type:assignmentForm.assignment_type,instrument_name:assignmentForm.instrument_name,assigned_user_id:assignmentForm.assigned_user_id||null,musical_key:assignmentForm.musical_key||null,tempo_bpm:assignmentForm.tempo_bpm?Number(assignmentForm.tempo_bpm):null,time_signature:assignmentForm.time_signature||null,notes:assignmentForm.notes.trim(),created_by:user.id});if(error)throw error;setAssignmentForm({...assignmentForm,title:'',event_date:'',assigned_user_id:'',musical_key:'',tempo_bpm:'',notes:''});await loadCommunityData();tell('Music assignment saved.')}catch(e){tell('Could not save assignment: '+prettyError(e))}finally{setBusy(false)}
 }

 async function assignMemberRole(e:FormEvent){
  e.preventDefault();if(!choir||!user||!roleAssignmentForm.user_id)return;setBusy(true);
  try{
   const {error}=await supabase.from('rvm_member_roles').insert({choir_id:choir.id,user_id:roleAssignmentForm.user_id,role_key:roleAssignmentForm.role_key,instrument_name:roleAssignmentForm.instrument_name.trim()||null,assigned_by:user.id});
   if(error)throw error;
   setRoleAssignmentForm({...roleAssignmentForm,instrument_name:''});await loadCommunityData();tell('Additional role assigned.');
  }catch(e){tell('Could not assign role: '+prettyError(e))}finally{setBusy(false)}
 }
 const loadAdminData=useCallback(async()=>{
  if(!choir)return;
  if(profile?.role==='owner'){
   const {data,error}=await supabase.from('rvm_profiles').select('user_id,display_name,email,approval_status,role,created_at').order('created_at',{ascending:false});
   if(!error&&data)setMemberProfiles(data as RvmProfile[]);
  }
  const [{data:roster},{data:items}]=await Promise.all([
   supabase.from('rvm_monthly_roster').select('id,month_start,duty_type,title,member_user_id,notes,status').eq('choir_id',choir.id).order('month_start',{ascending:false}),
   supabase.from('rvm_choir_admin_items').select('id,item_type,title,details,event_date,status').eq('choir_id',choir.id).order('event_date',{ascending:false})
  ]);
  setRosterRows((roster||[]) as RosterRow[]);setAdminItems((items||[]) as AdminItem[]);
 },[choir,profile]);
 useEffect(()=>{if(user&&profile?.approval_status==='approved'&&choir&&['Administration','Monthly roster','Owner CMS','Community & music'].includes(active))void loadAdminData()},[user,profile,choir,active,loadAdminData]);

 async function reviewMember(targetId:string,decision:'approved'|'rejected'|'suspended',assignedRole='chorister'){
  setBusy(true);
  try{const {error}=await supabase.rpc('rvm_review_member',{target_user_id:targetId,decision,assigned_role:assignedRole});if(error)throw error;await loadAdminData();tell('Member access updated.')}
  catch(e){tell('Could not update member access: '+prettyError(e))}
  finally{setBusy(false)}
 }
 async function saveRoster(e:FormEvent){
  e.preventDefault();if(!choir||!user)return;setBusy(true);
  try{const {error}=await supabase.from('rvm_monthly_roster').insert({choir_id:choir.id,month_start:rosterForm.month_start,duty_type:rosterForm.duty_type,title:rosterForm.title.trim(),member_user_id:rosterForm.member_user_id||null,notes:rosterForm.notes.trim()||null,created_by:user.id});if(error)throw error;setRosterForm({...rosterForm,title:'',member_user_id:'',notes:''});await loadAdminData();tell('Monthly roster entry saved.')}
  catch(e){tell('Could not save roster: '+prettyError(e))}finally{setBusy(false)}
 }
 async function saveAdminItem(e:FormEvent){
  e.preventDefault();if(!choir||!user)return;setBusy(true);
  try{const {error}=await supabase.from('rvm_choir_admin_items').insert({choir_id:choir.id,item_type:adminForm.item_type,title:adminForm.title.trim(),details:adminForm.details.trim(),event_date:adminForm.event_date||null,status:adminForm.status,created_by:user.id});if(error)throw error;setAdminForm({...adminForm,title:'',details:'',event_date:''});await loadAdminData();tell('Choir administration item saved.')}
  catch(e){tell('Could not save administration item: '+prettyError(e))}finally{setBusy(false)}
 }
 async function saveCms(e:FormEvent){
  e.preventDefault();if(!user)return;setBusy(true);
  try{
   let logoUrl=cmsForm.logoUrl.trim();
   if(cmsLogoFile){
    const allowedTypes=['image/png','image/jpeg','image/webp','image/gif'];
    if(!allowedTypes.includes(cmsLogoFile.type))throw new Error('Upload a PNG, JPG, WebP or GIF logo image.');
    if(cmsLogoFile.size>5*1024*1024)throw new Error('The logo image must be 5 MB or smaller.');
    const path=user.id+'/'+Date.now()+'-'+safeFilename(cmsLogoFile.name);
    const {error:uploadError}=await supabase.storage.from('rvm-choir-branding').upload(path,cmsLogoFile,{contentType:cmsLogoFile.type,upsert:false});
    if(uploadError)throw uploadError;
    logoUrl=supabase.storage.from('rvm-choir-branding').getPublicUrl(path).data.publicUrl;
   }
   const now=new Date().toISOString();
   const rows=[{content_key:'welcome_headline',title:cmsForm.headlineTitle,body:cmsForm.headlineBody,updated_by:user.id,updated_at:now},{content_key:'welcome_about',title:cmsForm.aboutTitle,body:cmsForm.aboutBody,updated_by:user.id,updated_at:now},{content_key:'church_theme',title:cmsForm.themeTitle.trim()||'Monthly church theme',body:cmsForm.themeBody,updated_by:user.id,updated_at:now},{content_key:'church_logo',title:logoUrl?'Church logo':'Church logo not set',body:logoUrl,updated_by:user.id,updated_at:now}];
   const {error}=await supabase.from('rvm_site_content').upsert(rows,{onConflict:'content_key'});if(error)throw error;
   setCmsForm(previous=>({...previous,logoUrl}));setCmsLogoFile(null);
   setSiteContent({welcome_headline:{title:cmsForm.headlineTitle,body:cmsForm.headlineBody},welcome_about:{title:cmsForm.aboutTitle,body:cmsForm.aboutBody},church_theme:{title:cmsForm.themeTitle.trim()||'Monthly church theme',body:cmsForm.themeBody},church_logo:{title:logoUrl?'Church logo':'Church logo not set',body:logoUrl}});tell('Welcome page, monthly theme and branding published.');
  }catch(e){tell('Could not publish website content: '+prettyError(e))}finally{setBusy(false)}
 }
 if(!isRvmBackendConfigured)return <div className="auth-screen"><div className="auth-card backend-setup-card"><div className="brand-mark auth-mark"><Music2 size={24}/></div><p className="eyebrow-light">SAFE SETUP REQUIRED</p><h1>RVM Choir is being prepared.</h1><p className="auth-subtitle">The current Vercel settings still point to the former Bool Supabase project. To protect Bool's existing users and data, this preview has intentionally blocked database access.</p><div className="backend-checklist"><strong>Before opening the library</strong><ol><li>Create or confirm a dedicated RVM Choir Supabase project.</li><li>Apply the RVM Choir migration from the development branch.</li><li>Set this project's Vercel preview variables to that project's URL and publishable key.</li><li>Configure email confirmation and password recovery redirect URLs.</li></ol></div><p className="auth-footnote">No Bool database is being used by this preview. Production will not be switched until the backend and security checks pass.</p></div></div>;
 if(authLoading)return <div className="auth-screen"><div className="auth-card"><div className="brand-mark auth-mark"><Music2 size={24}/></div><h1>RVM Choir</h1><p>Loading your secure choir workspace…</p></div></div>;
 if(!user&&!showAuth)return <div className="public-site">
  <header className="public-header"><div className="public-brand">{siteContent.church_logo?.body?<img className="church-logo" src={siteContent.church_logo.body} alt="Church logo" onError={e=>{e.currentTarget.style.display='none'}}/>:<span className="brand-mark"><Music2 size={23}/></span>}<span><strong>RVM Choir</strong><small>ONE HOME FOR YOUR CHOIR</small></span></div><div className="public-header-actions"><button className="outline-btn" onClick={()=>{setAuthMode('signin');setShowAuth(true)}}>Sign in</button><button className="primary-btn" onClick={()=>{setAuthMode('signup');setShowAuth(true)}}>Create account</button></div></header>
  <main className="public-main">{(siteContent.church_theme?.title&&siteContent.church_theme.title!=='Monthly church theme'||siteContent.church_theme?.body&&siteContent.church_theme.body!=='The church owner can publish this month’s theme and scripture reference here.')&&<section className="monthly-theme-card" aria-label="Church theme for the month"><div className="theme-symbol"><Sparkles size={22}/></div><div><span className="theme-eyebrow">THIS MONTH AT CHURCH</span><h2>{siteContent.church_theme?.title}</h2><p>{siteContent.church_theme?.body}</p></div></section>}<section className="public-hero"><div className="public-hero-copy"><span className="public-kicker"><span/> MADE FOR CHOIR LIFE</span><h1>{siteContent.welcome_headline?.title||'A choir that stays in harmony.'}</h1><p>{siteContent.welcome_headline?.body||'RVM Choir brings your music library, rehearsals, monthly duties, Sunday service planning and choir administration into one organised space.'}</p><div className="public-hero-actions"><button className="primary-btn" onClick={()=>{setAuthMode('signup');setShowAuth(true)}}>Request choir access <ShieldCheck size={17}/></button><button className="public-text-btn" onClick={()=>{setAuthMode('signin');setShowAuth(true)}}>Already have an account? Sign in</button></div><div className="public-trust"><span><CheckCircle2 size={16}/> Owner-approved membership</span><span><CheckCircle2 size={16}/> Private choir workspaces</span></div></div><div className="public-hero-art"><div className="public-orbit orbit-one"/><div className="public-orbit orbit-two"/><div className="public-note note-one">♪</div><div className="public-note note-two">♫</div><div className="public-hero-emblem"><Music2 size={55}/><span>Sing · Serve · Stay in sync</span></div><div className="public-mini-card"><CalendarCheck size={19}/><span><strong>Choir Sunday</strong><small>Plan the service together</small></span></div><div className="public-mini-card mini-card-bottom"><Users size={19}/><span><strong>Monthly roster</strong><small>Know who's on duty</small></span></div></div></section>
  <section className="public-features"><div className="public-section-heading"><span>ONE PLATFORM, MANY PURPOSES</span><h2>{siteContent.welcome_about?.title||'More than a song library'}</h2><p>{siteContent.welcome_about?.body||'Find lyrics, arrangements, recordings and performance history; coordinate uniform rosters, backup and press-team duty; plan choir Sundays; and keep everyone aligned between rehearsals.'}</p></div><div className="public-feature-grid"><article><span><Library size={21}/></span><h3>Music library</h3><p>Organise song lyrics, arrangements, rehearsal audio, scores and performance history.</p></article><article><span><Shirt size={21}/></span><h3>Monthly duty rosters</h3><p>Coordinate uniform, backup and press-team assignments, month by month.</p></article><article><span><CalendarCheck size={21}/></span><h3>Choir Sunday planning</h3><p>Keep service plans, rehearsals, meetings, announcements and follow-ups together.</p></article><article><span><Users size={21}/></span><h3>Clear roles and approvals</h3><p>Accounts stay restricted until the choir owner approves access and assigns responsibilities.</p></article></div></section>
  <section className="public-access"><div><span className="public-kicker">A PRIVATE SPACE FOR YOUR CHOIR</span><h2>Your account starts with a request.</h2><p>Anyone can explore this welcome page. Create an account to request access; the owner reviews requests before members can enter the choir workspace.</p></div><button className="primary-btn" onClick={()=>{setAuthMode('signup');setShowAuth(true)}}>Create an account <Plus size={17}/></button></section></main><footer className="public-footer"><span>RVM Choir · A RealTreats Technologies concept</span><span>Made for music, memory & ministry.</span></footer>
 </div>;
 if(!user)return <div className="auth-screen"><div className="auth-card"><button className="public-back-btn" onClick={()=>setShowAuth(false)}>← Back to welcome page</button><div className="brand-mark auth-mark"><Music2 size={24}/></div><p className="eyebrow-light">REAL TREATS TECHNOLOGIES</p><h1>{authMode==='signup'?'Join RVM Choir':authMode==='reset'?'Reset your password':'Welcome back'}</h1><p className="auth-subtitle">A shared home for your choir’s songs, lyrics, recordings and memories.</p><form onSubmit={submitAuth} className="auth-form">{authMode==='signup'&&<label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" required placeholder="Full name"/></label>}<label>Email address<span className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></span></label>{authMode!=='reset'&&<label>Password<span className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='signup'?'new-password':'current-password'} minLength={8} required placeholder="At least 8 characters"/></span></label>}{authMessage&&<div className="auth-message" role="status">{authMessage}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy?<RefreshCw size={17} className="spin"/>:null}{authMode==='signup'?'Create account':authMode==='reset'?'Send reset email':'Sign in'}</button></form><div className="auth-links">{authMode==='signin'&&<button onClick={()=>{setAuthMode('reset');setAuthMessage('')}}>Forgot password?</button>}{authMode!=='signin'&&<button onClick={()=>{setAuthMode('signin');setAuthMessage('')}}>Back to sign in</button>}{authMode!=='signup'&&<button onClick={()=>{setAuthMode('signup');setAuthMessage('')}}>Create an account</button>}</div><p className="auth-footnote">Your choir's library is private to its members. Use a real email address so you can confirm your account and recover access.</p></div></div>;
 if(user&&profileLoading)return <div className="auth-screen"><div className="auth-card"><div className="brand-mark auth-mark"><Music2 size={24}/></div><h1>Checking your access</h1><p>RVM Choir is securely checking your account approval.</p></div></div>;
 if(user&&!profileLoading&&!profile)return <div className="auth-screen"><div className="auth-card"><div className="brand-mark auth-mark"><ShieldCheck size={24}/></div><h1>We couldn't verify your access</h1><p className="auth-subtitle">Your private workspace remains locked because your approval status could not be confirmed. Please refresh or sign out and try again.</p><button className="primary-btn auth-submit" onClick={async()=>{await supabase.auth.signOut();setShowAuth(false)}}><LogOut size={16}/> Sign out</button></div></div>;
 if(user&&profile&&profile.approval_status!=='approved')return <div className="auth-screen"><div className="auth-card approval-card"><div className="brand-mark auth-mark"><ShieldCheck size={24}/></div><p className="eyebrow-light">MEMBERSHIP REVIEW</p><h1>{profile.approval_status==='pending'?'Your request is with the choir owner':profile.approval_status==='rejected'?'Access request not approved':'Your access is paused'}</h1><p className="auth-subtitle">{profile.approval_status==='pending'?'Your account is created, but the private choir workspace remains locked until the owner reviews and approves your request. You can sign out and return later.':profile.approval_status==='rejected'?'The owner has not approved this account. Contact the choir administrator if you believe this is a mistake.':'Your account is currently suspended. Contact the choir owner for help.'}</p><div className="approval-status-pill"><span/>{profile.approval_status.toUpperCase()}</div><p className="auth-footnote">You can see the public welcome page, but songs, rosters, recordings and administration tools are restricted until access is approved.</p><button className="primary-btn auth-submit" onClick={async()=>{await supabase.auth.signOut();setShowAuth(false)}}><LogOut size={16}/> Sign out</button></div></div>;

 if(!choir)return <div className="auth-screen"><div className="auth-card workspace-setup"><div className="brand-mark auth-mark"><Music2 size={24}/></div><p className="eyebrow-light">ONE MORE STEP</p><h1>Your choir starts here.</h1><p className="auth-subtitle">Create a new choir workspace, or join one with an invite code from your choir director.</p><div className="setup-tabs"><button className={setupMode==='create'?'setup-tab active':'setup-tab'} onClick={()=>setSetupMode('create')}>Create a choir</button><button className={setupMode==='join'?'setup-tab active':'setup-tab'} onClick={()=>setSetupMode('join')}>Join a choir</button></div>{setupMode==='create'?<form className="auth-form" onSubmit={createChoir}><label>Choir or church name<input value={choirName} onChange={e=>setChoirName(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Grace Voices Choir"/></label><button className="primary-btn auth-submit" disabled={busy}>{busy?'Creating…':'Create choir workspace'}</button></form>:<form className="auth-form" onSubmit={joinChoir}><label>Choir invite code<input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} required minLength={8} placeholder="Paste the code shared by your director"/></label><button className="primary-btn auth-submit" disabled={busy}>{busy?'Joining…':'Join choir'}</button></form>}<button className="auth-secondary" onClick={signOut}><LogOut size={16}/> Sign out</button></div>{notice&&<div className="toast"><Check size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}</div>;

 return <div className="app-shell">
  <aside className={'sidebar '+(mobileNav?'sidebar-open':'')}><div className="brand">{siteContent.church_logo?.body?<img className="church-logo" src={siteContent.church_logo.body} alt="Church logo" onError={e=>{e.currentTarget.style.display='none'}}/>:<div className="brand-mark"><Music2 size={22}/></div>}<div><strong>RVM Choir</strong><small>SHARED SONG LIBRARY</small></div><button className="icon-btn close-nav" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
   <div className="nav-label">WORKSPACE</div><button className={'nav-item '+(active==='Overview'?'nav-active':'')} onClick={()=>{setActive('Overview');setMobileNav(false)}}><Home size={18}/>Overview</button><button className={'nav-item '+(active==='Library'?'nav-active':'')} onClick={()=>{setActive('Library');setMobileNav(false)}}><Library size={18}/>Song library<span className="nav-count">{songs.length}</span></button><button className={'nav-item '+(active==='Favorites'?'nav-active':'')} onClick={()=>{setActive('Favorites');setMobileNav(false)}}><Sparkles size={18}/>Favourites</button><button className={'nav-item '+(active==='History'?'nav-active':'')} onClick={()=>{setActive('History');setMobileNav(false)}}><Clock3 size={18}/>Performance history</button>
   <div className="nav-label category-label">COLLECTIONS</div>{categories.slice(1).map(c=><button key={c} className={'nav-item category-item '+(category===c&&active==='Library'?'nav-active':'')} onClick={()=>{setCategory(c);setActive('Library');setMobileNav(false)}}><span className="category-dot"/> {c}</button>)}
   <div className="nav-label category-label">CHOIR COMMUNITY</div><button className={"nav-item "+(active==="Community & music"?"nav-active":"")} onClick={()=>{setActive("Community & music");setMobileNav(false)}}><MessageCircle size={18}/>Community & music <span className="unread-badge">{unreadMessageCount}</span></button><div className="nav-label category-label">CHOIR ADMINISTRATION</div><button className={'nav-item '+(active==='Monthly roster'?'nav-active':'')} onClick={()=>{setActive('Monthly roster');setMobileNav(false)}}><ClipboardList size={18}/>Monthly roster</button><button className={'nav-item '+(active==='Administration'?'nav-active':'')} onClick={()=>{setActive('Administration');setMobileNav(false)}}><CalendarCheck size={18}/>Choir administration</button>{profile?.role==='owner'&&<><div className="nav-label category-label">OWNER CONTROL</div><button className={'nav-item '+(active==='Owner CMS'?'nav-active':'')} onClick={()=>{setActive('Owner CMS');setMobileNav(false)}}><UserCheck size={18}/>Approvals & content</button></>}
   <div className="sidebar-bottom"><div className="choir-card"><div className="choir-card-icon"><Users size={18}/></div><strong>{choir.name}</strong><p>Your choir’s shared collection.</p><span>{role.toUpperCase()}</span></div><button className="nav-item" onClick={()=>{navigator.clipboard?.writeText(choir.invite_code).then(()=>tell('Invite code copied. Share it only with choir members.')).catch(()=>tell('Invite code: '+choir.invite_code))}}><Copy size={18}/>Copy invite code</button>{['owner','admin'].includes(role)&&<button className="nav-item" disabled={busy} onClick={()=>void rotateInviteCode()}><RefreshCw size={18}/>Regenerate invite code</button>}<button className="nav-item" onClick={()=>tell('Member role: '+role+'. Song and file management is limited to choir leaders and librarians.')}><Settings2 size={18}/>Permissions</button><button className="nav-item" onClick={()=>tell('RVM Choir supports your existing rehearsals and WhatsApp sharing; it does not read private WhatsApp chats.')}><CircleHelp size={18}/>Help & guidance</button><button className="nav-item" onClick={signOut}><LogOut size={18}/>Sign out</button></div>
  </aside>
  {mobileNav&&<button className="scrim" aria-label="Close menu" onClick={()=>setMobileNav(false)}/>}
  <main className="main-area"><header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button><div className="breadcrumb"><span>{choir.name}</span><span className="crumb-slash">/</span><strong>{active==='Favorites'?'Favourites':active==='History'?'Performance history':active}</strong></div><div className="top-actions"><span className="preview-badge live-badge"><span/>Shared library</span><div className="header-member"><span className="header-member-avatar">{directoryProfiles.find(p=>p.user_id===user.id)?.avatar_url?<img src={directoryProfiles.find(p=>p.user_id===user.id).avatar_url} alt=""/>:(profile?.display_name||user.user_metadata?.display_name||user.email||'R').slice(0,1).toUpperCase()}</span><span className="header-member-name">{directoryProfiles.find(p=>p.user_id===user.id)?.display_name||profile?.display_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Member'}</span></div></div></header>
  {active==='Monthly roster'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">MONTH-BY-MONTH COORDINATION</p><h1>Monthly duty roster</h1><p className="subhead">Coordinate uniform, backup, press team and Choir Sunday duties for each month.</p></div></div>{canManageRoster&&<div className="panel admin-form-panel"><div className="panel-head"><div><h2>Add a roster assignment</h2><p>Choose a month and duty category.</p></div></div><form className="admin-form-grid" onSubmit={saveRoster}><label>Month<input type="date" value={rosterForm.month_start} onChange={e=>setRosterForm({...rosterForm,month_start:e.target.value})} required/></label><label>Duty type<select value={rosterForm.duty_type} onChange={e=>setRosterForm({...rosterForm,duty_type:e.target.value})}><option value="uniform">Uniform coordination</option><option value="backup">Backup / support team</option><option value="press">Press team</option><option value="choir_sunday">Choir Sunday duty</option><option value="administration">Choir administration</option><option value="other">Other duty</option></select></label><label>Assignment title<input value={rosterForm.title} onChange={e=>setRosterForm({...rosterForm,title:e.target.value})} required placeholder="e.g. November uniform colour"/></label><label>Assign member<select value={rosterForm.member_user_id} onChange={e=>setRosterForm({...rosterForm,member_user_id:e.target.value})}><option value="">Not assigned / team-wide</option>{memberProfiles.filter(p=>p.approval_status==='approved').map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||p.email}</option>)}</select></label><label className="wide-field">Notes<input value={rosterForm.notes} onChange={e=>setRosterForm({...rosterForm,notes:e.target.value})} placeholder="Uniform details, reminders or handover notes"/></label><button className="primary-btn" disabled={busy}><Plus size={16}/> Save assignment</button></form></div>}<div className="roster-month-grid">{rosterRows.map(row=><article className="roster-card" key={row.id}><div className="roster-card-top"><span className={'roster-type roster-'+row.duty_type}>{row.duty_type.replace('_',' ')}</span><span>{new Date(row.month_start+'T12:00:00').toLocaleDateString('en',{month:'long',year:'numeric'})}</span></div><h3>{row.title}</h3><p>{row.notes||'No additional notes.'}</p><small>{row.status.toUpperCase()}</small></article>)}{!rosterRows.length&&<div className="empty-state">No monthly duties have been scheduled yet.</div>}</div></section>
  :active==='Administration'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">THE WHOLE CHOIR, IN SYNC</p><h1>Choir administration</h1><p className="subhead">Plan Choir Sunday, rehearsals, meetings, announcements and general choir follow-up.</p></div></div>{canManageAdmin&&<div className="panel admin-form-panel"><div className="panel-head"><div><h2>Create an administration item</h2><p>Keep decisions, responsibilities and dates in one place.</p></div></div><form className="admin-form-grid" onSubmit={saveAdminItem}><label>Category<select value={adminForm.item_type} onChange={e=>setAdminForm({...adminForm,item_type:e.target.value})}><option value="choir_sunday">Choir Sunday</option><option value="rehearsal">Rehearsal</option><option value="meeting">Meeting</option><option value="announcement">Announcement</option><option value="attendance">Attendance</option><option value="welfare">Welfare</option><option value="finance_note">Finance note</option><option value="general">General administration</option></select></label><label>Date<input type="date" value={adminForm.event_date} onChange={e=>setAdminForm({...adminForm,event_date:e.target.value})}/></label><label>Title<input value={adminForm.title} onChange={e=>setAdminForm({...adminForm,title:e.target.value})} required placeholder="e.g. Sunday ministration plan"/></label><label>Status<select value={adminForm.status} onChange={e=>setAdminForm({...adminForm,status:e.target.value})}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="wide-field">Details / message<textarea rows={3} value={adminForm.details} onChange={e=>setAdminForm({...adminForm,details:e.target.value})} placeholder="Programme, assignments, announcements and action points"/></label><button className="primary-btn" disabled={busy}><Plus size={16}/> Save administration item</button></form></div>}<div className="panel admin-items-panel"><div className="panel-head"><div><h2>Choir administration overview</h2><p>Upcoming plans, important messages and follow-up records.</p></div></div>{adminItems.map(item=><article className="admin-item-row" key={item.id}><span className="admin-item-icon">{item.item_type==='choir_sunday'?<CalendarCheck size={18}/>:item.item_type==='announcement'?<Megaphone size={18}/>:<ClipboardList size={18}/>}</span><div><strong>{item.title}</strong><p>{item.details||'No additional details.'}</p><small>{item.item_type.replace('_',' ')} · {item.event_date||'Date not set'} · {item.status.replace('_',' ')}</small></div></article>)}{!adminItems.length&&<div className="empty-state">Your choir administration overview will appear here when the first item is added.</div>}</div></section>
  :active==='Owner CMS'&&profile?.role==='owner'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">OWNER CONTROL CENTRE</p><h1>Approvals & content management</h1><p className="subhead">Review new account requests, assign roles and update the public welcome page.</p></div></div><div className="panel admin-items-panel"><div className="panel-head"><div><h2>Account approval queue</h2><p>Only approved members can enter the private choir workspace.</p></div></div>{memberProfiles.filter(p=>p.role!=='owner').map(member=><article className="approval-row" key={member.user_id}><span className="approval-avatar">{(member.display_name||member.email||'?').slice(0,1).toUpperCase()}</span><div className="approval-person"><strong>{member.display_name||'Name not provided'}</strong><small>{member.email} · {member.approval_status}</small></div><select aria-label={'Role for '+member.email} value={member.role} onChange={e=>setMemberProfiles(rows=>rows.map(p=>p.user_id===member.user_id?{...p,role:e.target.value}:p))}><option value="chorister">Chorister</option><option value="admin">Administrator</option><option value="director">Choir director</option><option value="music_director">Music director</option><option value="section_leader">Section leader</option><option value="instrumentalist">Instrumentalist</option><option value="librarian">Librarian</option><option value="uniform_coordinator">Uniform coordinator</option><option value="backup_coordinator">Backup coordinator</option><option value="press_team">Press team</option></select><div className="approval-actions"><button className="primary-btn" disabled={busy} onClick={()=>void reviewMember(member.user_id,'approved',member.role)}>Approve</button><button className="outline-btn" disabled={busy} onClick={()=>void reviewMember(member.user_id,'rejected',member.role)}>Reject</button>{member.approval_status==='approved'&&<button className="outline-btn" disabled={busy} onClick={()=>void reviewMember(member.user_id,'suspended',member.role)}>Suspend</button>}</div></article>)}{!memberProfiles.some(p=>p.role!=='owner')&&<div className="empty-state">No account requests yet.</div>}</div><div className="panel cms-panel"><div className="panel-head"><div><h2>Public welcome page</h2><p>Update the headline and information visitors see before signing in.</p></div></div><form className="admin-form-grid" onSubmit={saveCms}><label>Welcome headline<input value={cmsForm.headlineTitle} onChange={e=>setCmsForm({...cmsForm,headlineTitle:e.target.value})} required/></label><label>About section heading<input value={cmsForm.aboutTitle} onChange={e=>setCmsForm({...cmsForm,aboutTitle:e.target.value})} required/></label><label className="wide-field">Welcome introduction<textarea rows={4} value={cmsForm.headlineBody} onChange={e=>setCmsForm({...cmsForm,headlineBody:e.target.value})} required/></label><label className="wide-field">About the platform<textarea rows={5} value={cmsForm.aboutBody} onChange={e=>setCmsForm({...cmsForm,aboutBody:e.target.value})} required/></label><label>Monthly church theme<input value={cmsForm.themeTitle} onChange={e=>setCmsForm({...cmsForm,themeTitle:e.target.value})} placeholder="Enter the official theme for this month"/></label><label>Theme scripture / details<textarea rows={3} value={cmsForm.themeBody} onChange={e=>setCmsForm({...cmsForm,themeBody:e.target.value})} placeholder="Bible reference, theme explanation, or key message"/></label><label className="wide-field">Upload church logo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setCmsLogoFile(e.target.files?.[0]||null)}/><small>Upload a PNG, JPG, WebP or GIF image up to 5 MB. The new logo is saved to RVM Choir storage and displayed on the public and member headers.</small>{cmsLogoFile&&<small>Selected: {cmsLogoFile.name}</small>}{cmsForm.logoUrl&&<small>Current logo is configured. Choose a new image to replace it, or use the URL field below.</small>}</label><label className="wide-field">Or use an existing logo image URL<input type="url" value={cmsForm.logoUrl} onChange={e=>setCmsForm({...cmsForm,logoUrl:e.target.value})} placeholder="Optional direct image URL"/></label><button className="primary-btn" disabled={busy}><Save size={16}/> Publish site, theme & branding</button></form></div></section>
  :active==='Community & music'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">CHOIR COMMUNITY</p><h1>Members, messages & music</h1><p className="subhead">Profiles, topic-based or general chat, and instrumentalist assignments.</p></div></div>
  <div className="community-grid"><div className="panel"><div className="panel-head"><div><h2>Your member profile</h2><p>Choose a picture, voice part and instruments.</p></div></div><form className="admin-form-grid" onSubmit={saveMemberProfile}><label>Display name<input value={memberForm.display_name} onChange={e=>setMemberForm({...memberForm,display_name:e.target.value})} required maxLength={100}/></label><label>Voice part<select value={memberForm.voice_part} onChange={e=>setMemberForm({...memberForm,voice_part:e.target.value})}><option value="">Not specified</option><option>Soprano</option><option>Alto</option><option>Tenor</option><option>Bass</option><option>Instrumentalist</option><option>Other</option></select></label><label className="wide-field">Instruments<input value={memberForm.instruments} onChange={e=>setMemberForm({...memberForm,instruments:e.target.value})} placeholder="Keyboard, drums, bass guitar"/></label><label className="wide-field">About you<textarea rows={3} maxLength={500} value={memberForm.bio} onChange={e=>setMemberForm({...memberForm,bio:e.target.value})}/></label><label className="wide-field">Profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0]||null)}/><small>{avatarFile?avatarFile.name:'PNG, JPG or WebP · maximum 5 MB'}</small></label><button className="primary-btn" disabled={busy}><Save size={16}/> Save profile</button></form></div>
  <div className="panel"><div className="panel-head"><div><h2>Choir chat</h2><p>{unreadMessageCount} unread messages · Topic is optional. Choose a member for a private message.</p></div></div><form className="chat-compose" onSubmit={sendCommunityMessage}><label>Topic (optional)<select value={messageTopic} onChange={e=>setMessageTopic(e.target.value)}><option value="">General chat — no topic</option><option>Song rehearsals</option><option>Music theory</option><option>Upcoming ministration</option><option>Instrumentalists corner</option><option>Choir welfare</option><option>Suggestions and ideas</option></select></label><label>Send to<select value={messageRecipient} onChange={e=>setMessageRecipient(e.target.value)}><option value="">Everyone in the choir</option>{directoryProfiles.filter(p=>p.user_id!==user?.id).map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||p.email}</option>)}</select></label><label>Filter topic<select value={messageTopicFilter} onChange={e=>setMessageTopicFilter(e.target.value)}><option value="">All topics</option><option>Song rehearsals</option><option>Music theory</option><option>Upcoming ministration</option><option>Instrumentalists corner</option><option>Choir welfare</option><option>Suggestions and ideas</option></select></label><div className="chat-feed" aria-live="polite">{communityMessages.filter(m=>(messageRecipient?(m.sender_id===user?.id&&m.recipient_id===messageRecipient)||(m.sender_id===messageRecipient&&m.recipient_id===user?.id):m.recipient_id===null)&&(!messageTopicFilter||m.topic===messageTopicFilter)).map(m=><article className={'chat-bubble '+(m.sender_id===user?.id?'chat-mine':'')} key={m.id}><div className="chat-sender-row">{directoryProfiles.find(p=>p.user_id===m.sender_id)?.avatar_url?<img className="chat-sender-avatar" src={directoryProfiles.find(p=>p.user_id===m.sender_id).avatar_url} alt=""/>:<span className="chat-sender-avatar chat-avatar-fallback">{(directoryProfiles.find(p=>p.user_id===m.sender_id)?.display_name||'C').slice(0,1).toUpperCase()}</span>}<strong>{directoryProfiles.find(p=>p.user_id===m.sender_id)?.display_name||'Choir member'}</strong></div>{m.topic&&<span className="chat-topic">{m.topic}</span>}{m.message_type==='voice'?<div className="voice-message"><strong>Voice message · {Math.round((m.duration_ms||0)/1000)}s</strong>{voiceUrls[m.id]?<audio controls preload="none" src={voiceUrls[m.id]}/>:<small>Preparing audio…</small>}{m.transcript&&<p className="voice-transcript"><strong>Transcript:</strong> {m.transcript}</p>}</div>:<p>{m.body}</p>}<small>{new Date(m.created_at).toLocaleString()}</small></article>)}</div><label>Message<textarea rows={3} maxLength={4000} required value={messageBody} onChange={e=>setMessageBody(e.target.value)} placeholder="Write a message or use speech-to-text"/></label><div className="chat-voice-actions"><button type="button" className="outline-btn" disabled={busy} onClick={toggleDictation}><MicIcon/> {isDictating?'Stop dictation':'Transcribe speech'}</button>{!isRecordingVoice?<button type="button" className="outline-btn" disabled={busy} onClick={()=>void startVoiceRecording()}><MicIcon/> Record voice message</button>:<button type="button" className="danger-btn" onClick={stopVoiceRecording}><SquareIcon/> Stop & send recording</button>}<button className="primary-btn" disabled={busy||!messageBody.trim()}><Send size={16}/> Send text</button></div><small className="voice-help">Voice notes are transcribed automatically when your browser supports speech recognition. Use Transcribe speech to dictate a separate text message.</small></form></div></div>
  <div className="panel directory-panel"><div className="panel-head"><div><h2>Member directory</h2><p>Approved choir members and their musical roles.</p></div></div><div className="member-directory-grid">{directoryProfiles.map(p=><article className="member-card" key={p.user_id}>{p.avatar_url?<img src={p.avatar_url} alt="" className="member-avatar"/>:<span className="member-avatar member-avatar-fallback"><UserCircle size={25}/></span>}<div><strong>{p.display_name||'Choir member'}</strong><small>{p.voice_part||p.role.replace(/_/g,' ')}</small>{p.instruments?.length>0&&<small>Instruments: {p.instruments.join(', ')}</small>}{p.bio&&<p>{p.bio}</p>}</div></article>)}</div></div>
  {['owner','admin','director','music_director'].includes(profile?.role||'')&&<div className="panel role-management-panel"><div className="panel-head"><div><h2>Additional role assignments</h2><p>One chorister can hold several responsibilities.</p></div></div><form className="admin-form-grid" onSubmit={assignMemberRole}><label>Member<select required value={roleAssignmentForm.user_id} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,user_id:e.target.value})}><option value="">Choose a member</option>{directoryProfiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||'Choir member'}</option>)}</select></label><label>Additional role<select value={roleAssignmentForm.role_key} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,role_key:e.target.value})}><option value="music_director">Music Director</option><option value="choir_admin">Choir Administrator</option><option value="choir_director">Choir Director</option><option value="section_leader">Section Leader</option><option value="instrumentalist">Instrumentalist</option><option value="librarian">Librarian</option><option value="uniform_coordinator">Uniform Coordinator</option><option value="backup_coordinator">Backup Coordinator</option><option value="press_team">Press Team</option><option value="chorister">Chorister</option></select></label><label>Instrument (optional)<input value={roleAssignmentForm.instrument_name} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,instrument_name:e.target.value})} placeholder="Keyboard / piano"/></label><button className="primary-btn" disabled={busy||!roleAssignmentForm.user_id}><Plus size={16}/> Assign additional role</button></form><div className="role-assignment-list">{memberRoleAssignments.map(r=><article className="role-assignment-row" key={r.id}><div><strong>{directoryProfiles.find(p=>p.user_id===r.user_id)?.display_name||'Choir member'}</strong><small>{r.role_key.replace(/_/g,' ')}{r.instrument_name?' · '+r.instrument_name:''}</small></div></article>)}{!memberRoleAssignments.length&&<div className="empty-state">No additional roles assigned yet.</div>}</div></div>}
  {profile?.role==='owner'&&<div className="panel"><h2>Assign an additional role</h2><form className="admin-form-grid" onSubmit={assignMemberRole}><label>Member<select required value={roleAssignmentForm.user_id} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,user_id:e.target.value})}><option value="">Choose member</option>{directoryProfiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||'Choir member'}</option>)}</select></label><label>Role<select value={roleAssignmentForm.role_key} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,role_key:e.target.value})}><option value="music_director">Music Director</option><option value="section_leader">Section Leader</option><option value="instrumentalist">Instrumentalist</option><option value="librarian">Librarian</option><option value="uniform_coordinator">Uniform Coordinator</option><option value="backup_coordinator">Backup Coordinator</option><option value="press_team">Press Team</option><option value="chorister">Chorister</option></select></label><label>Instrument (optional)<input value={roleAssignmentForm.instrument_name} onChange={e=>setRoleAssignmentForm({...roleAssignmentForm,instrument_name:e.target.value})}/></label><button className="primary-btn" disabled={busy||!roleAssignmentForm.user_id}><Plus size={16}/> Assign role</button></form><div className="role-assignment-list">{memberRoleAssignments.map(r=><div className="role-assignment-row" key={r.id}><strong>{directoryProfiles.find(p=>p.user_id===r.user_id)?.display_name||'Choir member'}</strong><small>{r.role_key.replace(/_/g,' ')}{r.instrument_name?' · '+r.instrument_name:''}</small></div>)}</div></div>}
  <div className="panel"><div className="panel-head"><div><h2>Instrumentalists workspace</h2><p>Music Director is a separately assignable role. Plan keys, tempo and preparation notes.</p></div></div>{(['owner','admin','director','music_director'].includes(profile?.role||'')||memberRoleAssignments.some(r=>r.user_id===user?.id&&r.role_key==='music_director'))&&<form className="admin-form-grid" onSubmit={saveMusicAssignment}><label>Assignment title<input required value={assignmentForm.title} onChange={e=>setAssignmentForm({...assignmentForm,title:e.target.value})} placeholder="Sunday worship set"/></label><label>Event date<input type="date" value={assignmentForm.event_date} onChange={e=>setAssignmentForm({...assignmentForm,event_date:e.target.value})}/></label><label>Type<select value={assignmentForm.assignment_type} onChange={e=>setAssignmentForm({...assignmentForm,assignment_type:e.target.value})}><option value="service">Service</option><option value="rehearsal">Rehearsal</option><option value="practice">Practice</option></select></label><label>Instrument<select value={assignmentForm.instrument_name} onChange={e=>setAssignmentForm({...assignmentForm,instrument_name:e.target.value})}><option>Keyboard/Piano</option><option>Drums</option><option>Bass guitar</option><option>Lead guitar</option><option>Rhythm guitar</option><option>Organ</option><option>Percussion</option><option>Other</option></select></label><label>Assign to<select value={assignmentForm.assigned_user_id} onChange={e=>setAssignmentForm({...assignmentForm,assigned_user_id:e.target.value})}><option value="">Unassigned</option>{directoryProfiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name||p.email}</option>)}</select></label><label>Musical key<input value={assignmentForm.musical_key} onChange={e=>setAssignmentForm({...assignmentForm,musical_key:e.target.value})} placeholder="G major"/></label><label>Tempo BPM<input type="number" min="30" max="300" value={assignmentForm.tempo_bpm} onChange={e=>setAssignmentForm({...assignmentForm,tempo_bpm:e.target.value})}/></label><label>Time signature<input value={assignmentForm.time_signature} onChange={e=>setAssignmentForm({...assignmentForm,time_signature:e.target.value})}/></label><label className="wide-field">Song preparation notes<textarea rows={3} value={assignmentForm.notes} onChange={e=>setAssignmentForm({...assignmentForm,notes:e.target.value})}/></label><button className="primary-btn" disabled={busy}><Plus size={16}/> Create assignment</button></form>}<div className="assignment-list">{musicAssignments.map(a=><article className="admin-item-row" key={a.id}><span className="admin-item-icon"><Guitar size={18}/></span><div><strong>{a.title} · {a.instrument_name}</strong><p>{[a.musical_key&&'Key '+a.musical_key,a.tempo_bpm&&a.tempo_bpm+' BPM',a.time_signature,a.notes].filter(Boolean).join(' · ')||'No preparation notes yet.'}</p><small>{a.assignment_type} · {a.event_date||'Date not set'} · {directoryProfiles.find(p=>p.user_id===a.assigned_user_id)?.display_name||'Not assigned'} · {a.status}</small></div></article>)}</div></div></section>
  :active==='Overview'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">YOUR CHOIR'S MUSIC HOME</p><h1>Every song has a place.</h1><p className="subhead">A shared home for your choir’s songs, lyrics, recordings and performance memories.</p></div>{isManager&&<button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={17}/> Add a song</button>}</div>{siteContent.church_theme?.title&&siteContent.church_theme.title!=='Monthly church theme'&&<div className="monthly-theme-card dashboard-theme" aria-label="Church theme for the month"><div className="theme-symbol"><Sparkles size={22}/></div><div><span className="theme-eyebrow">THIS MONTH AT CHURCH</span><h2>{siteContent.church_theme.title}</h2><p>{siteContent.church_theme.body}</p></div></div>}<div className="stats-grid">{stats.map(s=><div className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><s.icon size={18}/></div><strong>{s.value}</strong><small>{s.label==='Recently performed'?'In the last 30 days':'Shared with choir members'}</small></div>)}</div><div className="overview-grid"><div className="panel"><div className="panel-head"><div><h2>Recently added</h2><p>Latest songs in your collection</p></div><button className="link-btn" onClick={()=>setActive('Library')}>View library</button></div>{songs.slice(0,4).map(s=><button className="recent-song" key={s.id} onClick={()=>setSelected(s.id)}><span className="song-icon"><Music2 size={17}/></span><span className="recent-info"><strong>{s.title}</strong><small>{s.category} · {s.composer||'Composer not added'}</small></span><span className="recent-date">{fmt(s.added)}</span></button>)}{!songs.length&&<div className="empty-state">Your shared library is ready. {isManager?'Add the choir’s first song.':'Ask your choir librarian to add songs.'}</div>}</div><div className="panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Keep your library up to date</p></div></div>{isManager&&<button className="quick-action" onClick={()=>setShowAdd(true)}><span className="quick-icon"><Plus size={18}/></span><span><strong>Add a song</strong><small>Save lyrics and song details</small></span><span className="quick-arrow">↗</span></button>}<button className="quick-action" onClick={()=>{setActive('History');setCategory('All Songs')}}><span className="quick-icon"><CalendarDays size={18}/></span><span><strong>Review performance history</strong><small>See when songs were last used</small></span><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={()=>tell('Open a song and use Share to send its details through your device’s share menu.')}><span className="quick-icon"><Share2 size={18}/></span><span><strong>Share a song</strong><small>Send details to WhatsApp or another app</small></span><span className="quick-arrow">↗</span></button></div></div><div className="footnote"><span className="footnote-dot"/> Shared data is stored in your choir’s Supabase workspace. Audio and document files are downloaded only when you open them.</div></section>
  :active==='History'?<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">KEEP THE MEMORY</p><h1>Performance history</h1><p className="subhead">Revisit where and when songs were performed.</p></div></div><div className="panel history-panel">{songs.filter(s=>s.lastPerformed).sort((a,b)=>b.lastPerformed.localeCompare(a.lastPerformed)).map(s=><button className="history-row" key={s.id} onClick={()=>setSelected(s.id)}><span className="history-date"><strong>{new Date(s.lastPerformed+'T12:00:00').getDate()}</strong><small>{new Date(s.lastPerformed+'T12:00:00').toLocaleDateString('en',{month:'short'}).toUpperCase()}</small></span><span className="recent-info"><strong>{s.title}</strong><small>{s.event||'Event not specified'} · {s.category}</small></span><span className="history-year">{new Date(s.lastPerformed+'T12:00:00').getFullYear()}</span></button>)}{!songs.some(s=>s.lastPerformed)&&<div className="empty-state">Performance records will appear here after a song performance is recorded.</div>}</div></section>
  :<section className="page-content"><div className="welcome-row"><div><p className="eyebrow-light">{active==='Favorites'?'YOUR PERSONAL COLLECTION':'THE CHOIR COLLECTION'}</p><h1>{active==='Favorites'?'Favourites':'Song library'}</h1><p className="subhead">{active==='Favorites'?'Songs you have saved for quick access.':'Find lyrics, recordings and song details in one simple place.'}</p></div>{isManager&&<button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={17}/> Add a song</button>}</div>
  <div className="library-toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search songs, lyrics, composer…" aria-label="Search songs"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={15}/></button>}</div><button className="filter-btn" onClick={()=>{setCategory('All Songs');setQuery('')}}><SlidersHorizontal size={17}/> Reset filters</button><div className="results-count"><strong>{filtered.length}</strong> songs</div></div>
  <div className="category-pills">{categories.map(c=><button key={c} className={'category-pill '+(category===c?'pill-active':'')} onClick={()=>setCategory(c)}>{c}</button>)}</div>
  {loadingSongs?<div className="empty-state"><RefreshCw className="spin" size={24}/><p>Loading shared songs…</p></div>:filtered.length?<div className="song-grid">{filtered.map((s,i)=><article className="song-card" key={s.id}><div className={'song-cover cover-'+(i%4)}><div className="cover-top"><span>{s.category}</span><button className={'favorite-btn '+(s.favorite?'is-favorite':'')} onClick={()=>void toggleFavorite(s)} aria-label={s.favorite?'Remove from favourites':'Add to favourites'}>★</button></div><div className="cover-symbol"><Music2 size={34}/></div><div className="cover-index">RVM · {String(i+1).padStart(2,'0')}</div></div><div className="song-card-body"><button className="song-title-button" onClick={()=>setSelected(s.id)}><h3>{s.title}</h3></button><p className="song-composer">{s.composer||s.arranger||'Composer not added'}</p><div className="song-meta"><span><FileText size={14}/>{s.lyrics?'Lyrics saved':'No lyrics yet'}</span><span><Clock3 size={14}/>{s.lastPerformed?fmt(s.lastPerformed):'Not performed yet'}</span></div><div className="song-card-actions"><button className="outline-btn" onClick={()=>setSelected(s.id)}>View song</button><button className="share-btn" onClick={()=>void share(s)} aria-label={'Share '+s.title}><Share2 size={16}/></button></div></div></article>)}</div>:<div className="empty-state"><div className="empty-icon"><Search size={23}/></div><h3>{active==='Favorites'?'No favourites yet':'No songs found'}</h3><p>{isManager?'Try another search or add a song to your library.':'Try another search or ask your choir librarian to add songs.'}</p>{isManager&&<button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={17}/> Add a song</button>}</div>}
  <div className="footnote"><span className="footnote-dot"/>{choir.name} · Your songs are shared with authorised choir members.</div></section>}
  <footer className="app-footer"><span>RVM Choir <span className="footer-sep">·</span> A RealTreats Technologies concept</span><span>Made for music, memory & ministry.</span></footer></main>
  {chosen&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="song-detail modal-card" onClick={e=>e.stopPropagation()}><div className="detail-cover"><button className="icon-btn detail-close" onClick={()=>setSelected(null)} aria-label="Close"><X size={20}/></button><div className="detail-music"><Music2 size={42}/></div><span>{chosen.category}</span></div><div className="detail-content"><div className="detail-title-row"><div><p className="eyebrow-light">RVM CHOIR SONG</p><h2>{chosen.title}</h2><p>{[chosen.composer,chosen.arranger&&'Arranged by '+chosen.arranger].filter(Boolean).join(' · ')||'Composer / arranger not specified'}</p></div><button className={'favorite-btn detail-fav '+(chosen.favorite?'is-favorite':'')} onClick={()=>void toggleFavorite(chosen)}>★</button></div><div className="detail-stats"><span><CalendarDays size={15}/> Added {fmt(chosen.added)}</span><span><Clock3 size={15}/> Last performed {fmt(chosen.lastPerformed)}</span></div><h3>Lyrics & notes</h3><div className="lyrics-box">{chosen.lyrics||'No lyrics have been added to this song yet.'}</div><div className="detail-info-grid"><div><small>LANGUAGE</small><strong>{chosen.language||'Not specified'}</strong></div><div><small>LAST EVENT</small><strong>{chosen.event||'Not recorded'}</strong></div></div><div className="attachment-list"><h3>Audio & documents</h3>{files.length?files.map(file=><div className="attachment-row" key={file.id}><span className="quick-icon">{file.mime_type.startsWith('audio/')?<FileAudio size={18}/>:<FileText size={18}/>}</span><span><strong>{file.original_filename}</strong><small>{(file.file_size_bytes/1024/1024).toFixed(1)} MB · {file.kind}</small></span><button className="share-btn" onClick={()=>void openFile(file)} aria-label={'Open '+file.original_filename}><Download size={16}/></button>{file.mime_type.startsWith('audio/')&&(signedUrls[file.id]?<audio className="song-audio-player" controls preload="none" src={signedUrls[file.id]} aria-label={'Play '+file.original_filename}/>:<button className="play-btn" onClick={()=>void getFileUrl(file).catch(e=>tell(prettyError(e)))} aria-label="Load audio player"><Play size={16}/></button>)}</div>):<p className="attachment-empty">No files attached to this song yet.</p>}</div><div className="detail-actions"><button className="primary-btn" onClick={()=>void share(chosen)}><Share2 size={16}/> Share song details</button>{isManager&&<button className="outline-btn" onClick={()=>setShowPerformance(true)}><CalendarDays size={16}/> Record performance</button>}</div></div></section></div>}
  {showAdd&&<div className="modal-backdrop" onClick={()=>{setShowAdd(false);setUploadFile(null)}}><section className="modal-card add-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow-light">GROW YOUR COLLECTION</p><h2>Add a song</h2><p>Save lyrics and optional rehearsal audio or score.</p></div><button className="icon-btn" onClick={()=>{setShowAdd(false);setUploadFile(null)}} aria-label="Close"><X size={20}/></button></div><form onSubmit={addSong}><label>Song title <input autoFocus required maxLength={240} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Great Is Thy Faithfulness"/></label><div className="form-row"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Language<input maxLength={80} value={form.language} onChange={e=>setForm({...form,language:e.target.value})} placeholder="English"/></label></div><div className="form-row"><label>Composer<input maxLength={180} value={form.composer} onChange={e=>setForm({...form,composer:e.target.value})} placeholder="Composer"/></label><label>Arranger<input maxLength={180} value={form.arranger} onChange={e=>setForm({...form,arranger:e.target.value})} placeholder="Arranger"/></label></div><label>Lyrics / notes<textarea rows={5} maxLength={30000} value={form.lyrics} onChange={e=>setForm({...form,lyrics:e.target.value})} placeholder="Add lyrics, verses or rehearsal notes…"/></label><div className="form-row"><label>Last performed<input type="date" value={form.lastPerformed} onChange={e=>setForm({...form,lastPerformed:e.target.value})}/></label><label>Service / event<input maxLength={180} value={form.event} onChange={e=>setForm({...form,event:e.target.value})} placeholder="Sunday service"/></label></div><label className="file-picker">Audio or score (optional)<input type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/x-wav,.mp3,.m4a,.aac,.ogg,.wav,.pdf,.doc,.docx,.txt" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/><small>{uploadFile?uploadFile.name:'Private storage · 50 MB maximum · uploaded on save'}</small></label><div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>{setShowAdd(false);setUploadFile(null)}}>Cancel</button><button className="primary-btn" type="submit" disabled={busy}><Check size={17}/>{busy?'Saving…':'Save song'}</button></div></form></section></div>}
  {showPerformance&&chosen&&<div className="modal-backdrop" onClick={()=>setShowPerformance(false)}><section className="modal-card add-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow-light">CHOIR TIMELINE</p><h2>Record performance</h2><p>{chosen.title}</p></div><button className="icon-btn" onClick={()=>setShowPerformance(false)} aria-label="Close"><X size={20}/></button></div><form onSubmit={recordPerformance}><label>Service, event or occasion<input autoFocus maxLength={180} value={performanceEvent} onChange={e=>setPerformanceEvent(e.target.value)} placeholder="Sunday service, wedding, concert…"/></label><div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>setShowPerformance(false)}>Cancel</button><button className="primary-btn" disabled={busy}><Check size={17}/>{busy?'Saving…':'Record performance'}</button></div></form></section></div>}
  {notice&&<div className="toast"><Check size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
 </div>
}
