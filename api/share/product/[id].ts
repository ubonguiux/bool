export default function handler(_req:any,res:any){res.setHeader('Cache-Control','no-store');return res.status(410).send('This legacy endpoint is no longer available.');}
