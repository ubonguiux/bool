import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { ArrowRight, ArrowUpRight, BadgeCheck, BatteryCharging, Check, ChevronDown, CircleHelp, ClipboardCheck, Cpu, ImagePlus, Copy, Trash2, Menu, Search, ShieldCheck, Smartphone, Sparkles, Store, Wrench, X, Phone, MapPin } from 'lucide-react';
import ContentStudio from './ContentStudio';
import PublicShowcase from './PublicShowcase';
import CustomerHub from './CustomerHub';
import AdminOperations from './AdminOperations';
import MarkdownRenderer from './MarkdownRenderer';

const services = [
  { title: 'Check a phone', detail: 'Use a guided checklist and understand what Bool has and has not verified.', icon: ShieldCheck, tag: 'DEVICE TRUST' },
  { title: 'Find a technician', detail: 'Request service from a provider approved by RealTreats Technologies.', icon: Wrench, tag: 'REPAIR & SERVICE' },
  { title: 'Find a business', detail: 'Discover reviewed technology businesses, dealers and repair shops.', icon: Store, tag: 'VERIFIED NETWORK' },
  { title: 'Explore devices', detail: 'Compare device images, prices, condition, specifications and features.', icon: Smartphone, tag: 'DEVICES & PRICES' },
  { title: 'Contact RealTreats', detail: 'Ask a question, follow up on a request, or raise a complaint.', icon: CircleHelp, tag: 'CUSTOMER SUPPORT' },
];

