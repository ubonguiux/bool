const origin = 'https://bool-ten-phi.vercel.app';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] as string));
const pages: Record<string,{title:string;description:string;body:string;destination:string}> = {
  about:{title:'About Bool',description:'Discover Bool, the mobile technology services platform operated by RealTreats Technologies.',body:'A clearer way to find device services, explore technology listings and get support from real people.',destination:'/#trust'},
  contact:{title:'Contact Bool',description:'Contact the Bool team for service questions, device listings and customer support.',body:'Reach the Bool team at 08069929435 or visit 6 Oron Road Uyo Plaza, Akwa Ibom State.',destination:'/#support'}
};
export default function handler(req:any,res:any){
  const slug=String(req.query?.slug||'').toLowerCase();
  const page=pages[slug];
  if(!page)return res.status(404).send('Share page not found.');
  const title=escapeHtml(page.title),description=escapeHtml(page.description),image=origin+'/og-bool.svg',url=origin+'/share/page/'+slug;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | Bool</title><meta name="description" content="'+description+'"><meta property="og:type" content="website"><meta property="og:site_name" content="Bool"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><meta property="og:image" content="'+image+'"><meta property="og:image:alt" content="Bool — mobile technology, made clearer"><meta property="og:url" content="'+url+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+title+'"><meta name="twitter:description" content="'+description+'"><meta name="twitter:image" content="'+image+'"><style>body{font:16px Arial,sans-serif;background:#10131c;color:#fff;margin:0;display:grid;min-height:100vh;place-items:center}.card{max-width:660px;margin:24px;padding:30px;background:#1b202b;border-radius:24px}.card img{display:block;width:100%;border-radius:14px}.card h1{font-size:38px}.card p{line-height:1.7;color:#d5d8de}.btn{display:inline-block;margin-top:12px;padding:13px 18px;background:#d6ff79;color:#10131c;border-radius:10px;text-decoration:none;font-weight:bold}</style></head><body><main class="card"><img src="'+image+'" alt="Bool"><h1>'+title+'</h1><p>'+description+'</p><p>'+escapeHtml(page.body)+'</p><a class="btn" href="'+origin+page.destination+'">'+(slug==='contact'?'Contact the Bool team':'Learn about Bool')+'</a></main></body></html>');
}
