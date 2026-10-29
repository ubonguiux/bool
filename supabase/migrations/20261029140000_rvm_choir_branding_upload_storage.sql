-- Public church branding bucket. Only the approved RVM Choir owner may manage uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rvm-choir-branding','rvm-choir-branding',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=excluded.allowed_mime_types;

create policy "Public can view RVM Choir branding"
on storage.objects for select to anon, authenticated
using (bucket_id = 'rvm-choir-branding');

create policy "Only RVM owner can upload branding"
on storage.objects for insert to authenticated
with check (bucket_id = 'rvm-choir-branding' and public.rvm_is_owner());

create policy "Only RVM owner can update branding"
on storage.objects for update to authenticated
using (bucket_id = 'rvm-choir-branding' and public.rvm_is_owner())
with check (bucket_id = 'rvm-choir-branding' and public.rvm_is_owner());

create policy "Only RVM owner can delete branding"
on storage.objects for delete to authenticated
using (bucket_id = 'rvm-choir-branding' and public.rvm_is_owner());
