-- Storage and attribution support for Bool catalogue images.
alter table public.bool_devices
  add column if not exists image_credits jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bool-catalog-images', 'bool-catalog-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

drop policy if exists "Bool catalogue images are publicly readable" on storage.objects;
create policy "Bool catalogue images are publicly readable"
on storage.objects for select to public
using (bucket_id = 'bool-catalog-images');

drop policy if exists "Signed-in users can upload Bool catalogue images to own folder" on storage.objects;
create policy "Signed-in users can upload Bool catalogue images to own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'bool-catalog-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own Bool catalogue images" on storage.objects;
create policy "Users can update their own Bool catalogue images"
on storage.objects for update to authenticated
using (bucket_id = 'bool-catalog-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'bool-catalog-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own Bool catalogue images" on storage.objects;
create policy "Users can delete their own Bool catalogue images"
on storage.objects for delete to authenticated
using (bucket_id = 'bool-catalog-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
