-- RVM Choir community, member profiles, optional-topic chat, and instrumentalist workspace.
alter table public.rvm_profiles add column if not exists avatar_url text;
alter table public.rvm_profiles add column if not exists voice_part text;
alter table public.rvm_profiles add column if not exists bio text not null default '';
alter table public.rvm_profiles add column if not exists instruments text[] not null default '{}';
alter table public.rvm_profiles drop constraint if exists rvm_profiles_role_check;
alter table public.rvm_profiles add constraint rvm_profiles_role_check check (role in ('owner','admin','director','music_director','section_leader','instrumentalist','librarian','chorister','uniform_coordinator','backup_coordinator','press_team'));

create table if not exists public.rvm_member_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 choir_id uuid not null references public.choirs(id) on delete cascade,
 role_key text not null check (role_key in ('choir_admin','choir_director','music_director','section_leader','instrumentalist','librarian','uniform_coordinator','backup_coordinator','press_team','chorister')),
 instrument_name text, assigned_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), unique(user_id, choir_id, role_key, instrument_name)
);
alter table public.rvm_member_roles enable row level security;
drop policy if exists "Approved members can view choir roles" on public.rvm_member_roles;
create policy "Approved members can view choir roles" on public.rvm_member_roles for select to authenticated using (public.rvm_is_approved() and public.rvm_is_choir_member(choir_id));
drop policy if exists "Choir leaders manage role assignments" on public.rvm_member_roles;
create policy "Choir leaders manage role assignments" on public.rvm_member_roles for all to authenticated
using (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id) or exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.role='music_director' and p.approval_status='approved')))
with check (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id) or exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.role='music_director' and p.approval_status='approved')));
grant select,insert,update,delete on public.rvm_member_roles to authenticated;

create table if not exists public.rvm_messages (
 id uuid primary key default gen_random_uuid(), choir_id uuid not null references public.choirs(id) on delete cascade,
 sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 recipient_id uuid references auth.users(id) on delete cascade, topic text,
 body text not null check (length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create index if not exists rvm_messages_choir_created_idx on public.rvm_messages(choir_id,created_at desc);
create index if not exists rvm_messages_direct_idx on public.rvm_messages(sender_id,recipient_id,created_at desc);
alter table public.rvm_messages enable row level security;
drop policy if exists "Members can read group and own direct messages" on public.rvm_messages;
create policy "Members can read group and own direct messages" on public.rvm_messages for select to authenticated
using (public.rvm_is_approved() and public.rvm_is_choir_member(choir_id) and (recipient_id is null or sender_id=auth.uid() or recipient_id=auth.uid()));
drop policy if exists "Members can send group or direct messages" on public.rvm_messages;
create policy "Members can send group or direct messages" on public.rvm_messages for insert to authenticated
with check (public.rvm_is_approved() and sender_id=auth.uid() and public.rvm_is_choir_member(choir_id)
and (recipient_id is null or (recipient_id<>auth.uid() and public.rvm_is_choir_member(choir_id))) and length(trim(body)) between 1 and 4000);
grant select,insert on public.rvm_messages to authenticated;

create table if not exists public.rvm_music_assignments (
 id uuid primary key default gen_random_uuid(), choir_id uuid not null references public.choirs(id) on delete cascade,
 title text not null, event_date date, assignment_type text not null default 'service' check (assignment_type in ('service','rehearsal','practice')),
 instrument_name text not null, assigned_user_id uuid references auth.users(id) on delete set null,
 song_id uuid references public.songs(id) on delete set null, musical_key text,
 tempo_bpm integer check (tempo_bpm is null or tempo_bpm between 30 and 300), time_signature text,
 notes text not null default '', status text not null default 'planned' check (status in ('planned','confirmed','completed','cancelled')),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict, created_at timestamptz not null default now()
);
create index if not exists rvm_music_assignments_date_idx on public.rvm_music_assignments(choir_id,event_date);
alter table public.rvm_music_assignments enable row level security;
drop policy if exists "Approved members can view music assignments" on public.rvm_music_assignments;
create policy "Approved members can view music assignments" on public.rvm_music_assignments for select to authenticated using (public.rvm_is_approved() and public.rvm_is_choir_member(choir_id));
drop policy if exists "Music leaders manage assignments" on public.rvm_music_assignments;
create policy "Music leaders manage assignments" on public.rvm_music_assignments for all to authenticated
using (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id) or exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.role='music_director' and p.approval_status='approved')))
with check (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id) or exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.role='music_director' and p.approval_status='approved')));
grant select,insert,update,delete on public.rvm_music_assignments to authenticated;

drop policy if exists "Users can view own profile" on public.rvm_profiles;
drop policy if exists "Approved members can view choir member profiles" on public.rvm_profiles;
create policy "Approved members can view choir member profiles" on public.rvm_profiles for select to authenticated using (public.rvm_is_approved());
grant update(avatar_url,voice_part,bio,instruments,display_name) on public.rvm_profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rvm-choir-avatars','rvm-choir-avatars',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
drop policy if exists "Public can view choir member avatars" on storage.objects;
create policy "Public can view choir member avatars" on storage.objects for select to anon,authenticated using (bucket_id='rvm-choir-avatars');
drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar" on storage.objects for insert to authenticated with check (bucket_id='rvm-choir-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.rvm_is_approved());
drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar" on storage.objects for update to authenticated using (bucket_id='rvm-choir-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.rvm_is_approved()) with check (bucket_id='rvm-choir-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.rvm_is_approved());
drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members delete own avatar" on storage.objects for delete to authenticated using (bucket_id='rvm-choir-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.rvm_is_approved());

create or replace function public.rvm_review_member(target_user_id uuid, decision text, assigned_role text default 'chorister')
returns void language plpgsql security definer set search_path=public,auth as $$
declare first_choir uuid;
begin
 if not public.rvm_is_owner() then raise exception 'Only the platform owner can approve accounts or assign roles'; end if;
 if decision not in ('approved','rejected','suspended') then raise exception 'Invalid approval decision'; end if;
 if assigned_role not in ('admin','director','music_director','section_leader','instrumentalist','librarian','chorister','uniform_coordinator','backup_coordinator','press_team') then raise exception 'Invalid role'; end if;
 update public.rvm_profiles set approval_status=decision,role=case when decision='approved' then assigned_role else role end,approved_by=auth.uid(),approved_at=case when decision='approved' then now() else null end,updated_at=now() where user_id=target_user_id and role<>'owner';
 if not found then raise exception 'Member not found or cannot change the owner account'; end if;
 if decision='approved' then
  select id into first_choir from public.choirs order by created_at asc limit 1;
  if first_choir is not null then insert into public.choir_members(choir_id,user_id,role) values(first_choir,target_user_id,case when assigned_role in ('admin','director','librarian') then assigned_role else 'member' end) on conflict(choir_id,user_id) do update set role=excluded.role; end if;
 else delete from public.choir_members where user_id=target_user_id;
 end if;
end; $$;
revoke execute on function public.rvm_review_member(uuid,text,text) from public,anon;
grant execute on function public.rvm_review_member(uuid,text,text) to authenticated;
