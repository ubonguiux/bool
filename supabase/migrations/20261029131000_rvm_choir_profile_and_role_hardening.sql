
-- Idempotent hardening for RVM Choir account approval, role permissions and workspace RPCs.
create or replace function public.rvm_handle_new_user()
returns trigger language plpgsql security definer set search_path=public,auth
as $$
declare owner_account boolean;
begin
 owner_account := lower(coalesce(new.email,'')) = 'ubonguiux@gmail.com';
 insert into public.rvm_profiles(user_id,display_name,email,approval_status,role,approved_at)
 values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''),coalesce(new.email,''),case when owner_account then 'approved' else 'pending' end,case when owner_account then 'owner' else 'chorister' end,case when owner_account then now() else null end)
 on conflict(user_id) do update set email=excluded.email,display_name=case when excluded.display_name<>'' then excluded.display_name else public.rvm_profiles.display_name end;
 return new;
end;
$$;
create or replace function public.rvm_ensure_profile()
returns public.rvm_profiles language plpgsql security definer set search_path=public,auth
as $$
declare u auth.users; p public.rvm_profiles; owner_account boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into u from auth.users where id=auth.uid();
 owner_account := lower(coalesce(u.email,''))='ubonguiux@gmail.com';
 insert into public.rvm_profiles(user_id,display_name,email,approval_status,role,approved_at)
 values(u.id,coalesce(u.raw_user_meta_data->>'display_name',''),coalesce(u.email,''),case when owner_account then 'approved' else 'pending' end,case when owner_account then 'owner' else 'chorister' end,case when owner_account then now() else null end)
 on conflict(user_id) do update set email=excluded.email,
  display_name=case when excluded.display_name<>'' then excluded.display_name else public.rvm_profiles.display_name end,
  approval_status=case when owner_account then 'approved' else public.rvm_profiles.approval_status end,
  role=case when owner_account then 'owner' else public.rvm_profiles.role end,
  approved_at=case when owner_account then coalesce(public.rvm_profiles.approved_at,now()) else public.rvm_profiles.approved_at end;
 select * into p from public.rvm_profiles where user_id=auth.uid();
 return p;
end;
$$;
insert into public.rvm_profiles(user_id,display_name,email,approval_status,role,approved_at)
select id,coalesce(raw_user_meta_data->>'display_name','Choir Owner'),email,'approved','owner',now()
from auth.users where lower(email)='ubonguiux@gmail.com'
on conflict(user_id) do update set approval_status='approved',role='owner',approved_at=coalesce(public.rvm_profiles.approved_at,now());

create or replace function public.rvm_can_manage_admin(target_choir_id uuid)
returns boolean language sql stable security definer set search_path=public,auth
as $$
 select public.rvm_is_owner() or exists (
  select 1 from public.rvm_profiles p join public.choir_members m on m.user_id=p.user_id
  where p.user_id=auth.uid() and p.approval_status='approved'
   and p.role in ('admin','director','uniform_coordinator','backup_coordinator','press_team')
   and m.choir_id=target_choir_id
 );
$$;
drop policy if exists "Authorised administrators manage roster" on public.rvm_monthly_roster;
create policy "Authorised administrators manage roster" on public.rvm_monthly_roster for all to authenticated
using (public.rvm_is_approved() and public.rvm_can_manage_admin(choir_id))
with check (public.rvm_is_approved() and public.rvm_can_manage_admin(choir_id));

create or replace function public.rvm_create_choir(choir_name text, choir_description text default null)
returns uuid language plpgsql security definer set search_path=public,auth
as $$
declare new_choir_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in is required to create a choir'; end if;
 if not public.rvm_is_approved() then raise exception 'Your account must be approved before creating a choir'; end if;
 if length(trim(coalesce(choir_name,''))) < 2 or length(trim(choir_name)) > 120 then raise exception 'Choir name must be between 2 and 120 characters'; end if;
 insert into public.choirs(name,description,created_by) values(trim(choir_name),nullif(trim(coalesce(choir_description,'')),''),auth.uid()) returning id into new_choir_id;
 insert into public.choir_members(choir_id,user_id,role) values(new_choir_id,auth.uid(),'owner');
 return new_choir_id;
end;
$$;
create or replace function public.rvm_join_choir(choir_invite_code text)
returns uuid language plpgsql security definer set search_path=public,auth
as $$
declare target_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in is required to join a choir'; end if;
 if not public.rvm_is_approved() then raise exception 'Your account must be approved before joining a choir'; end if;
 select id into target_id from public.choirs where invite_code=lower(trim(choir_invite_code));
 if target_id is null then raise exception 'This invite code is invalid'; end if;
 insert into public.choir_members(choir_id,user_id,role) values(target_id,auth.uid(),'member') on conflict(choir_id,user_id) do nothing;
 return target_id;
end;
$$;

revoke execute on function public.rvm_handle_new_user() from public,anon,authenticated;
revoke execute on function public.rvm_is_owner() from public,anon;
revoke execute on function public.rvm_is_approved() from public,anon;
revoke execute on function public.rvm_ensure_profile() from public,anon;
revoke execute on function public.rvm_can_manage_admin(uuid) from public,anon;
revoke execute on function public.rvm_create_choir(text,text) from public,anon;
revoke execute on function public.rvm_join_choir(text) from public,anon;
grant execute on function public.rvm_is_owner() to authenticated;
grant execute on function public.rvm_is_approved() to authenticated;
grant execute on function public.rvm_ensure_profile() to authenticated;
grant execute on function public.rvm_can_manage_admin(uuid) to authenticated;
grant execute on function public.rvm_create_choir(text,text) to authenticated;
grant execute on function public.rvm_join_choir(text) to authenticated;
