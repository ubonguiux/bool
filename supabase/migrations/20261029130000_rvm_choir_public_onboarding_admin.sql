-- RVM Choir public onboarding, approvals, choir administration, monthly rosters and owner CMS.
create table if not exists public.rvm_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
  role text not null default 'chorister' check (role in ('owner','admin','director','librarian','chorister','uniform_coordinator','backup_coordinator','press_team')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rvm_profiles enable row level security;

create or replace function public.rvm_is_owner()
returns boolean language sql stable security definer set search_path=public,auth
as $$
 select exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.role='owner' and p.approval_status='approved');
$$;

create or replace function public.rvm_is_approved()
returns boolean language sql stable security definer set search_path=public,auth
as $$
 select exists(select 1 from public.rvm_profiles p where p.user_id=auth.uid() and p.approval_status='approved');
$$;

create or replace function public.rvm_handle_new_user()
returns trigger language plpgsql security definer set search_path=public,auth
as $$
declare owner_account boolean;
begin
 owner_account := lower(coalesce(new.email,'')) = 'ubonguiux@gmail.com';
 insert into public.rvm_profiles(user_id,display_name,email,approval_status,role,approved_at)
 values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''),coalesce(new.email,''),case when owner_account then 'approved' else 'pending' end,case when owner_account then 'owner' else 'chorister' end,case when owner_account then now() else null end)
 on conflict(user_id) do update set email=excluded.email, display_name=case when excluded.display_name<>'' then excluded.display_name else public.rvm_profiles.display_name end;
 return new;
end;
$$;
drop trigger if exists rvm_auth_user_created on auth.users;
create trigger rvm_auth_user_created after insert on auth.users for each row execute function public.rvm_handle_new_user();

-- Ensure the designated owner profile exists for an already-registered owner account.
insert into public.rvm_profiles(user_id,display_name,email,approval_status,role,approved_at)
select id,coalesce(raw_user_meta_data->>'display_name','Choir Owner'),email,'approved','owner',now()
from auth.users where lower(email)='ubonguiux@gmail.com'
on conflict(user_id) do update set approval_status='approved',role='owner',approved_at=coalesce(public.rvm_profiles.approved_at,now());

drop policy if exists "Users can view own profile" on public.rvm_profiles;
create policy "Users can view own profile" on public.rvm_profiles for select to authenticated
using (user_id=auth.uid() or public.rvm_is_owner());
drop policy if exists "Owner can update profiles" on public.rvm_profiles;
create policy "Owner can update profiles" on public.rvm_profiles for update to authenticated
using (public.rvm_is_owner()) with check (public.rvm_is_owner());
grant select on public.rvm_profiles to authenticated;
grant update(approval_status,role,approved_by,approved_at,updated_at) on public.rvm_profiles to authenticated;

-- Public CMS content drives the welcome page. Only owner can edit.
create table if not exists public.rvm_site_content (
  content_key text primary key,
  title text not null default '',
  body text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.rvm_site_content enable row level security;
drop policy if exists "Public can read published welcome content" on public.rvm_site_content;
create policy "Public can read published welcome content" on public.rvm_site_content for select to anon, authenticated using (true);
drop policy if exists "Owner can manage welcome content" on public.rvm_site_content;
create policy "Owner can manage welcome content" on public.rvm_site_content for all to authenticated
using (public.rvm_is_owner()) with check (public.rvm_is_owner());
grant select on public.rvm_site_content to anon,authenticated;
grant insert,update,delete on public.rvm_site_content to authenticated;
insert into public.rvm_site_content(content_key,title,body) values
 ('welcome_headline','A choir that stays in harmony.','RVM Choir brings your music library, rehearsals, monthly duties, Sunday service planning and choir administration into one organised space.'),
 ('welcome_about','More than a song library','Find lyrics, arrangements, recordings and performance history; coordinate uniform rosters, backup and press-team duty; plan choir Sundays; and keep everyone aligned between rehearsals.')
on conflict(content_key) do nothing;

-- Month-by-month duty roster. Duty categories include uniform, backup, press and custom teams.
create table if not exists public.rvm_monthly_roster (
 id uuid primary key default gen_random_uuid(),
 choir_id uuid not null references public.choirs(id) on delete cascade,
 month_start date not null,
 duty_type text not null check (duty_type in ('uniform','backup','press','choir_sunday','administration','other')),
 title text not null,
 member_user_id uuid references auth.users(id) on delete set null,
 notes text,
 status text not null default 'planned' check(status in ('planned','confirmed','completed','cancelled')),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rvm_monthly_roster_month_idx on public.rvm_monthly_roster(choir_id,month_start,duty_type);
alter table public.rvm_monthly_roster enable row level security;
drop policy if exists "Approved choir members can read roster" on public.rvm_monthly_roster;
create policy "Approved choir members can read roster" on public.rvm_monthly_roster for select to authenticated
using (public.rvm_is_approved() and public.rvm_is_choir_member(choir_id));
drop policy if exists "Authorised administrators manage roster" on public.rvm_monthly_roster;
create policy "Authorised administrators manage roster" on public.rvm_monthly_roster for all to authenticated
using (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id)))
with check (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id)));
grant select,insert,update,delete on public.rvm_monthly_roster to authenticated;

