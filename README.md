# Bool

**Clarity for every device. Tools for everyone who keeps them working.**

Bool is a mobile-first platform concept for phone buyers, dealers, technicians, and people who need help with hardware and software jobs. Built by RealTreats Technologies.

## Stack
- React + TypeScript + Vite
- Supabase Auth, Postgres, Storage and Row Level Security (backend integration pending)
- Vercel connected to GitHub for automatic deployments

## Local development
Run `npm install` and `npm run dev`.

## Production build
Run `npm run build`.

## Environment variables
After the dedicated Bool Supabase project is provisioned, configure a local `.env.local`:

`VITE_SUPABASE_URL=`
`VITE_SUPABASE_ANON_KEY=`

Never expose a Supabase service-role key in browser code or any Vite-prefixed variable.

## Roadmap
1. Device trust reports with provenance and clear limits
2. Technician job cards, quotes, approvals, parts and customer updates
3. Dealer profiles, listings, stock and trade-in requests
4. Customer accounts and role-based access
5. AI-guided troubleshooting with confirmation for sensitive actions

Device checks must not imply that a phone is genuine, safe, or not stolen unless that specific status was verified by a reliable, authorized source.
