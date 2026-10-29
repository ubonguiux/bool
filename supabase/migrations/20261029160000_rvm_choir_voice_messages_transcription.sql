-- Voice messages and optional browser speech-to-text support.
alter table public.rvm_messages add column if not exists message_type text not null default 'text' check (message_type in ('text','voice'));
alter table public.rvm_messages add column if not exists audio_path text;
alter table public.rvm_messages add column if not exists transcript text;
alter table public.rvm_messages add column if not exists duration_ms integer;
alter table public.rvm_messages add constraint rvm_messages_voice_fields_check check (
 (message_type='text' and audio_path is null and duration_ms is null)
 or (message_type='voice' and audio_path is not null and duration_ms between 0 and 600000)
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('rvm-choir-chat-audio','rvm-choir-chat-audio',false,26214400,array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/aac'])
on conflict(id) do update set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Choir members read chat audio" on storage.objects;
create policy "Choir members read chat audio" on storage.objects for select to authenticated
using (bucket_id='rvm-choir-chat-audio' and public.rvm_is_approved() and exists (
 select 1 from public.choir_members cm where cm.choir_id=((storage.foldername(name))[1])::uuid and cm.user_id=auth.uid()
));
drop policy if exists "Choir members upload own chat audio" on storage.objects;
create policy "Choir members upload own chat audio" on storage.objects for insert to authenticated
with check (bucket_id='rvm-choir-chat-audio' and public.rvm_is_approved() and (storage.foldername(name))[2]=auth.uid()::text and exists (
 select 1 from public.choir_members cm where cm.choir_id=((storage.foldername(name))[1])::uuid and cm.user_id=auth.uid()
));
grant select,insert on public.rvm_messages to authenticated;