-- Choir Sunday / service plans and general administration records.
create table if not exists public.rvm_choir_admin_items (
 id uuid primary key default gen_random_uuid(),
 choir_id uuid not null references public.choirs(id) on delete cascade,
 item_type text not null check(item_type in ('choir_sunday','rehearsal','meeting','announcement','attendance','finance_note','welfare','general')),
 title text not null,
 details text not null default '',
 event_date date,
 status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
 assigned_to uuid references auth.users(id) on delete set null,
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rvm_admin_items_date_idx on public.rvm_choir_admin_items(choir_id,event_date,item_type);
alter table public.rvm_choir_admin_items enable row level security;
drop policy if exists "Approved members read choir administration" on public.rvm_choir_admin_items;
create policy "Approved members read choir administration" on public.rvm_choir_admin_items for select to authenticated
using (public.rvm_is_approved() and public.rvm_is_choir_member(choir_id));
drop policy if exists "Leaders manage choir administration" on public.rvm_choir_admin_items;
create policy "Leaders manage choir administration" on public.rvm_choir_admin_items for all to authenticated
using (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id)))
with check (public.rvm_is_approved() and (public.rvm_is_owner() or public.rvm_can_manage_choir(choir_id)));
grant select,insert,update,delete on public.rvm_choir_admin_items to authenticated;

-- Approval RPC prevents a user from approving themselves or granting their own role.
create or replace function public.rvm_review_member(target_user_id uuid, decision text, assigned_role text default 'chorister')
returns void language plpgsql security definer set search_path=public,auth
as $$
declare first_choir uuid;
begin
 if not public.rvm_is_owner() then raise exception 'Only the platform owner can approve accounts or assign roles'; end if;
 if decision not in ('approved','rejected','suspended') then raise exception 'Invalid approval decision'; end if;
 if assigned_role not in ('admin','director','librarian','chorister','uniform_coordinator','backup_coordinator','press_team') then raise exception 'Invalid role'; end if;
 update public.rvm_profiles set approval_status=decision,role=case when decision='approved' then assigned_role else role end,
  approved_by=auth.uid(),approved_at=case when decision='approved' then now() else null end,updated_at=now()
 where user_id=target_user_id and role<>'owner';
 if not found then raise exception 'Member not found or cannot change the owner account'; end if;
 if decision='approved' then
  select id into first_choir from public.choirs order by created_at asc limit 1;
  if first_choir is not null then
   insert into public.choir_members(choir_id,user_id,role)
   values(first_choir,target_user_id,case when assigned_role in ('admin','director','librarian') then assigned_role else 'member' end)
   on conflict(choir_id,user_id) do update set role=excluded.role;
  end if;
 else
  delete from public.choir_members where user_id=target_user_id;
 end if;
end;
$$;
revoke execute on function public.rvm_review_member(uuid,text,text) from public,anon;
grant execute on function public.rvm_review_member(uuid,text,text) to authenticated;
