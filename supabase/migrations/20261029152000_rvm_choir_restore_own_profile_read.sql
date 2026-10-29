drop policy if exists "Users can view own profile" on public.rvm_profiles;
create policy "Users can view own profile" on public.rvm_profiles for select to authenticated
using (user_id=auth.uid() or public.rvm_is_approved());
