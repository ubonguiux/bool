create table if not exists public.rvm_message_reads (
 message_id uuid not null references public.rvm_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(message_id,user_id)
);
alter table public.rvm_message_reads enable row level security;
drop policy if exists "Members can view own message read receipts" on public.rvm_message_reads;
create policy "Members can view own message read receipts" on public.rvm_message_reads for select to authenticated using (user_id=auth.uid());
drop policy if exists "Members can create own message read receipts" on public.rvm_message_reads;
create policy "Members can create own message read receipts" on public.rvm_message_reads for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.rvm_messages m where m.id=message_id and public.rvm_is_approved() and public.rvm_is_choir_member(m.choir_id) and (m.recipient_id is null or m.sender_id=auth.uid() or m.recipient_id=auth.uid())));
drop policy if exists "Members can update own message read receipts" on public.rvm_message_reads;
create policy "Members can update own message read receipts" on public.rvm_message_reads for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,insert,update on public.rvm_message_reads to authenticated;
