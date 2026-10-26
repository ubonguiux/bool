import { useState } from 'react';
import { Camera, Search, ImagePlus, LoaderCircle, ExternalLink } from 'lucide-react';
import { supabase } from './lib/supabase';

type CatalogRow = Record<string, string>;
type SearchImage = { title: string; url: string; thumb: string; page: string; credit: string; license: string };

const norm = (s: string) => s.toLowerCase().replace(/[ _-]+/g, '').trim();
const value = (row: CatalogRow, names: string[]) => {
  const found = Object.entries(row).find(([key, val]) => names.includes(norm(key)) && String(val || '').trim());
  return found ? String(found[1]).trim() : '';
};
const titleOf = (row: CatalogRow) => value(row, ['title', 'productname', 'name', 'device', 'item']);
const imageKey = (row: CatalogRow) => Object.keys(row).find(k => ['imageurl', 'imageurls', 'image'].includes(norm(k))) || 'Image URL';

export default function CatalogImageTools({ rows, setRows }: { rows: CatalogRow[]; setRows: (rows: CatalogRow[]) => void }) {
  const [rowIndex, setRowIndex] = useState('0');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const active = Math.min(Number(rowIndex) || 0, Math.max(0, rows.length - 1));
  const activeRow = rows[active];
  const productName = activeRow ? titleOf(activeRow) : '';

  const updateRow = (url: string, meta?: Partial<SearchImage>) => {
    if (!activeRow) return;
    const next = [...rows];
    next[active] = {
      ...next[active],
      [imageKey(next[active])]: url,
      ...(meta ? { imagecredit: meta.credit || '', imagelicense: meta.license || '', imagesource: meta.page || '' } : {}),
    };
    setRows(next);
    setNotice('Image attached to ' + (titleOf(next[active]) || 'selected product') + '.');
  };

  const searchImages = async () => {
    const term = (query || productName).trim();
    if (!term) { setNotice('Select a product row with a name or enter a search term.'); return; }
    setBusy(true); setNotice('Searching Wikimedia Commons…'); setResults([]);
    try {
      const params = new URLSearchParams({
        action: 'query', generator: 'search', gsrsearch: term + ' filetype:bitmap',
        gsrnamespace: '6', gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|extmetadata',
        iiurlwidth: '420', format: 'json', origin: '*',
      });
      const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params.toString());
      if (!response.ok) throw new Error('Image search is temporarily unavailable.');
      const data = await response.json();
      const pages = Object.values(data?.query?.pages || {}) as any[];
      const found: SearchImage[] = pages.map((p: any) => {
        const info = p.imageinfo?.[0] || {};
        const meta = info.extmetadata || {};
        const plain = (x: any) => String(x?.value || '').replace(/<[^>]*>/g, '').trim();
        return {
          title: String(p.title || 'Image'),
          url: String(info.url || ''),
          thumb: String(info.thumburl || info.url || ''),
          page: String(info.descriptionurl || ''),
          credit: plain(meta.Artist) || plain(meta.Credit) || 'Wikimedia Commons contributor',
          license: plain(meta.LicenseShortName) || 'Check source page',
        };
      }).filter(x => /^https:\/\//i.test(x.url) && /^https:\/\//i.test(x.thumb));
      setResults(found);
      setNotice(found.length ? 'Choose the closest match. Product images may not always be exact model matches.' : 'No images found. Try the brand and model, or upload your own photo.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Image search failed.');
    } finally { setBusy(false); }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file || !activeRow) return;
    if (!file.type.startsWith('image/')) { setNotice('Choose an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setNotice('Images must be 10 MB or smaller.'); return; }
    setBusy(true); setNotice('Uploading photo…');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sign in before uploading product photos.');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = auth.user.id + '/' + Date.now() + '-' + safeName;
      const { error } = await supabase.storage.from('bool-catalog-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('bool-catalog-images').getPublicUrl(path);
      updateRow(data.publicUrl, { credit: 'Uploaded by catalogue submitter', license: 'User-supplied image', page: '' });
      setNotice('Photo uploaded and attached to the selected product.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Photo upload failed. Check the catalogue image storage setup.');
    } finally { setBusy(false); }
  };

  if (!rows.length) return null;
  return <div className="catalog-image-tools">
    <h4><ImagePlus size={16}/> Add product images</h4>
    <p>Select a product row, then take a photo or search online. The chosen image URL is added to that row before submission.</p>
    <label>Product row
      <select value={rowIndex} onChange={e => { setRowIndex(e.target.value); setResults([]); setNotice(''); setQuery(''); }}>
        {rows.map((row, i) => <option key={i} value={String(i)}>{i + 1}. {titleOf(row) || 'Unnamed product'}</option>)}
      </select>
    </label>
    <div className="catalog-image-controls">
      <label className="btn btn-small catalog-camera-button"><Camera size={15}/> Take / upload photo
        <input type="file" accept="image/*" capture="environment" onChange={e => { void uploadPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }} disabled={busy} />
      </label>
      <div className="catalog-image-search">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={productName || 'Search by product name, brand or model'} />
        <button type="button" className="btn btn-small btn-dark" disabled={busy} onClick={() => void searchImages()}>{busy ? <LoaderCircle size={15} className="catalog-spin"/> : <Search size={15}/>} Search online</button>
      </div>
    </div>
    {activeRow && value(activeRow, ['imageurl', 'imageurls', 'image']) && <div className="catalog-current-image"><img src={value(activeRow, ['imageurl', 'imageurls', 'image']).split(/[;,|]/)[0]} alt={productName || 'Selected product'} /><span>Image URL attached</span></div>}
    {results.length > 0 && <div className="catalog-image-results">{results.map((item, i) => <article key={item.url + i}>
      <img src={item.thumb} alt={item.title} loading="lazy"/>
      <div><strong>{item.title.replace(/^File:/, '')}</strong><small>{item.credit} · {item.license}</small><a href={item.page} target="_blank" rel="noreferrer">View source <ExternalLink size={12}/></a><button type="button" className="btn btn-small btn-dark" onClick={() => updateRow(item.url, item)}>Use this image</button></div>
    </article>)}</div>}
    {notice && <p className="catalog-image-notice" role="status">{notice}</p>}
    <small className="catalog-image-attribution">Online suggestions come from Wikimedia Commons. Check the source and licence before publishing; attribution details are saved with the import row where provided.</small>
  </div>;
}
