const projectUrl = process.env.VITE_SUPABASE_URL || 'https://lvmiplaoxzhtnumlznzq.supabase.co';
const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_qteHq5Qxy4_gCX8SdVnDfQ_2Z9X-DMT';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] as string));
export default async function handler(req: any, res: any) {
  const id = String(req.query?.id || '');
  const origin = 'https://bool-ten-phi.vercel.app';
  if (!id || !/^[0-9a-f-]{16,}$/i.test(id)) return res.status(400).send('Invalid product link.');
  try {
    const response = await fetch(projectUrl + '/rest/v1/bool_devices?id=eq.' + encodeURIComponent(id) + '&status=eq.published&select=id,title,brand,model,price_ngn,condition,description,image_urls&limit=1', {headers:{apikey:publicKey,Authorization:'Bearer '+publicKey}});
    const rows = response.ok ? await response.json() as any[] : [];
    const item = rows[0];
    if (!item) return res.status(404).send('This product is unavailable on Bool.');
    const images = Array.isArray(item.image_urls) ? item.image_urls : [];
    const image = typeof images[0] === 'string' && /^https:\/\//i.test(images[0]) ? images[0] : origin + '/og-bool.svg';
    const title = escapeHtml(item.title || 'Device listing on Bool');
    const description = escapeHtml([item.brand,item.model,item.condition,'₦'+Number(item.price_ngn || 0).toLocaleString('en-NG'),item.description].filter(Boolean).join(' · ').slice(0,240));
    const url = origin + '/share/product/' + encodeURIComponent(id);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | Bool</title><meta name="description" content="'+description+'"><meta property="og:type" content="product"><meta property="og:site_name" content="Bool"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><meta property="og:image" content="'+escapeHtml(image)+'"><meta property="og:image:alt" content="'+title+'"><meta property="og:url" content="'+url+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+title+'"><meta name="twitter:description" content="'+description+'"><meta name="twitter:image" content="'+escapeHtml(image)+'"><style>body{font:16px Arial,sans-serif;background:#f7f8f4;color:#10131c;margin:0;display:grid;min-height:100vh;place-items:center}.card{max-width:620px;margin:24px;padding:24px;background:white;border-radius:24px;box-shadow:0 12px 40px #10131c14}.card img{display:block;width:100%;max-height:420px;object-fit:contain;background:#f7f8f4;border-radius:16px}.card h1{margin:20px 0 8px}.card p{line-height:1.6;color:#606671}.btn{display:inline-block;margin-top:12px;padding:13px 18px;background:#10131c;color:#d6ff79;border-radius:10px;text-decoration:none;font-weight:bold}</style></head><body><main class="card"><img src="'+escapeHtml(image)+'" alt="'+title+'"><h1>'+title+'</h1><p>'+description+'</p><a class="btn" href="'+origin+'/#devices">View Bool device catalogue</a></main></body></html>');
  } catch {
    return res.status(502).send('Unable to load this product right now.');
  }
}
