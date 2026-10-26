alter table public.provider_service_requests
  add column if not exists device_model text not null default '',
  add column if not exists issue_images text[] not null default '{}',
  add column if not exists staff_response text not null default '',
  add column if not exists next_action text not null default '',
  add column if not exists work_type text not null default 'phone_technician',
  add column if not exists journey_events jsonb not null default '[]'::jsonb;

alter table public.bool_providers
  add column if not exists work_specialty text not null default 'phone_technician';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('repair-evidence', 'repair-evidence', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=false, file_size_limit=8388608, allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Customers upload own repair evidence" on storage.objects;
create policy "Customers upload own repair evidence"
on storage.objects for insert to authenticated
with check (bucket_id='repair-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Customers read own repair evidence" on storage.objects;
create policy "Customers read own repair evidence"
on storage.objects for select to authenticated
using (bucket_id='repair-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_bool_admin())));

drop policy if exists "Bool admins manage repair evidence" on storage.objects;
create policy "Bool admins manage repair evidence"
on storage.objects for all to authenticated
using (bucket_id='repair-evidence' and (select private.is_bool_admin()))
with check (bucket_id='repair-evidence' and (select private.is_bool_admin()));
