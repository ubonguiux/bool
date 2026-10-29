# RVM Choir

**A public welcome page and private choir workspace for songs, service planning, monthly duty rosters and administration.**

Production domain: **https://rvmchoir.vercel.app**

RVM Choir is a RealTreats Technologies project designed to complement physical rehearsals and existing communication channels such as WhatsApp. It does not access or index private WhatsApp chats.

## Stack

- React + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security and private Storage
- Vercel production deployment

## Features

### Public welcome page
- Visitors can explore what RVM Choir offers before signing in.
- Visitors can sign in or create an account from the welcome page.
- Public welcome-page copy is managed by the owner through the CMS.

### Account approvals and permissions
- New accounts start as pending and cannot access private choir features until approved.
- The platform owner can approve, reject or suspend accounts and assign roles.
- Roles include owner, administrator, choir director, librarian, chorister, uniform coordinator, backup coordinator and press team.
- Database policies enforce access; hiding controls in the interface is not the only security layer.

### Song library
- Shared song library with search and category filtering.
- Lyrics, language, composer, arranger, favourites and performance history.
- Private audio/document uploads and on-demand audio playback through signed URLs.
- Share song details using the device share menu.

### Choir administration
- Monthly uniform coordination, backup/support, press-team and Choir Sunday duty rosters.
- Choir Sunday and service planning.
- Rehearsal and meeting records, announcements, attendance, welfare notes, finance notes and general administration.
- Owner CMS for updating the public welcome page.

## Supabase and Vercel

The dedicated Supabase project is `rvm-choir`. Its database migrations create the song library, account profiles and approval status, role controls, monthly roster, administration items, public welcome content and private storage bucket.

Vercel environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only the publishable key is used in the browser. Never expose a Supabase service-role key to client code.

**Authentication configuration still needs a final dashboard check:** set the Supabase Auth Site URL to `https://rvmchoir.vercel.app` and allow `https://rvmchoir.vercel.app/**` under redirect URLs. Confirm email verification and password recovery work on the production domain.

## Local development

Install dependencies with `npm install`, set the two Vite environment variables, then run `npm run dev`. Run `npm run build` before deploying.

## Security notes

- The storage bucket is private, with file size and MIME restrictions.
- RLS policies restrict choir records and private files to authorised members and permitted roles.
- Approval status is checked before a user can create or join a choir workspace.
- Choir invite codes are bearer invitations. Share them only with intended members and rotate them if they leak.
- Do not upload copyrighted scores or recordings unless the choir has permission to store and share them.
- Keep regular database and file backups and test recovery.
