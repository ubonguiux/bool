-- RVM Choir foundation. This migration is staged in the rvm-choir branch only.
-- Review and apply only after confirming the intended Supabase project and backup.
create extension if not exists pgcrypto;

create table if not exists public.choirs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.choir_members (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','director','librarian','member')),
  joined_at timestamptz not null default now(),
  unique (choir_id, user_id)
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  category text not null default 'Uncategorised',
  language text not null default 'English',
  lyrics text,
  composer text,
  arranger text,
  source_notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists songs_choir_title_idx on public.songs (choir_id, lower(title));
create index if not exists songs_choir_category_idx on public.songs (choir_id, category);

create table if not exists public.song_arrangements (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  name text not null default 'Default arrangement',
  voice_parts text[] not null default '{}',
  key_signature text,
  tempo_bpm integer check (tempo_bpm is null or tempo_bpm between 20 and 300),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.song_files (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  arrangement_id uuid references public.song_arrangements(id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  kind text not null check (kind in ('audio','lyrics','score','document','other')),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (choir_id, storage_path)
);

create table if not exists public.song_performances (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  arrangement_id uuid references public.song_arrangements(id) on delete set null,
  performed_on date not null,
  event_name text not null default 'Choir performance',
  venue text,
  featured_singer text,
  director_name text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists song_performances_choir_date_idx
  on public.song_performances (choir_id, performed_on desc);

create table if not exists public.song_favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create or replace function public.rvm_is_choir_member(target_choir_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.choir_members m
    where m.choir_id = target_choir_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.rvm_can_manage_choir(target_choir_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.choir_members m
    where m.choir_id = target_choir_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','director','librarian')
  );
$$;

create or replace function public.rvm_create_choir(choir_name text, choir_description text default null)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare new_choir_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to create a choir';
  end if;
  if length(trim(coalesce(choir_name,''))) < 2 or length(trim(choir_name)) > 120 then
    raise exception 'Choir name must be between 2 and 120 characters';
  end if;
  insert into public.choirs(name, description, created_by)
  values (trim(choir_name), nullif(trim(coalesce(choir_description,'')),''), auth.uid())
  returning id into new_choir_id;
  insert into public.choir_members(choir_id, user_id, role)
  values (new_choir_id, auth.uid(), 'owner');
  return new_choir_id;
end;
$$;

alter table public.choirs enable row level security;
alter table public.choir_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_arrangements enable row level security;
alter table public.song_files enable row level security;
alter table public.song_performances enable row level security;
alter table public.song_favourites enable row level security;

drop policy if exists "Choir members can read their choirs" on public.choirs;
create policy "Choir members can read their choirs" on public.choirs
for select to authenticated using (public.rvm_is_choir_member(id));
drop policy if exists "Choir managers can update choir details" on public.choirs;
create policy "Choir managers can update choir details" on public.choirs
for update to authenticated using (public.rvm_can_manage_choir(id)) with check (public.rvm_can_manage_choir(id));

drop policy if exists "Members can read membership roster" on public.choir_members;
create policy "Members can read membership roster" on public.choir_members
for select to authenticated using (user_id = auth.uid() or public.rvm_is_choir_member(choir_id));
drop policy if exists "Managers can add choir members" on public.choir_members;
create policy "Managers can add choir members" on public.choir_members
for insert to authenticated with check (public.rvm_can_manage_choir(choir_id));
drop policy if exists "Managers can update choir members" on public.choir_members;
create policy "Managers can update choir members" on public.choir_members
for update to authenticated using (public.rvm_can_manage_choir(choir_id)) with check (public.rvm_can_manage_choir(choir_id));
drop policy if exists "Managers can remove choir members" on public.choir_members;
create policy "Managers can remove choir members" on public.choir_members
for delete to authenticated using (public.rvm_can_manage_choir(choir_id));

drop policy if exists "Members can read songs" on public.songs;
create policy "Members can read songs" on public.songs for select to authenticated
using (public.rvm_is_choir_member(choir_id));
drop policy if exists "Managers can add songs" on public.songs;
create policy "Managers can add songs" on public.songs for insert to authenticated
with check (public.rvm_can_manage_choir(choir_id) and created_by = auth.uid());
drop policy if exists "Managers can update songs" on public.songs;
create policy "Managers can update songs" on public.songs for update to authenticated
using (public.rvm_can_manage_choir(choir_id)) with check (public.rvm_can_manage_choir(choir_id));
drop policy if exists "Managers can archive songs" on public.songs;
create policy "Managers can archive songs" on public.songs for delete to authenticated
using (exists (select 1 from public.choir_members m where m.choir_id=songs.choir_id and m.user_id=auth.uid() and m.role in ('owner','admin')));

drop policy if exists "Members can read arrangements" on public.song_arrangements;
create policy "Members can read arrangements" on public.song_arrangements for select to authenticated
using (public.rvm_is_choir_member(choir_id));
drop policy if exists "Managers can manage arrangements" on public.song_arrangements;
create policy "Managers can manage arrangements" on public.song_arrangements for all to authenticated
using (public.rvm_can_manage_choir(choir_id)) with check (public.rvm_can_manage_choir(choir_id));

drop policy if exists "Members can read file metadata" on public.song_files;
create policy "Members can read file metadata" on public.song_files for select to authenticated
using (public.rvm_is_choir_member(choir_id));
drop policy if exists "Managers can manage file metadata" on public.song_files;
create policy "Managers can manage file metadata" on public.song_files for all to authenticated
using (public.rvm_can_manage_choir(choir_id)) with check (public.rvm_can_manage_choir(choir_id));

drop policy if exists "Members can read performance history" on public.song_performances;
create policy "Members can read performance history" on public.song_performances for select to authenticated
using (public.rvm_is_choir_member(choir_id));
drop policy if exists "Managers can manage performance history" on public.song_performances;
create policy "Managers can manage performance history" on public.song_performances for all to authenticated
using (public.rvm_can_manage_choir(choir_id)) with check (public.rvm_can_manage_choir(choir_id));

drop policy if exists "Users can read own favourites" on public.song_favourites;
create policy "Users can read own favourites" on public.song_favourites for select to authenticated
using (user_id = auth.uid() and exists (select 1 from public.songs s where s.id=song_favourites.song_id and public.rvm_is_choir_member(s.choir_id)));
drop policy if exists "Users can manage own favourites" on public.song_favourites;
create policy "Users can manage own favourites" on public.song_favourites for all to authenticated
using (user_id = auth.uid() and exists (select 1 from public.songs s where s.id=song_favourites.song_id and public.rvm_is_choir_member(s.choir_id)))
with check (user_id = auth.uid() and exists (select 1 from public.songs s where s.id=song_favourites.song_id and public.rvm_is_choir_member(s.choir_id)));

grant execute on function public.rvm_create_choir(text, text) to authenticated;
grant execute on function public.rvm_is_choir_member(uuid) to authenticated;
grant execute on function public.rvm_can_manage_choir(uuid) to authenticated;


-- Private object storage for choir recordings, scores and documents.
-- Paths must follow: <choir-uuid>/<song-uuid>/<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rvm-choir-files',
  'rvm-choir-files',
  false,
  52428800,
  array[
    'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Choir members can read private choir files" on storage.objects;
create policy "Choir members can read private choir files" on storage.objects
for select to authenticated
using (
  bucket_id = 'rvm-choir-files'
  and public.rvm_is_choir_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Choir managers can upload private choir files" on storage.objects;
create policy "Choir managers can upload private choir files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'rvm-choir-files'
  and public.rvm_can_manage_choir(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Choir managers can update private choir files" on storage.objects;
create policy "Choir managers can update private choir files" on storage.objects
for update to authenticated
using (
  bucket_id = 'rvm-choir-files'
  and public.rvm_can_manage_choir(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'rvm-choir-files'
  and public.rvm_can_manage_choir(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Choir managers can delete private choir files" on storage.objects;
create policy "Choir managers can delete private choir files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'rvm-choir-files'
  and public.rvm_can_manage_choir(((storage.foldername(name))[1])::uuid)
);


-- Secure member onboarding: choir owners can share a random invite code.
alter table public.choirs
  add column if not exists invite_code text not null default encode(gen_random_bytes(12), 'hex');
create unique index if not exists choirs_invite_code_idx on public.choirs(invite_code);

create or replace function public.rvm_join_choir(choir_invite_code text)
returns uuid
language plpgsql security definer
set search_path = public, auth
as $$
declare target_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to join a choir';
  end if;
  select id into target_id from public.choirs
  where invite_code = lower(trim(choir_invite_code));
  if target_id is null then
    raise exception 'This invite code is invalid';
  end if;
  insert into public.choir_members(choir_id,user_id,role)
  values (target_id,auth.uid(),'member')
  on conflict (choir_id,user_id) do nothing;
  return target_id;
end;
$$;
grant execute on function public.rvm_join_choir(text) to authenticated;
