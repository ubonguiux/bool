CREATE TABLE IF NOT EXISTS public.bool_provider_verification_notes (
  provider_id uuid PRIMARY KEY REFERENCES public.bool_providers(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bool_provider_verification_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bool admins manage private provider verification notes" ON public.bool_provider_verification_notes;
CREATE POLICY "Bool admins manage private provider verification notes" ON public.bool_provider_verification_notes
  FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bool_provider_verification_notes TO authenticated;
ALTER TABLE public.bool_providers DROP COLUMN IF EXISTS verification_notes_private;
DROP POLICY IF EXISTS "Approved Bool providers are public" ON public.bool_providers;
CREATE POLICY "Approved Bool providers are public" ON public.bool_providers FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND verification_status IN ('identity_checked','business_checked','skills_assessed','verified'));
