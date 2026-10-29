drop policy if exists "Choir members read chat audio" on storage.objects;
create policy "Recipients read choir chat audio" on storage.objects for select to authenticated
using (
 bucket_id='rvm-choir-chat-audio'
 and public.rvm_is_approved()
 and exists (
  select 1
  from public.rvm_messages msg
  join public.choir_members cm on cm.choir_id=msg.choir_id and cm.user_id=auth.uid()
  where msg.audio_path=name
    and (msg.recipient_id is null or msg.sender_id=auth.uid() or msg.recipient_id=auth.uid())
 )
);