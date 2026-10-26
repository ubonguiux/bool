-- Bool admin access and console policies.
-- Founder admin is assigned only to the exact email configured below.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['customer','technician','dealer','admin']::text[]));

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_bool_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION private.is_bool_admin() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_bool_admin() TO authenticated;

CREATE OR REPLACE FUNCTION private.assign_bool_founder_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(NEW.email) = 'ubonguiux@gmail.com' THEN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (NEW.id, 'Ubong Dennis Etefia', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
  ELSE
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Bool user'), 'customer')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.assign_bool_founder_admin() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created_bool_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_bool_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.assign_bool_founder_admin();

DO $$
DECLARE founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM auth.users WHERE lower(email) = 'ubonguiux@gmail.com' LIMIT 1;
  IF founder_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (founder_id, 'Ubong Dennis Etefia', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Bool admins read all profiles" ON public.profiles;
CREATE POLICY "Bool admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Bool admins update profiles" ON public.profiles;
CREATE POLICY "Bool admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Bool admins read all device checks" ON public.device_checks;
CREATE POLICY "Bool admins read all device checks" ON public.device_checks FOR SELECT TO authenticated USING ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Bool admins update device checks" ON public.device_checks;
CREATE POLICY "Bool admins update device checks" ON public.device_checks FOR UPDATE TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Bool admins read all repair jobs" ON public.repair_jobs;
CREATE POLICY "Bool admins read all repair jobs" ON public.repair_jobs FOR SELECT TO authenticated USING ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Bool admins update repair jobs" ON public.repair_jobs;
CREATE POLICY "Bool admins update repair jobs" ON public.repair_jobs FOR UPDATE TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Bool admins read all listings" ON public.listings;
CREATE POLICY "Bool admins read all listings" ON public.listings FOR SELECT TO authenticated USING ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Bool admins update listings" ON public.listings;
CREATE POLICY "Bool admins update listings" ON public.listings FOR UPDATE TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

GRANT UPDATE (official_check_status, notes) ON public.device_checks TO authenticated;
GRANT UPDATE (status, quote_ngn, technician_id, customer_notes) ON public.repair_jobs TO authenticated;
GRANT UPDATE (status) ON public.listings TO authenticated;
