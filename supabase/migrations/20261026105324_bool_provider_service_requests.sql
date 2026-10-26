CREATE TABLE IF NOT EXISTS public.provider_service_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 provider_id uuid NOT NULL REFERENCES public.bool_providers(id) ON DELETE RESTRICT,
 subject text NOT NULL CHECK (char_length(subject) BETWEEN 4 AND 160),
 description text NOT NULL CHECK (char_length(description) BETWEEN 8 AND 6000),
 preferred_contact text NOT NULL DEFAULT 'bool_messages' CHECK (preferred_contact IN ('bool_messages','phone')),
 status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','reviewing','quoted','customer_approved','in_progress','waiting_parts','completed','cancelled','disputed')),
 quote_ngn numeric(14,2) CHECK (quote_ngn IS NULL OR quote_ngn >= 0),
 quote_details text NOT NULL DEFAULT '',
 customer_approved_at timestamptz,
 completion_confirmed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_service_requests_customer_idx ON public.provider_service_requests(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS provider_service_requests_provider_idx ON public.provider_service_requests(provider_id,status,created_at DESC);
ALTER TABLE public.provider_service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers read own provider service requests" ON public.provider_service_requests;
CREATE POLICY "Customers read own provider service requests" ON public.provider_service_requests FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "Customers create requests to approved providers" ON public.provider_service_requests;
CREATE POLICY "Customers create requests to approved providers" ON public.provider_service_requests FOR INSERT TO authenticated WITH CHECK (
 customer_id=(SELECT auth.uid()) AND status='requested' AND quote_ngn IS NULL AND customer_approved_at IS NULL
 AND EXISTS (SELECT 1 FROM public.bool_providers p WHERE p.id=provider_id AND p.status='approved' AND p.verification_status IN ('identity_checked','business_checked','skills_assessed','verified'))
);
DROP POLICY IF EXISTS "Bool admins manage provider service requests" ON public.provider_service_requests;
CREATE POLICY "Bool admins manage provider service requests" ON public.provider_service_requests FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
GRANT SELECT, INSERT ON public.provider_service_requests TO authenticated;
GRANT UPDATE, DELETE ON public.provider_service_requests TO authenticated;
ALTER TABLE public.service_payments ADD COLUMN IF NOT EXISTS service_request_id uuid REFERENCES public.provider_service_requests(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS service_payments_service_request_idx ON public.service_payments(service_request_id);
