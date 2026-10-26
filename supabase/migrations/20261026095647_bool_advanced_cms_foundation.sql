CREATE TABLE IF NOT EXISTS public.cms_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL, slug text NOT NULL UNIQUE, excerpt text NOT NULL DEFAULT '',
 body_markdown text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'General',
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 featured boolean NOT NULL DEFAULT false, seo_title text NOT NULL DEFAULT '', seo_description text NOT NULL DEFAULT '',
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cms_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, message text NOT NULL DEFAULT '',
 audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','technicians','dealers')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 starts_at timestamptz, ends_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cms_settings (
 key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}'::jsonb, description text NOT NULL DEFAULT '',
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL, resource_type text NOT NULL, resource_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_pages_status_updated_idx ON public.cms_pages(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS cms_announcements_status_idx ON public.cms_announcements(status, starts_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON public.admin_audit_logs(created_at DESC);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published CMS pages are public" ON public.cms_pages FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Bool admins manage CMS pages" ON public.cms_pages FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
CREATE POLICY "Published CMS announcements are public" ON public.cms_announcements FOR SELECT TO anon, authenticated USING (status = 'published' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "Bool admins manage CMS announcements" ON public.cms_announcements FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
CREATE POLICY "Bool admins manage CMS settings" ON public.cms_settings FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
CREATE POLICY "Bool admins read audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING ((SELECT private.is_bool_admin()));
GRANT SELECT ON public.cms_pages, public.cms_announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.cms_pages, public.cms_announcements, public.cms_settings TO authenticated;
GRANT SELECT ON public.cms_settings TO authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;