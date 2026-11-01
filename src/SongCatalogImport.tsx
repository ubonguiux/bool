import { useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { supabase } from './lib/supabase';

type Row = Record<string,string>;
const normal=(s:string)=>s.toLowerCase().trim().replace(/[ _-]+/g,'');
function parseCsv(text:string):Row[]{
 const lines:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))lines.push(row);row=[];cell='';}else cell+=c;}
 row.push(cell);if(row.some(x=>x.trim()))lines.push(row);
 if(lines.length<2)return [];
 const headers=lines[0].map(h=>normal(h));
 return lines.slice(1).map(cols=>Object.fromEntries(headers.map((h,i)=>[h,(cols[i]||'').trim()])));
}
const val=(r:Row,keys:string[])=>{for(const k of keys){const v=r[normal(k)];if(v)return v;}return '';};
const template='title,category,language,composer,arranger,lyrics,musical_key,tempo_bpm,time_signature,vocal_parts,lyrics_source_url,recording_source_url,sheet_music_source_url,rights_status,verification_status\n"Example public-domain hymn",Hymns,English,"Composer name",,"Only include lyrics you are authorised to store",G major,92,4/4,"SATB",https://example.org/lyrics,https://example.org/audio,https://example.org/score,public_domain,needs_review\n';
export default function SongCatalogImport({choirId,onClose,onNotice,onImported}:{choirId:string;onClose:()=>void;onNotice:(message:string)=>void;onImported:()=>Promise<void>}){
 const [file,setFile]=useState<File|null>(null),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState('');
 const choose=async(f:File|null)=>{setFile(f);setRows([]);if(!f)return;if(f.size>15*1024*1024){onNotice('CSV must be 15 MB or smaller.');setFile(null);return;}try{const text=await f.text();const parsed=parseCsv(text);if(!parsed.length||!parsed.some(r=>val(r,['title','songtitle','name']))){throw new Error('No song titles found. Use the provided CSV template and include a title column.');}setRows(parsed.filter(r=>val(r,['title','songtitle','name']))); }catch(e){onNotice(e instanceof Error?e.message:'Could not read this CSV.');setFile(null);}};
 const importRows=async()=>{if(!rows.length)return;setBusy(true);let added=0,skipped=0;try{
  const titles=rows.map(r=>val(r,['title','songtitle','name']).slice(0,240));
  const uniqueRows:Row[]=[];const seen=new Set<string>();
  for(let i=0;i<rows.length;i++){const k=titles[i].toLowerCase().trim();if(!k||seen.has(k)){skipped++;continue;}seen.add(k);uniqueRows.push(rows[i]);}
  const existing=new Set<string>();for(let start=0;start<uniqueRows.length;start+=500){const part=uniqueRows.slice(start,start+500).map(r=>val(r,['title','songtitle','name']));const {data,error}=await supabase.from('songs').select('title').eq('choir_id',choirId).is('archived_at',null).in('title',part);if(error)throw error;for(const s of data||[])existing.add(s.title.toLowerCase().trim());}
  const payload=uniqueRows.filter(r=>!existing.has(val(r,['title','songtitle','name']).toLowerCase().trim())).map(r=>({
   choir_id:choirId,title:val(r,['title','songtitle','name']).slice(0,240),
   category:val(r,['category','genre'])||'Uncategorised',language:val(r,['language'])||'English',
   composer:val(r,['composer','lyricist','writer'])||null,arranger:val(r,['arranger','arrangement'])||null,
   lyrics:val(r,['lyrics','lyrictext'])||null,musical_key:val(r,['musical_key','key','keysignature'])||null,
   tempo_bpm:val(r,['tempo_bpm','bpm','tempo'])?Number(val(r,['tempo_bpm','bpm','tempo'])):null,
   time_signature:val(r,['time_signature','timesignature'])||null,
   vocal_parts:val(r,['vocal_parts','voices','arrangementparts']).split(/[;,|]/).map(x=>x.trim()).filter(Boolean),
   lyrics_source_url:val(r,['lyrics_source_url','lyricssource','lyricurl'])||null,
   recording_source_url:val(r,['recording_source_url','recordingsource','audiourl'])||null,
   sheet_music_source_url:val(r,['sheet_music_source_url','sheetmusicurl','scoreurl'])||null,
   rights_status:val(r,['rights_status','rights'])||'needs_review',
   verification_status:val(r,['verification_status','verified'])||'unverified',
   source_notes:'Imported from '+(file?.name||'CSV')+'; review lyrics, source, musical key, and rights before performance.',
  }));
  for(let start=0;start<payload.length;start+=100){const {error}=await supabase.from('songs').insert(payload.slice(start,start+100));if(error)throw error;added+=Math.min(100,payload.length-start);setProgress('Imported '+added+' of '+payload.length+' songs…');}
  await onImported();onNotice('Song import complete: '+added+' added; '+(skipped+existing.size)+' duplicate titles skipped. Imported records remain unverified until reviewed.');onClose();
 }catch(e){onNotice('Import stopped after '+added+' songs: '+(e instanceof Error?e.message:'database error')+'. You can remove duplicates and retry; imported rows are not rolled back automatically.');}finally{setBusy(false);setProgress('');}};
 const downloadTemplate=()=>{const blob=new Blob([template],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='rvm-choir-song-import-template.csv';a.click();URL.revokeObjectURL(url);};
 return <div className="modal-backdrop" onClick={onClose}><section className="modal-card add-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow-light">LIBRARY MANAGEMENT</p><h2>Import song catalogue</h2><p>Bulk import song metadata from CSV. Duplicate titles are skipped.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20}/></button></div><div className="panel" style={{padding:16,marginBottom:16}}><p><strong>Important:</strong> Only import lyrics, recordings and scores you have permission to store. Musical keys and source links are marked unverified until checked by a librarian.</p><button type="button" className="outline-btn" onClick={downloadTemplate}><FileSpreadsheet size={16}/> Download CSV template</button></div><label className="file-picker"><Upload size={17}/> Select CSV file<input type="file" accept=".csv,text/csv" onChange={e=>void choose(e.target.files?.[0]||null)}/><small>{file?file.name:'CSV up to 15 MB · Suggested batches up to 2,500 songs'}</small></label>{rows.length>0&&<div className="panel" style={{padding:16,marginTop:16}}><strong><CheckCircle2 size={16} style={{display:'inline',verticalAlign:'middle'}}/> {rows.length.toLocaleString()} song rows ready</strong><p>Preview: {rows.slice(0,5).map(r=>val(r,['title','songtitle','name'])).join(' · ')}</p></div>}{progress&&<p role="status">{progress}</p>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button type="button" className="primary-btn" disabled={busy||!rows.length} onClick={()=>void importRows()}>{busy?'Importing…':'Import '+rows.length+' songs'}</button></div></section></div>;
}