function Brand({ light = false }: { light?: boolean }) {
  return <a className={`brand ${light ? 'brand-light' : ''}`} href="#" aria-label="Bool home">
    <svg viewBox="0 0 44 44" className="brand-mark" role="img" aria-label="Bool abstract logo">
      <defs><linearGradient id="boolGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D6FF79"/><stop offset="1" stopColor="#86D94B"/></linearGradient></defs>
      <path d="M22 3.5 39.5 13.7v16.6L22 40.5 4.5 30.3V13.7L22 3.5Z" fill="url(#boolGradient)"/>
      <path d="M17 12.5h6.8a7.2 7.2 0 0 1 5.4 12 7.1 7.1 0 0 1-5.4 12H17V12.5Z" fill="#10131C"/>
      <path d="M17 19h6.1a3.4 3.4 0 1 1 0 6.8H17V19Zm0 11h6.5a3.4 3.4 0 1 1 0 6.8H17V30Z" fill="#D6FF79"/>
      <circle cx="13" cy="22" r="2.4" fill="#10131C"/><circle cx="13" cy="33" r="2.4" fill="#10131C"/>
    </svg><span>bool<span className="brand-dot">.</span></span>
  </a>;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('All services');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [customerHubTab, setCustomerHubTab] = useState<'providers' | 'requests' | 'support' | 'payments' | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [imei, setImei] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [checkedTests, setCheckedTests] = useState<string[]>([]);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; role: string } | null>(null);
  const [savedChecks, setSavedChecks] = useState<Array<{ id: string; device_model: string; imei_last4: string | null; created_at: string; observed_tests: string[] }>>([]);
  const [savingReport, setSavingReport] = useState(false);
  const [servicePanel, setServicePanel] = useState<'repair' | 'marketplace' | null>(null);
  const [repairModel, setRepairModel] = useState('');
  const [repairIssue, setRepairIssue] = useState('');
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairJobs, setRepairJobs] = useState<Array<{ id: string; device_model: string; issue_description: string; status: string; created_at: string }>>([]);
  const [marketListings, setMarketListings] = useState<Array<{ id: string; title: string; category: string; description: string; price_ngn: number; condition: string; created_at: string }>>([]);
  const [listingTitle, setListingTitle] = useState('');
  const [listingCategory, setListingCategory] = useState('phone');
  const [listingDescription, setListingDescription] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [listingCondition, setListingCondition] = useState('used');

  const [listingBusy, setListingBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'devices' | 'repairs' | 'listings' | 'operations' | 'cms' | 'catalog' | 'media' | 'announcements' | 'settings' | 'audit'>('overview');
  const [mediaFiles, setMediaFiles] = useState<Array<{name:string;id:string|null;updated_at:string|null;metadata?:{mimetype?:string;size?:number}|null}>>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  type CmsPage = { id: string; title: string; slug: string; excerpt: string; body_markdown: string; category: string; status: string; featured: boolean; seo_title: string; seo_description: string; updated_at: string };
  const emptyCmsPage = { title: '', slug: '', excerpt: '', body_markdown: '', category: 'General', status: 'draft', featured: false, seo_title: '', seo_description: '' };
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  const [cmsEditingId, setCmsEditingId] = useState<string | null>(null);
  const [cmsDraft, setCmsDraft] = useState(emptyCmsPage);
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsAnnouncements, setCmsAnnouncements] = useState<Array<{id:string;title:string;message:string;audience:string;status:string;created_at:string}>>([]);
  const [cmsSettings, setCmsSettings] = useState<Array<{key:string;value:any;description:string;updated_at:string}>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{id:number;action:string;resource_type:string;resource_id:string|null;created_at:string;actor_id:string|null}>>([]);
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [settingDescription, setSettingDescription] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState('all');
  const [announcementStatus, setAnnouncementStatus] = useState('draft');
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [publicPageRoute, setPublicPageRoute] = useState(false);
  const [publicPage, setPublicPage] = useState<{title:string;slug:string;excerpt:string;body_markdown:string;category:string;seo_title:string;seo_description:string;published_at:string|null}|null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<{id:string;title:string;message:string}|null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState<Array<{ id: string; display_name: string; role: string; created_at: string }>>([]);
  const [adminChecks, setAdminChecks] = useState<Array<{ id: string; user_id: string; device_model: string; imei_last4: string | null; official_check_status: string; created_at: string }>>([]);
  const [adminRepairs, setAdminRepairs] = useState<Array<{ id: string; device_model: string; issue_description: string; status: string; quote_ngn: number | null; created_at: string }>>([]);
  const [adminListings, setAdminListings] = useState<Array<{ id: string; title: string; category: string; price_ngn: number; status: string; created_at: string }>>([]);



  useEffect(() => { const id = window.setInterval(() => setHeroSlide(current => (current + 1) % 3), 5200); return () => window.clearInterval(id); }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    supabase.from('cms_announcements').select('id,title,message').eq('status','published').eq('audience','all').order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data}) => setLiveAnnouncement(data ?? null));
  }, []);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/pages\/([^/]+)\/?$/);
    if (!match) return;
    setPublicPageRoute(true);
    const slug = decodeURIComponent(match[1]);
    supabase.from('cms_pages').select('title,slug,excerpt,body_markdown,category,seo_title,seo_description,published_at').eq('slug', slug).eq('status', 'published').maybeSingle().then(({data}) => setPublicPage(data ?? null));
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setSavedChecks([]); return; }
    let cancelled = false;
    const loadAccount = async () => {
      const user = session.user;
      const { data: existingProfile } = await supabase.from('profiles').select('display_name, role').eq('id', user.id).maybeSingle();
      let currentProfile = existingProfile;
      if (!currentProfile) {
        const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bool user';
        const { data: createdProfile, error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' }).select('display_name, role').single();
        if (error) { if (!cancelled) setNotice('Your account is signed in, but your profile could not be prepared. Please try again.'); }
        else currentProfile = createdProfile;
      }
      const { data: checks } = await supabase.from('device_checks').select('id, device_model, imei_last4, created_at, observed_tests').order('created_at', { ascending: false }).limit(10);
      if (!cancelled) { setProfile(currentProfile); setSavedChecks(checks ?? []); }
    };
    void loadAccount();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode); setAuthMessage(''); setAuthPassword(''); setAuthOpen(true);
  };

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setAuthBusy(true); setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { display_name: authName.trim() }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setAuthMessage('Your account request is ready. Check your email for a confirmation link, then return here to sign in.');
        else { setAuthMessage('Your Bool account has been created.'); setAuthOpen(false); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setAuthOpen(false); setNotice('You are signed in to Bool.');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'We could not complete that request. Please try again.');
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setNotice('Could not sign out. Please try again.');
    else setNotice('You have signed out.');
  };

  const saveDeviceReport = async () => {
    if (!session?.user) { setAuthMode('signin'); setAuthMessage('Sign in or create a Bool account to save your device-check report.'); setAuthOpen(true); return; }
    if (!deviceModel.trim()) { setVerificationMessage('Enter the device make and model before saving this report.'); return; }
    setSavingReport(true);
    const digits = imei.replace(/\D/g, '');
    const { error } = await supabase.from('device_checks').insert({
      user_id: session.user.id, device_model: deviceModel.trim(),
      imei_last4: digits.length >= 4 ? digits.slice(-4) : null,
      imei_checksum_valid: validImei(imei), observed_tests: checkedTests,
    });
    setSavingReport(false);
    if (error) { setNotice('We could not save this report. Please check your connection and try again.'); return; }
    const { data: checks } = await supabase.from('device_checks').select('id, device_model, imei_last4, created_at, observed_tests').order('created_at', { ascending: false }).limit(10);
    setSavedChecks(checks ?? []);
    setNotice('Device-check report saved to your private Bool account. The full IMEI was not stored.');
  };


  const submitRepairRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user) return;
    setRepairBusy(true);
    const { data, error } = await supabase.from('repair_jobs').insert({
      customer_id: session.user.id,
      device_model: repairModel.trim(),
      issue_description: repairIssue.trim(),
    }).select('id, device_model, issue_description, status, created_at').single();
    setRepairBusy(false);
    if (error) { setNotice('We could not submit your repair request. Please try again.'); return; }
    setRepairJobs(current => [data, ...current]);
    setRepairModel('');
    setRepairIssue('');
    setNotice('Your repair request has been saved. Technician matching is not yet automated.');
  };

  const openMarketplace = async () => {
    setServicePanel('marketplace');
    const { data } = await supabase.from('listings').select('id, title, category, description, price_ngn, condition, created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(30);
    setMarketListings(data ?? []);
  };

  const submitListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user) {
      setServicePanel(null);
      setAuthMode('signin');
      setAuthMessage('Sign in or create a Bool account to publish a marketplace listing.');
      setAuthOpen(true);
      return;
    }
    const price = Number(listingPrice);
    if (!Number.isFinite(price) || price < 0) { setNotice('Enter a valid price in Nigerian naira.'); return; }
    setListingBusy(true);
    const { data, error } = await supabase.from('listings').insert({
      seller_id: session.user.id, title: listingTitle.trim(), category: listingCategory,
      description: listingDescription.trim(), price_ngn: price, condition: listingCondition, status: 'published',
    }).select('id, title, category, description, price_ngn, condition, created_at').single();
    setListingBusy(false);
    if (error) { setNotice('We could not publish this listing. Please check the details and try again.'); return; }
    setMarketListings(current => [data, ...current]);
    setListingTitle('');
    setListingDescription('');
    setListingPrice('');
    setNotice('Your listing is live. Meet buyers safely and verify payment before handing over a device.');
  };


  const refreshMedia = async () => {
    if (profile?.role !== 'admin') return;
    setMediaBusy(true);
    const { data, error } = await supabase.storage.from('bool-media').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) setNotice('Media library could not load. Check that the Bool media bucket migration has been applied.');
    else setMediaFiles((data ?? []).filter(item => item.name !== '.emptyFolderPlaceholder') as typeof mediaFiles);
    setMediaBusy(false);
  };

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || profile?.role !== 'admin') return;
    setMediaBusy(true);
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setNotice('Only image files up to 10 MB each are allowed.'); continue; }
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
      const { error } = await supabase.storage.from('bool-media').upload(path, file, { contentType: file.type, upsert: false });
      if (error) setNotice('Could not upload ' + file.name + '. Confirm the media bucket and admin storage policies are active.');
    }
    event.target.value = '';
    await refreshMedia();
    setMediaBusy(false);
  };

  const deleteMedia = async (name: string) => {
    if (profile?.role !== 'admin' || !window.confirm('Delete “' + name + '” from the media library? Any page using this file may stop displaying it.')) return;
    const { error } = await supabase.storage.from('bool-media').remove([name]);
    if (error) { setNotice('Media file could not be deleted.'); return; }
    setNotice('Media file deleted.');
    await refreshMedia();
  };

  const refreshAdminData = async () => {
    if (profile?.role !== 'admin') { setNotice('Admin access is restricted to authorised Bool administrators.'); return; }
    setAdminBusy(true);
    const [profilesResult, checksResult, repairsResult, listingsResult, pagesResult, announcementsResult, settingsResult, auditResult] = await Promise.all([
      supabase.from('profiles').select('id, display_name, role, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('device_checks').select('id, user_id, device_model, imei_last4, official_check_status, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('repair_jobs').select('id, device_model, issue_description, status, quote_ngn, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('listings').select('id, title, category, price_ngn, status, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('cms_pages').select('id,title,slug,excerpt,body_markdown,category,status,featured,seo_title,seo_description,updated_at').order('updated_at', { ascending: false }).limit(200),
      supabase.from('cms_announcements').select('id,title,message,audience,status,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('cms_settings').select('key,value,description,updated_at').order('key').limit(200),
      supabase.from('admin_audit_logs').select('id,action,resource_type,resource_id,created_at,actor_id').order('created_at', { ascending: false }).limit(100),
    ]);
    const errors = [profilesResult.error, checksResult.error, repairsResult.error, listingsResult.error, pagesResult.error, announcementsResult.error, settingsResult.error, auditResult.error].filter(Boolean);
    if (errors.length) setNotice('Some admin records could not load. Check your admin permissions and refresh.');
    setAdminProfiles(profilesResult.data ?? []);
    setAdminChecks(checksResult.data ?? []);
    setAdminRepairs(repairsResult.data ?? []);
    setAdminListings(listingsResult.data ?? []);
    setCmsPages(pagesResult.data ?? []);
    setCmsAnnouncements(announcementsResult.data ?? []);
    setCmsSettings(settingsResult.data ?? []);
    setAuditLogs(auditResult.data ?? []);
    setAdminBusy(false);
  };

  const editCmsPage = (page?: CmsPage) => {
    if (!page) { setCmsEditingId(null); setCmsDraft(emptyCmsPage); return; }
    setCmsEditingId(page.id);
    setCmsDraft({ title: page.title, slug: page.slug, excerpt: page.excerpt || '', body_markdown: page.body_markdown || '', category: page.category || 'General', status: page.status, featured: page.featured, seo_title: page.seo_title || '', seo_description: page.seo_description || '' });
  };

  const saveCmsPage = async () => {
    if (profile?.role !== 'admin' || !session?.user) { setNotice('Admin access required.'); return; }
    const title = cmsDraft.title.trim();
    const slug = (cmsDraft.slug.trim() || title.toLowerCase()).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!title || !slug) { setNotice('Add a title before saving the page.'); return; }
    setCmsSaving(true);
    const payload = { ...cmsDraft, title, slug, updated_by: session.user.id, ...(cmsDraft.status === 'published' ? { published_at: new Date().toISOString() } : {}) };
    const result = cmsEditingId
      ? await supabase.from('cms_pages').update(payload).eq('id', cmsEditingId).select('id').maybeSingle()
      : await supabase.from('cms_pages').insert({ ...payload, created_by: session.user.id }).select('id').maybeSingle();
    setCmsSaving(false);
    if (result.error) { setNotice(result.error.code === '23505' ? 'That page slug is already in use. Choose another.' : 'The CMS page could not be saved. Please retry.'); return; }
    setNotice('CMS page saved.');
    editCmsPage();
    await refreshAdminData();
  };

  const deleteCmsPage = async (id: string) => {
    if (profile?.role !== 'admin' || !window.confirm('Delete this CMS page permanently? This cannot be undone.')) return;
    const { error } = await supabase.from('cms_pages').delete().eq('id', id);
    if (error) { setNotice('Page could not be deleted.'); return; }
    if (cmsEditingId === id) editCmsPage();
    setNotice('CMS page deleted.');
    await refreshAdminData();
  };

  const saveCmsSetting = async () => {
    if (profile?.role !== 'admin' || !session?.user || !settingKey.trim()) return;
    let parsedValue: unknown;
    try { parsedValue = JSON.parse(settingValue); } catch { parsedValue = settingValue; }
    const { error } = await supabase.from('cms_settings').upsert({ key: settingKey.trim(), value: parsedValue, description: settingDescription.trim(), updated_by: session.user.id, updated_at: new Date().toISOString() });
    if (error) { setNotice('Setting could not be saved.'); return; }
    setSettingKey(''); setSettingValue(''); setSettingDescription('');
    setNotice('Platform setting saved.');
    await refreshAdminData();
  };

  const createAnnouncement = async () => {
    if (profile?.role !== 'admin' || !session?.user || !announcementTitle.trim() || !announcementMessage.trim()) { setNotice('Add an announcement title and message.'); return; }
    setAnnouncementBusy(true);
    const { error } = await supabase.from('cms_announcements').insert({ title: announcementTitle.trim(), message: announcementMessage.trim(), audience: announcementAudience, status: announcementStatus, created_by: session.user.id });
    setAnnouncementBusy(false);
    if (error) { setNotice('Announcement could not be created.'); return; }
    setAnnouncementTitle(''); setAnnouncementMessage(''); setAnnouncementAudience('all'); setAnnouncementStatus('draft');
    setNotice('Announcement created.');
    await refreshAdminData();
  };

  const updateAnnouncementStatus = async (id: string, status: string) => {
    if (profile?.role !== 'admin') return;
    const { error } = await supabase.from('cms_announcements').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { setNotice('Announcement status could not be updated.'); return; }
    await refreshAdminData();
  };

  const openAdminConsole = async () => {
    if (profile?.role !== 'admin') { setNotice('Admin access is restricted to authorised Bool administrators.'); return; }
    setAdminOpen(true);
    setAdminTab('overview');
    await refreshAdminData();
    await refreshMedia();
  };

  const updateAdminRecord = async (table: 'device_checks' | 'repair_jobs' | 'listings', id: string, field: string, value: string) => {
    if (profile?.role !== 'admin') { setNotice('You do not have permission to make that change.'); return; }
    const { error } = await supabase.from(table as any).update({ [field]: value } as any).eq('id', id);
    if (error) { setNotice('The change could not be saved. Confirm the admin role and database permissions.'); return; }
    setNotice('Admin change saved.');
    await refreshAdminData();
  };

  const filtered = services.filter(s => (active === 'All services' || s.tag.toLowerCase().includes(active.toLowerCase().split(' ')[0])) && (s.title + s.detail + s.tag).toLowerCase().includes(query.toLowerCase()));
  const choose = (title: string) => {
    if (title === 'Check a phone') { setVerificationOpen(true); setNotice(''); return; }
    if (title === 'Sign in') { openAuth('signin'); return; }
    if (title === 'Create account') { openAuth('signup'); return; }
    if (title === 'Find a technician' || title === 'Find a business' || title === 'Technician Workbench') { setCustomerHubTab('providers'); setNotice(''); return; }
    if (title === 'Explore devices') { const target=document.getElementById('devices'); if(target) target.scrollIntoView({behavior:'smooth'}); else setNotice('Device listings will appear here when published by RealTreats Technologies.'); return; }
    if (title === 'Explore the market') { void openMarketplace(); return; }
    if (title === 'Contact RealTreats') { setCustomerHubTab('support'); setNotice(''); return; }
    if (title === 'Payments & disputes') { setCustomerHubTab('payments'); setNotice(''); return; }
    setNotice(title + ' is not available yet. Please contact RealTreats Technologies for help.');
  };
  const validImei = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 15) return false;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let n = Number(digits[i]);
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  };
  const deviceTests = ['Screen and touch response', 'Cameras and flash', 'Speaker and microphone', 'Buttons and vibration', 'Charging port and cable', 'Wi-Fi, Bluetooth and cellular signal', 'Face ID / fingerprint sensor (where available)'];
  if (publicPageRoute) return <div className="public-cms-page"><header><Brand/><a href="/" className="btn btn-dark btn-small">Back to Bool</a></header>{publicPage ? <article><div className="eyebrow dark-eyebrow">{publicPage.category || 'BOOL GUIDE'}</div><h1>{publicPage.title}</h1>{publicPage.excerpt && <p className="public-cms-excerpt">{publicPage.excerpt}</p>}<div className="public-cms-body"><MarkdownRenderer content={publicPage.body_markdown}/></div><small>Published {publicPage.published_at ? new Date(publicPage.published_at).toLocaleDateString() : ''}</small></article> : <article><h1>Page not found</h1><p>This page may be unpublished or the link may have changed.</p><a href="/">Return to Bool</a></article>}</div>;
  return <div className="app-shell">{liveAnnouncement && !announcementDismissed && <div className="live-announcement"><div><strong>{liveAnnouncement.title}</strong><span>{liveAnnouncement.message}</span></div><button onClick={() => setAnnouncementDismissed(true)} aria-label="Dismiss announcement"><X size={15}/></button></div>}
    <header className="topbar"><Brand/><nav className={menuOpen ? 'nav nav-open' : 'nav'}><a href="#services" onClick={() => setMenuOpen(false)}>Explore</a><button type="button" className="nav-link-button" onClick={() => { setCustomerHubTab('providers'); setMenuOpen(false); }}>Verified providers <BadgeCheck size={14}/></button><button type="button" className="nav-link-button" onClick={() => { if(!session){openAuth('signin');return;} setCustomerHubTab('requests'); setMenuOpen(false); }}>My requests <ClipboardCheck size={14}/></button><a href="#how" onClick={() => setMenuOpen(false)}>How Bool works</a><a href="#trust" onClick={() => setMenuOpen(false)}>Trust & safety</a><a href="#payments" onClick={() => setMenuOpen(false)}>Payments</a></nav><div className="top-actions">{session ? <>{profile?.role === 'admin' && <button className="btn btn-lime btn-small" onClick={() => void openAdminConsole()}><ShieldCheck size={14}/> Admin console</button>}<button className="text-button" onClick={() => setCustomerHubTab('requests')}>{profile?.display_name || session.user.email || 'My Bool'}</button><button className="btn btn-dark btn-small" onClick={signOut}>Sign out</button></> : <><button className="text-button" onClick={() => choose('Sign in')}>Sign in</button><button className="btn btn-dark btn-small" onClick={() => choose('Create account')}>Get started <ArrowUpRight size={15}/></button></>}</div><button className="mobile-menu" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></header>
    <main>
      <section className="hero"><div className="hero-glow glow-one"/><div className="hero-announcement-slider" aria-label="What you can do with Bool"><div className="hero-slide-copy"><span className="hero-slide-count">0{heroSlide+1} / 03</span><strong>{['Repair your device with a clear journey','Upload evidence and keep every update','Explore trusted technicians and device dealers'][heroSlide]}</strong><p>{['Describe the fault, get a response and follow your request through delivery.','Add photos or screenshots, see Bool team responses and know what to do next.','Find phone and laptop technicians, plus dealers for buying, selling and swapping.'][heroSlide]}</p><button aria-label="Next information banner" onClick={() => setHeroSlide(current => (current+1)%3)}><ArrowRight size={16}/></button></div><div className="hero-slide-dots">{[0,1,2].map(i=><button key={i} aria-label={'Show banner '+(i+1)} className={heroSlide===i?'active':''} onClick={()=>setHeroSlide(i)}/>)}</div></div><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> BUILT FOR THE MOBILE WORLD <span className="eyebrow-line"/></div><h1>Find trusted tech services.<br/><span>We help make it right.</span></h1><p className="hero-lede">Find technicians and technology businesses reviewed by RealTreats Technologies. Request a service, pay through Bool’s managed process, and contact our team if something goes wrong.</p><div className="hero-ctas"><a className="btn btn-lime" href="#services">Explore Bool <ArrowRight size={17}/></a><a className="secondary-link" href="#how">See how it works ↗</a></div><div className="proof-row"><div className="proof-avatars"><span>U</span><span>T</span><span>D</span><b>+</b></div><div><strong>Made for real-world mobile needs</strong><small>For dealers, technicians and everyday users.</small></div></div></div>
      <div className="hero-visual"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="phone-back"><i/><i/><i className="small-cam"/></div><div className="scan-ring"><div className="scan-core"><ShieldCheck size={43}/></div></div><div className="float-card verified-card"><div className="card-icon"><BadgeCheck size={20}/></div><div><strong>Device report</strong><span>Clear checks. Clear limits.</span></div><span className="mini-check"><Check size={13}/></span></div><div className="float-card ai-card"><div className="ai-spark"><Sparkles size={17}/></div><div><strong>Bool intelligence</strong><span>Helpful, not guesswork.</span></div></div><div className="visual-caption"><span className="caption-dot"/> TRUST STARTS WITH WHAT YOU CAN VERIFY</div></div>
      <div className="hero-bottom"><span>01 / A BETTER WAY TO MOBILE</span><span>BUILT FOR PEOPLE WHO KEEP THE WORLD CONNECTED <ArrowUpRight size={13}/></span></div></section>
      <section className="services-section" id="services"><div className="section-head"><div><div className="eyebrow dark-eyebrow">ONE PLATFORM. MORE POSSIBILITIES.</div><h2>What do you need<br className="desktop-break"/> to get done?</h2></div><p>Whether you need a repair, a reliable business, or a new device, Bool puts customer support and clear information first.</p></div>
      <div className="service-tools"><div className="service-tabs">{['All services','Repair & service','Verified network','Devices & prices'].map(tab => <button key={tab} className={active === tab ? 'tab active' : 'tab'} onClick={() => setActive(tab)}>{tab}</button>)}</div><label className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Bool services" aria-label="Search Bool services"/><kbd>⌘ K</kbd></label></div>
      <div className="service-grid">{filtered.map((service) => { const Icon = service.icon; return <button className="service-card" key={service.title} onClick={() => choose(service.title)}><div className="service-card-top"><span className="service-icon"><Icon size={21}/></span><ArrowUpRight className="card-arrow" size={19}/></div><span className="service-tag">{service.tag}</span><h3>{service.title}</h3><p>{service.detail}</p><span className="card-bottom">Explore service <ArrowRight size={15}/></span>{service.title === 'Ask Bool AI' && <span className="coming-pill">IN DEVELOPMENT</span>}</button> })}</div></section>
      <section className="workbench" id="how"><div className="workbench-art"><div className="workbench-grid"/><div className="device-outline"><Smartphone size={94}/><div className="device-check"><Check size={19}/></div></div><div className="data-chip chip-top"><Cpu size={16}/> Diagnostics</div><div className="data-chip chip-bottom"><BatteryCharging size={16}/> Device health</div></div><div className="workbench-copy"><div className="eyebrow">FOR THE PEOPLE BEHIND THE REPAIR</div><h2>A better workbench.<br/><span>A better outcome.</span></h2><p>Technicians deserve more than scattered chats and handwritten notes. Bool is designed to bring repair jobs, customer approvals, diagnostics, parts and updates into one organised workflow.</p><ul><li><Check size={16}/> Job cards and repair status</li><li><Check size={16}/> Quotes, approvals and customer updates</li><li><Check size={16}/> Device history and parts tracking</li></ul><button className="btn btn-lime" onClick={() => choose('Technician Workbench')}>Explore technician tools <ArrowRight size={16}/></button></div></section>
      <section className="trust-section" id="trust"><div className="trust-icon"><ClipboardCheck size={27}/></div><div><div className="eyebrow dark-eyebrow">CUSTOMER PROTECTION</div><h2>We stay involved when it matters.</h2><p>RealTreats Technologies operates Bool, reviews providers before approval, and gives customers a clear route to ask questions, report problems and request a fair review. Verification badges will reflect checks actually completed.</p></div><div className="trust-points"><span><Check size={15}/> Provider review before public listing</span><span><Check size={15}/> A clear customer complaint channel</span><span><Check size={15}/> Payment confirmation by RealTreats</span></div></section>
      <section className="payment-info-section" id="payments"><div className="payment-info-copy"><div className="eyebrow dark-eyebrow">PAYMENTS WITH A CLEAR RECORD</div><h2>Pay RealTreats Technologies.<br/>Keep your request reference.</h2><p>For manual bank transfers, use the account below only after Bool or our team confirms your service request and amount. RealTreats Technologies must verify receipt before a payment is marked confirmed. Never rely on a provider’s screenshot as payment confirmation.</p><div className="payment-note"><ShieldCheck size={18}/><span>Pay only for a confirmed Bool request. Keep your transfer receipt and request reference for support.</span></div></div><div className="payment-account-card"><span className="payment-account-label">BANK TRANSFER DETAILS</span><small>Bank</small><strong>Moniepoint MFB</strong><small>Account name</small><strong>RealTreats Technologies</strong><small>Account number</small><div className="account-number-row"><strong>6263388058</strong><button className="btn btn-lime btn-small" onClick={() => { void navigator.clipboard?.writeText('6263388058').then(() => setNotice('Account number copied.')).catch(() => setNotice('Account number: 6263388058')); }}>Copy number</button></div><div className="payment-status-note">Paystack integration: coming later. Online card payments are not enabled yet.</div></div></section><PublicShowcase/><section className="closing-cta" id="support"><div><div className="eyebrow">REAL PEOPLE. REAL SUPPORT.</div><h2>Need help with a service<br/>or have a concern?</h2><p>Contact RealTreats Technologies and tell us your Bool request reference. We will help you understand the next step.</p><p className="closing-contact-line"><Phone size={15}/> 08069929435 <span>·</span> <MapPin size={15}/> 6 Oron Road Uyo Plaza, Akwa Ibom State</p></div><button onClick={() => setCustomerHubTab('support')} className="btn btn-lime">Contact customer support <ArrowRight size={16}/></button><div className="closing-orb"/></section>
    </main>
    <footer><div className="footer-main"><Brand light/><p>Clarity for every device.<br/>Tools for everyone who keeps them working.</p><div className="footer-links"><a href="#services">Explore services</a><a href="#trust">Customer protection</a><a href="#payments">Payment details</a><a href="/pages/terms-and-conditions">Terms & Conditions</a><a href="/pages/privacy-policy">Privacy Policy</a><a href="https://github.com/ubonguiux/bool" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Bool. Owned and operated by RealTreats Technologies.</span><span><Phone size={13}/> <a href="tel:08069929435">08069929435</a> · 6 Oron Road Uyo Plaza, Akwa Ibom State</span></div></footer>
    {servicePanel && <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setServicePanel(null); }}><section className="verification-modal service-modal" role="dialog" aria-modal="true" aria-labelledby="service-panel-title"><div className="verification-head"><div><div className="eyebrow dark-eyebrow">{servicePanel === 'repair' ? 'BOOL REPAIR DESK' : 'BOOL MARKETPLACE'}</div><h2 id="service-panel-title">{servicePanel === 'repair' ? 'Request a device repair' : 'Explore mobile listings'}</h2><p>{servicePanel === 'repair' ? 'Describe the issue and keep a record of your repair request.' : 'Browse published offers or create a listing for a device you are authorised to sell.'}</p></div><button className="help-close" onClick={() => setServicePanel(null)} aria-label="Close service panel"><X size={18}/></button></div>{servicePanel === 'repair' ? <><form onSubmit={submitRepairRequest}><label className="verification-label" htmlFor="repair-model">Device make and model</label><input className="verification-input" id="repair-model" value={repairModel} onChange={e => setRepairModel(e.target.value)} placeholder="e.g. Samsung Galaxy A54" required/><label className="verification-label" htmlFor="repair-issue">What needs fixing?</label><textarea className="verification-input service-textarea" id="repair-issue" value={repairIssue} onChange={e => setRepairIssue(e.target.value)} placeholder="Describe the fault, symptoms and any damage..." minLength={8} required/><button className="btn btn-dark verification-submit" type="submit" disabled={repairBusy}>{repairBusy ? 'Submitting…' : 'Submit repair request'} <ArrowRight size={16}/></button></form><div className="saved-reports"><strong>Your recent repair requests</strong>{repairJobs.length ? repairJobs.map(job => <div className="saved-report-row" key={job.id}><span>{job.device_model} · {job.status.replace('_',' ')}</span><small>{job.issue_description} · {new Date(job.created_at).toLocaleDateString()}</small></div>) : <p className="empty-service-state">No repair requests yet. Your first request will appear here.</p>}</div><p className="verification-hint">This records your request; automated technician matching, quotes and in-app messaging are not active yet.</p></> : <><div className="market-listings">{marketListings.length ? marketListings.map(item => <article className="market-listing" key={item.id}><div className="market-listing-top"><span className="service-tag">{item.category.replace('_',' ').toUpperCase()} · {item.condition.replace('_',' ').toUpperCase()}</span><strong>₦{Number(item.price_ngn).toLocaleString('en-NG')}</strong></div><h3>{item.title}</h3><p>{item.description || 'No description provided.'}</p><small>Listed {new Date(item.created_at).toLocaleDateString()}</small></article>) : <p className="empty-service-state">No published listings yet. Be the first to post an offer.</p>}</div><form onSubmit={submitListing} className="listing-form"><strong>Create a marketplace listing</strong><label className="verification-label" htmlFor="listing-title">Listing title</label><input className="verification-input" id="listing-title" value={listingTitle} onChange={e => setListingTitle(e.target.value)} placeholder="e.g. iPhone 13 Pro 128GB" required/><div className="service-form-grid"><div><label className="verification-label" htmlFor="listing-category">Category</label><select className="verification-input" id="listing-category" value={listingCategory} onChange={e => setListingCategory(e.target.value)}><option value="phone">Phone</option><option value="accessory">Accessory</option><option value="tablet">Tablet</option><option value="other">Other</option></select></div><div><label className="verification-label" htmlFor="listing-condition">Condition</label><select className="verification-input" id="listing-condition" value={listingCondition} onChange={e => setListingCondition(e.target.value)}><option value="new">New</option><option value="like_new">Like new</option><option value="used">Used</option><option value="for_parts">For parts</option></select></div></div><label className="verification-label" htmlFor="listing-price">Price (NGN)</label><input className="verification-input" id="listing-price" type="number" min="0" step="1" value={listingPrice} onChange={e => setListingPrice(e.target.value)} placeholder="e.g. 250000" required/><label className="verification-label" htmlFor="listing-description">Description</label><textarea className="verification-input service-textarea" id="listing-description" value={listingDescription} onChange={e => setListingDescription(e.target.value)} placeholder="Describe condition, accessories and any known issues..." required/><button className="btn btn-dark verification-submit" type="submit" disabled={listingBusy}>{listingBusy ? 'Publishing…' : 'Publish listing'} <ArrowRight size={16}/></button></form><p className="verification-hint">Bool does not process payments or guarantee sellers. Meet safely and confirm the device and payment before completing a sale.</p></>}</section></div>}
    {adminOpen && profile?.role === 'admin' && <div className="modal-backdrop admin-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setAdminOpen(false); }}><section className="verification-modal admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title"><div className="verification-head"><div><div className="eyebrow dark-eyebrow">BOOL ADMINISTRATION</div><h2 id="admin-title">Admin console</h2><p>Review accounts, device reports, repair requests and marketplace listings.</p></div><button className="help-close" onClick={() => setAdminOpen(false)} aria-label="Close admin console"><X size={18}/></button></div><div className="admin-toolbar"><div className="admin-tabs">{([{id:'overview',label:'Overview'},{id:'users',label:'Users'},{id:'devices',label:'Device reports'},{id:'repairs',label:'Repairs'},{id:'listings',label:'Listings'},{id:'operations',label:'Customer operations'},{id:'cms',label:'Pages & policies'},{id:'catalog',label:'Content studio'},{id:'media',label:'Media library'},{id:'announcements',label:'Announcements'},{id:'settings',label:'Settings'},{id:'audit',label:'Audit log'}] as const).map(tab => <button key={tab.id} className={adminTab === tab.id ? 'admin-tab active' : 'admin-tab'} onClick={() => setAdminTab(tab.id)}>{tab.label}</button>)}</div><button className="btn btn-dark btn-small" onClick={() => void refreshAdminData()} disabled={adminBusy}>{adminBusy ? 'Refreshing…' : 'Refresh data'}</button></div>{adminTab === 'overview' ? <><div className="admin-stat-grid"><button onClick={() => setAdminTab('users')}><span>Registered profiles</span><strong>{adminProfiles.length}</strong><small>View account records</small></button><button onClick={() => setAdminTab('devices')}><span>Device reports</span><strong>{adminChecks.length}</strong><small>Review submitted checks</small></button><button onClick={() => setAdminTab('repairs')}><span>Repair requests</span><strong>{adminRepairs.length}</strong><small>Manage job statuses</small></button><button onClick={() => setAdminTab('listings')}><span>Marketplace listings</span><strong>{adminListings.length}</strong><small>Moderate published offers</small></button></div><div className="admin-note"><ShieldCheck size={18}/><p><strong>Protected admin access</strong><br/>This console appears only when the signed-in profile has the server-controlled admin role. Record access is also checked by Supabase row-level security.</p></div></> : adminTab === 'users' ? <div className="admin-record-list">{adminProfiles.map(user => <article className="admin-record" key={user.id}><div><strong>{user.display_name || 'Bool user'}</strong><p>{user.role} · Joined {new Date(user.created_at).toLocaleDateString()}</p><small>ID: {user.id}</small></div><span className="admin-status">{user.role}</span></article>)}{!adminProfiles.length && <p className="empty-service-state">No profile records found yet.</p>}</div> : adminTab === 'devices' ? <div className="admin-record-list">{adminChecks.map(item => <article className="admin-record" key={item.id}><div><strong>{item.device_model}</strong><p>IMEI ending {item.imei_last4 || 'not supplied'} · {new Date(item.created_at).toLocaleDateString()}</p><small>Account ID: {item.user_id}</small></div><label className="admin-select-label">Official status<select className="verification-input admin-select" value={item.official_check_status} onChange={e => void updateAdminRecord('device_checks', item.id, 'official_check_status', e.target.value)}><option value="not_checked">Not checked</option><option value="needs_review">Needs review</option><option value="verified">Verified</option><option value="failed">Failed</option></select></label></article>)}{!adminChecks.length && <p className="empty-service-state">No device reports submitted yet.</p>}</div> : adminTab === 'repairs' ? <div className="admin-record-list">{adminRepairs.map(job => <article className="admin-record" key={job.id}><div><strong>{job.device_model}</strong><p>{job.issue_description}</p><small>Submitted {new Date(job.created_at).toLocaleDateString()} · {job.quote_ngn == null ? 'No quote' : '₦' + Number(job.quote_ngn).toLocaleString('en-NG')}</small></div><label className="admin-select-label">Job status<select className="verification-input admin-select" value={job.status} onChange={e => void updateAdminRecord('repair_jobs', job.id, 'status', e.target.value)}>{['requested','quoted','approved','in_progress','waiting_parts','completed','cancelled'].map(status => <option key={status} value={status}>{status.replace('_',' ')}</option>)}</select></label></article>)}{!adminRepairs.length && <p className="empty-service-state">No repair requests submitted yet.</p>}</div> : adminTab === 'listings' ? <div className="admin-record-list">{adminListings.map(item => <article className="admin-record" key={item.id}><div><strong>{item.title}</strong><p>{item.category} · ₦{Number(item.price_ngn).toLocaleString('en-NG')} · {new Date(item.created_at).toLocaleDateString()}</p></div><label className="admin-select-label">Listing status<select className="verification-input admin-select" value={item.status} onChange={e => void updateAdminRecord('listings', item.id, 'status', e.target.value)}>{['draft','published','sold','removed'].map(status => <option key={status} value={status}>{status}</option>)}</select></label></article>)}{!adminListings.length && <p className="empty-service-state">No marketplace listings found yet.</p>}</div> : adminTab === 'operations' ? <AdminOperations onNotice={setNotice}/> : adminTab === 'catalog' ? <ContentStudio onNotice={setNotice}/> : adminTab === 'cms' ? <div className="cms-workspace"><div className="cms-page-list"><div className="cms-list-head"><div><strong>Content library</strong><small>{cmsPages.length} pages</small></div><button className="btn btn-lime btn-small" onClick={() => editCmsPage()}>+ New page</button></div>{cmsPages.map(page => <button key={page.id} className={cmsEditingId === page.id ? 'cms-page-row selected' : 'cms-page-row'} onClick={() => editCmsPage(page)}><span className="cms-page-title">{page.title}</span><span className="cms-page-meta">/{page.slug} · {page.status}</span></button>)}{!cmsPages.length && <p className="empty-service-state">No pages yet. Create your first page.</p>}</div><div className="cms-editor"><div className="cms-editor-head"><div><strong>{cmsEditingId ? 'Edit content' : 'Create content'}</strong><small>Markdown content · SEO fields · publication workflow</small></div>{cmsEditingId && <button className="text-button" onClick={() => void deleteCmsPage(cmsEditingId)}>Delete page</button>}</div><label>Page title<input className="verification-input" value={cmsDraft.title} onChange={e => setCmsDraft(v => ({...v,title:e.target.value,slug:v.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}))} placeholder="e.g. Safe phone buying guide"/></label><label>URL slug<input className="verification-input" value={cmsDraft.slug} onChange={e => setCmsDraft(v => ({...v,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g,'-')}))} placeholder="safe-phone-buying-guide"/></label><div className="cms-two-fields"><label>Category<input className="verification-input" value={cmsDraft.category} onChange={e => setCmsDraft(v => ({...v,category:e.target.value}))}/></label><label>Publication status<select className="verification-input" value={cmsDraft.status} onChange={e => setCmsDraft(v => ({...v,status:e.target.value}))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div><label>Short summary<textarea className="verification-input cms-textarea" rows={2} value={cmsDraft.excerpt} onChange={e => setCmsDraft(v => ({...v,excerpt:e.target.value}))} placeholder="A short description for cards and search."/></label><label>Page body (Markdown supported)<textarea className="verification-input cms-body" rows={10} value={cmsDraft.body_markdown} onChange={e => setCmsDraft(v => ({...v,body_markdown:e.target.value}))} placeholder="# Your content\n\nWrite the page content here..."/></label><label className="cms-featured"><input type="checkbox" checked={cmsDraft.featured} onChange={e => setCmsDraft(v => ({...v,featured:e.target.checked}))}/> Feature this content</label><label>SEO title<input className="verification-input" value={cmsDraft.seo_title} onChange={e => setCmsDraft(v => ({...v,seo_title:e.target.value}))} placeholder="Search-result title"/></label><label>SEO description<textarea className="verification-input cms-textarea" rows={2} value={cmsDraft.seo_description} onChange={e => setCmsDraft(v => ({...v,seo_description:e.target.value}))} placeholder="Description for search engines."/></label><div className="cms-save-row"><span>Last edited content is stored in Bool CMS.</span><button className="btn btn-dark" onClick={() => void saveCmsPage()} disabled={cmsSaving}>{cmsSaving ? 'Saving…' : 'Save page'}</button></div></div></div> : adminTab === 'media' ? <div className="media-library">
        <div className="media-library-head"><div><strong>Media library</strong><p>Upload reusable images for Bool pages and announcements. Public files can be viewed by anyone with their URL.</p><small>Images only · 10 MB maximum per file</small></div><label className="btn btn-dark media-upload-btn"><ImagePlus size={16}/> {mediaBusy ? 'Working…' : 'Upload images'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" multiple disabled={mediaBusy} onChange={e => void uploadMedia(e)} /></label></div>
        <div className="media-grid">{mediaFiles.map(file => { const url = supabase.storage.from('bool-media').getPublicUrl(file.name).data.publicUrl; return <article className="media-card" key={file.id || file.name}><a href={url} target="_blank" rel="noreferrer" className="media-preview"><img src={url} alt={file.name} loading="lazy"/></a><div className="media-file-name" title={file.name}>{file.name}</div><small>{file.metadata?.size ? (file.metadata.size / 1024).toFixed(0) + ' KB' : 'Image file'}</small><div className="media-actions"><button className="text-button" onClick={() => { void navigator.clipboard?.writeText(url).then(() => setNotice('Public media URL copied.')).catch(() => setNotice(url)); }}><Copy size={14}/> Copy URL</button><button className="text-button media-delete" onClick={() => void deleteMedia(file.name)} aria-label={'Delete ' + file.name}><Trash2 size={14}/> Delete</button></div></article>; })}</div>
        {!mediaFiles.length && <div className="media-empty"><ImagePlus size={28}/><strong>No media uploaded yet</strong><p>Upload your first image to start building a reusable content library.</p></div>}
      </div> : adminTab === 'announcements' ? <div className="cms-announcement-workspace"><form className="cms-announcement-form" onSubmit={e => {e.preventDefault();void createAnnouncement();}}><h3>Create announcement</h3><label>Title<input className="verification-input" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} required placeholder="Service update or platform notice"/></label><label>Message<textarea className="verification-input cms-textarea" rows={3} value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)} required placeholder="Write a clear announcement for users."/></label><div className="cms-two-fields"><label>Audience<select className="verification-input" value={announcementAudience} onChange={e => setAnnouncementAudience(e.target.value)}><option value="all">Everyone</option><option value="customers">Customers</option><option value="technicians">Technicians</option><option value="dealers">Dealers</option></select></label><label>Initial status<select className="verification-input" value={announcementStatus} onChange={e => setAnnouncementStatus(e.target.value)}><option value="draft">Draft</option><option value="published">Publish now</option><option value="archived">Archived</option></select></label></div><button className="btn btn-dark" type="submit" disabled={announcementBusy}>{announcementBusy ? 'Saving…' : 'Create announcement'}</button></form><div className="admin-record-list">{cmsAnnouncements.map(item => <article className="admin-record" key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p><small>Audience: {item.audience} · {new Date(item.created_at).toLocaleDateString()}</small></div><label className="admin-select-label">Status<select className="verification-input admin-select" value={item.status} onChange={e => void updateAnnouncementStatus(item.id,e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></article>)}{!cmsAnnouncements.length && <p className="empty-service-state">No announcements yet. Create the first announcement above.</p>}</div></div> : adminTab === 'settings' ? <div className="cms-settings"><div className="cms-settings-form"><h3>Platform configuration</h3><p>Settings are stored as JSON values. Keep secrets and private API keys out of CMS settings.</p><label>Setting key<input className="verification-input" value={settingKey} onChange={e => setSettingKey(e.target.value)} placeholder="e.g. support_email"/></label><label>Value (JSON or plain text)<textarea className="verification-input cms-textarea" rows={3} value={settingValue} onChange={e => setSettingValue(e.target.value)} placeholder='"support@bool.example" or {"enabled":true}'/></label><label>Description<input className="verification-input" value={settingDescription} onChange={e => setSettingDescription(e.target.value)} placeholder="What this setting controls"/></label><button className="btn btn-dark" onClick={() => void saveCmsSetting()}>Save setting</button></div><div className="admin-record-list">{cmsSettings.map(item => <article className="admin-record" key={item.key}><div><strong>{item.key}</strong><p>{JSON.stringify(item.value)}</p><small>{item.description}</small></div><button className="text-button" onClick={() => {setSettingKey(item.key);setSettingValue(JSON.stringify(item.value));setSettingDescription(item.description);}}>Edit</button></article>)}{!cmsSettings.length && <p className="empty-service-state">No custom settings created.</p>}</div></div> : <div className="admin-record-list">{auditLogs.map(item => <article className="admin-record" key={item.id}><div><strong>{item.action.toUpperCase()} · {item.resource_type}</strong><p>Resource: {item.resource_id || 'not recorded'}</p><small>{new Date(item.created_at).toLocaleString()} · Actor: {item.actor_id || 'system'}</small></div></article>)}{!auditLogs.length && <p className="empty-service-state">No admin audit events recorded yet.</p>}</div>}<p className="admin-footnote">Showing up to 200 records per content section. Device status remains an administrator-entered result, not an automatic ownership or blacklist check. CMS pages are stored as drafts until published.</p></section></div>}
    {authOpen && <div className="modal-backdrop auth-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="verification-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="verification-head"><div><div className="eyebrow dark-eyebrow">YOUR BOOL ACCOUNT</div><h2 id="auth-title">{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2><p>{authMode === 'signup' ? 'Save device-check reports and keep your work in one place.' : 'Sign in to access your private Bool records.'}</p></div><button className="help-close" onClick={() => setAuthOpen(false)} aria-label="Close account form"><X size={18}/></button></div><form onSubmit={submitAuth}>{authMode === 'signup' && <><label className="verification-label" htmlFor="auth-name">Your name</label><input className="verification-input" id="auth-name" autoComplete="name" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Full name" required/></>}<label className="verification-label" htmlFor="auth-email">Email address</label><input className="verification-input" id="auth-email" type="email" autoComplete="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" required/><label className="verification-label" htmlFor="auth-password">Password</label><input className="verification-input" id="auth-password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="At least 8 characters" required/><p className="verification-hint">Use a password you do not use on another website.</p>{authMessage && <div className="verification-result result-info" role="status">{authMessage}</div>}<button className="btn btn-dark verification-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create secure account' : 'Sign in'} <ArrowRight size={16}/></button></form><div className="auth-switch">{authMode === 'signup' ? 'Already have an account?' : 'New to Bool?'} <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthMessage(''); }}>{authMode === 'signup' ? 'Sign in' : 'Create account'}</button></div><p className="auth-privacy">Your device reports are private to your account. Never share your password or one-time verification codes.</p></section></div>}
    {verificationOpen && <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setVerificationOpen(false); }}><section className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title"><div className="verification-head"><div><div className="eyebrow dark-eyebrow">BOOL DEVICE TRUST</div><h2 id="verification-title">Start a remote phone check</h2><p>Build an evidence checklist before you buy, sell or swap a device.</p></div><button className="help-close" onClick={() => setVerificationOpen(false)} aria-label="Close verification"><X size={18}/></button></div><form onSubmit={(e) => { e.preventDefault(); const ok = validImei(imei); setVerificationMessage(ok ? 'IMEI format and checksum look valid. Bool has not queried a live blacklist or ownership database. Use the official NCC checker below for Nigerian network/device verification, then record the result separately.' : 'Enter a valid 15-digit IMEI. On most phones, dial *#06# to display it. This checks the number format only; it does not establish ownership or blacklist status.'); }}><label className="verification-label" htmlFor="device-model">Device make and model</label><input id="device-model" className="verification-input" value={deviceModel} onChange={e => setDeviceModel(e.target.value)} placeholder="e.g. iPhone 13 Pro" required/><label className="verification-label" htmlFor="device-imei">IMEI (15 digits)</label><input id="device-imei" className="verification-input" value={imei} onChange={e => { setImei(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 18)); setVerificationMessage(''); }} placeholder="Dial *#06# on the phone" inputMode="numeric" required/><p className="verification-hint">Your IMEI is sensitive device information. Only enter a device you are authorised to check.</p><button className="btn btn-dark verification-submit" type="submit">Validate IMEI format <ArrowRight size={16}/></button></form>{verificationMessage && <div className={validImei(imei) ? 'verification-result result-info' : 'verification-result result-warn'} role="status">{verificationMessage}</div>}<div className="official-check"><strong>Official Nigerian device check</strong><p>Check NCC device approval/verification through the official service. Bool does not claim to have queried NCC.</p><a href="https://www.ncc.gov.ng/DeviceChecker" target="_blank" rel="noreferrer">Open NCC Device Checker <ArrowUpRight size={14}/></a><small>Never share an OTP with a seller or another person.</small></div><div className="remote-tests"><strong>Guided remote condition checklist</strong><p>Ask the seller to perform each test live on a video call. Tick only what you personally observed.</p>{deviceTests.map(test => <label key={test} className="remote-test-row"><input type="checkbox" checked={checkedTests.includes(test)} onChange={e => setCheckedTests(e.target.checked ? [...checkedTests, test] : checkedTests.filter(x => x !== test))}/><span>{test}</span></label>)}<div className="checklist-summary">{checkedTests.length} of {deviceTests.length} tests observed</div><button type="button" className="btn btn-dark verification-submit save-report-button" onClick={saveDeviceReport} disabled={savingReport}>{savingReport ? 'Saving report…' : 'Save private report'} <ClipboardCheck size={16}/></button>{!session && <p className="verification-hint">Sign in to save your checklist privately to your Bool account.</p>}{session && savedChecks.length > 0 && <div className="saved-reports"><strong>Your recent saved checks</strong>{savedChecks.slice(0,3).map(check => <div className="saved-report-row" key={check.id}><span>{check.device_model}</span><small>{new Date(check.created_at).toLocaleDateString()} · {check.observed_tests?.length ?? 0} tests · IMEI ending {check.imei_last4 || 'not provided'}</small></div>)}</div>}</div><div className="verification-footer">Bool stores only the last four IMEI digits for your report, not the full IMEI. An official check remains unverified until you confirm it separately.</div></section></div>}{customerHubTab && <CustomerHub initialTab={customerHubTab} userId={session?.user?.id} onClose={() => setCustomerHubTab(null)} onNotice={setNotice} onRequireAuth={() => { setAuthMode('signin'); setAuthMessage('Sign in or create a Bool account to manage your requests and support cases.'); setAuthOpen(true); }}/>}
    {notice && <div className="toast" role="status"><Sparkles size={18}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {helpOpen && <section className="help-panel" role="dialog" aria-modal="false" aria-labelledby="help-title"><div className="help-panel-head"><div className="help-panel-icon"><CircleHelp size={21}/></div><div><strong id="help-title">How can we help?</strong><p>Quick answers for getting started with Bool.</p></div><button className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close help"><X size={18}/></button></div><div className="help-content"><article><strong>What is Bool?</strong><p>Bool is owned and operated by RealTreats Technologies to help customers find approved technology providers, request services, and get support.</p></article><article><strong>How do payments work?</strong><p>Pay only against a quote confirmed through Bool. Manual transfers go to RealTreats Technologies and remain unconfirmed until our team checks the receiving account. Paystack is not enabled yet.</p></article><article><strong>How do I raise a complaint?</strong><p>Open Contact RealTreats in the customer centre to create a private support case, share your Bool request reference, and continue the conversation in your account.</p></article><article><strong>How are providers verified?</strong><p>Providers are reviewed before their profiles appear publicly. The verification badge describes the checks recorded by RealTreats Technologies; it is not a guarantee against every future issue.</p></article></div><div className="help-panel-foot"><span>Built by RealTreats Technologies</span><a href="https://github.com/ubonguiux/bool" target="_blank" rel="noreferrer">Follow development <ArrowUpRight size={14}/></a></div></section>}
    <button className="help-fab" aria-label="Bool help" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}><CircleHelp size={20}/><span>{helpOpen ? 'Close help' : 'Need a hand?'}</span>{helpOpen ? <X size={14}/> : <ChevronDown size={14}/>}</button>
  </div>;
}
