drop policy if exists "Members can update own public profile fields" on public.rvm_profiles;
create policy "Members can update own public profile fields" on public.rvm_profiles
for update to authenticated
using (user_id=auth.uid() and public.rvm_is_approved())
with check (user_id=auth.uid() and public.rvm_is_approved());
