-- Keep the auth trigger helper outside the exposed public API schema.
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
DROP FUNCTION IF EXISTS public.assign_bool_founder_admin();
