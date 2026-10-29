# RVM Choir

**A shared, mobile-first home for your choir's songs, lyrics, rehearsal recordings and performance memories.**

RVM Choir is a RealTreats Technologies project designed to complement physical rehearsals and existing communication channels such as WhatsApp. It does not access or index private WhatsApp chats.

## Stack

- React 18 + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security and private Storage
- Vercel preview/production deployment

## Implemented in the RVM Choir branch

- Email/password sign-up, sign-in and password-reset request
- Choir workspace creation and invite-code joining
- Shared song library with search and category filtering
- Song metadata: lyrics, category, language, composer and arranger
- Per-member favourites and performance history
- Private audio/document uploads, signed file URLs and on-demand audio playback
- Share song details through supported device share menus
- Role-aware song-management controls and mobile responsive interface
- A staged SQL migration for the data model, membership roles, RLS and private storage policies

## Required setup before real use

The SQL migration is at `supabase/migrations/20261029120000_rvm_choir_library_foundation.sql`. It has been staged in this branch but **has not been applied to any Supabase project**. Do not assume that the database is ready until an authorised operator applies and tests it.

1. Confirm a dedicated RVM Choir Supabase project. Do not apply this schema to the former Bool project until its data and files are backed up and the owner approves reuse.
2. In the intended Supabase project, review and apply the migration through the SQL editor or Supabase CLI.
3. Configure Vercel preview and production environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with that same project. Never expose a service-role key to the browser.
4. Configure Supabase Auth email confirmation, password recovery and allowed redirect URLs for the actual RVM Choir domain and preview domain.
5. Confirm the private `rvm-choir-files` bucket exists with its restrictive size/MIME limits and that storage RLS policies are active.
6. Test two separate accounts, cross-account isolation, choir invite joining, librarian/manager permissions, file uploads/downloads, recovery, mobile layouts and backups.
7. Only after the checks pass should the production domain be assigned to the RVM Choir deployment.

## Local development

Install dependencies with `npm install`, provide the two Vite environment variables, then run `npm run dev`. Run `npm run build` before deployment.

## Security notes

- The client uses only the Supabase publishable/anon key; RLS is the security boundary.
- The storage bucket is private; clients receive time-limited signed URLs on demand.
- Choir invite codes act as bearer invitations. Share them only with intended members and rotate/revoke them if they leak.
- Do not upload copyrighted scores or recordings unless the choir has permission to store and share them.
- Keep regular database and file backups and test recovery.
