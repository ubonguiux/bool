CREATE OR REPLACE FUNCTION private.write_bool_admin_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE actor uuid := auth.uid(); row_id text; action_name text;
BEGIN
 row_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id', to_jsonb(NEW)->>'key', to_jsonb(OLD)->>'key');
 action_name := lower(TG_OP);
 INSERT INTO public.admin_audit_logs(actor_id, action, resource_type, resource_id, details)
 VALUES (actor, action_name, TG_TABLE_NAME, row_id, jsonb_build_object('changed_at', now(), 'table', TG_TABLE_NAME));
 RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION private.write_bool_admin_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cms_pages_audit AFTER INSERT OR UPDATE OR DELETE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION private.write_bool_admin_audit();
CREATE TRIGGER cms_announcements_audit AFTER INSERT OR UPDATE OR DELETE ON public.cms_announcements FOR EACH ROW EXECUTE FUNCTION private.write_bool_admin_audit();
CREATE TRIGGER cms_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.cms_settings FOR EACH ROW EXECUTE FUNCTION private.write_bool_admin_audit();