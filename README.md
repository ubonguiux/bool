# RVM Choir

**A simple home for your choir's songs, lyrics, recordings and performance memories.**

RVM Choir is a mobile-first choir library concept by RealTreats Technologies. It complements rehearsals and existing communication channels such as WhatsApp; it does not replace them or access private WhatsApp chats.

## Stack
- React + TypeScript + Vite
- Lucide icons
- Vercel deployment target
- Supabase Auth, Postgres, Row Level Security and Storage planned for shared, secure production use

## Current branch status
The `rvm-choir` branch is a frontend preview. Song entries are stored in the current browser using localStorage. Example entries are sample content, not a connected live choir library. Shared accounts, secure audio/document uploads, cross-device syncing, and live backend persistence are not yet enabled.

## Local development
Run `npm install` and `npm run dev`.

## Production readiness checklist
1. Create or confirm an approved Supabase project for RVM Choir.
2. Implement schema and row-level security for choir membership, roles, songs, arrangements, performances and file metadata.
3. Connect authentication and authorization.
4. Add private audio/document storage with upload size limits and access policies.
5. Implement share-to-app handling where supported by the device/browser.
6. Test builds, mobile layouts, permissions, backup and recovery before switching production traffic.

Never expose a Supabase service-role key in browser code or any Vite-prefixed variable. Only use public publishable/anon keys in the client, protected by correct RLS policies.
