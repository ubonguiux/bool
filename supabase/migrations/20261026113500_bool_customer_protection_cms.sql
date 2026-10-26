-- Bool customer-first marketplace foundation
-- RealTreats Technologies owns platform operations. Payments are not automatically escrow until
-- an approved payment/release arrangement and applicable legal review are in place.

CREATE TABLE IF NOT EXISTS public.bool_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'phone',
  price_ngn numeric(14,2) NOT NULL DEFAULT 0 CHECK (price_ngn >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  condition text NOT NULL DEFAULT 'new' CHECK (condition IN ('new','used','refurbished')),
  description text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  seller_name text NOT NULL DEFAULT '',
  stock_status text NOT NULL DEFAULT 'available' CHECK (stock_status IN ('available','limited','out_of_stock','coming_soon')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bool_devices_published_idx ON public.bool_devices(status, featured, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bool_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_title text NOT NULL DEFAULT '',
  quote text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  related_service text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured boolean NOT NULL DEFAULT false,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bool_testimonials_published_idx ON public.bool_testimonials(status, featured, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bool_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  partner_type text NOT NULL DEFAULT 'partner',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bool_partners_published_idx ON public.bool_partners(status, sort_order);

CREATE TABLE IF NOT EXISTS public.bool_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('technician','business','dealer','repair_shop')),
  public_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text NOT NULL DEFAULT '',
  service_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_public text NOT NULL DEFAULT '',
  business_address text NOT NULL DEFAULT '',
  portfolio_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','identity_checked','business_checked','skills_assessed','verified','rejected','suspended')),
  verification_notes_private text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  rating_average numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_average BETWEEN 0 AND 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bool_providers_public_idx ON public.bool_providers(status, verification_status, provider_type);

CREATE TABLE IF NOT EXISTS public.service_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  repair_job_id uuid REFERENCES public.repair_jobs(id) ON DELETE RESTRICT,
  provider_id uuid REFERENCES public.bool_providers(id) ON DELETE SET NULL,
  amount_ngn numeric(14,2) NOT NULL CHECK (amount_ngn > 0),
  payment_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer','paystack')),
  transfer_reference text NOT NULL DEFAULT '',
  proof_image_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'awaiting_transfer' CHECK (status IN ('awaiting_transfer','submitted_for_review','confirmed','allocated_to_provider','refund_requested','refunded','disputed','cancelled')),
  customer_note text NOT NULL DEFAULT '',
  admin_note_private text NOT NULL DEFAULT '',
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_payments_customer_idx ON public.service_payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_payments_status_idx ON public.service_payments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.service_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.service_payments(id) ON DELETE SET NULL,
  repair_job_id uuid REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_id uuid REFERENCES public.bool_providers(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  requested_resolution text NOT NULL DEFAULT 'review',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','awaiting_customer','awaiting_provider','resolved','rejected')),
  resolution_summary text NOT NULL DEFAULT '',
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_disputes_customer_idx ON public.service_disputes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_disputes_status_idx ON public.service_disputes(status, created_at DESC);

ALTER TABLE public.bool_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bool_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bool_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bool_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published Bool devices are public" ON public.bool_devices;
CREATE POLICY "Published Bool devices are public" ON public.bool_devices FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "Bool admins manage devices" ON public.bool_devices;
CREATE POLICY "Bool admins manage devices" ON public.bool_devices FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Published Bool testimonials are public" ON public.bool_testimonials;
CREATE POLICY "Published Bool testimonials are public" ON public.bool_testimonials FOR SELECT TO anon, authenticated USING (status = 'published' AND consent_confirmed = true);
DROP POLICY IF EXISTS "Bool admins manage testimonials" ON public.bool_testimonials;
CREATE POLICY "Bool admins manage testimonials" ON public.bool_testimonials FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Published Bool partners are public" ON public.bool_partners;
CREATE POLICY "Published Bool partners are public" ON public.bool_partners FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "Bool admins manage partners" ON public.bool_partners;
CREATE POLICY "Bool admins manage partners" ON public.bool_partners FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Approved Bool providers are public" ON public.bool_providers;
CREATE POLICY "Approved Bool providers are public" ON public.bool_providers FOR SELECT TO anon, authenticated USING (status = 'approved');
DROP POLICY IF EXISTS "Bool admins manage providers" ON public.bool_providers;
CREATE POLICY "Bool admins manage providers" ON public.bool_providers FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Providers manage their own pending profile" ON public.bool_providers;
CREATE POLICY "Providers manage their own pending profile" ON public.bool_providers FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()) AND status IN ('pending','rejected')) WITH CHECK (user_id = (SELECT auth.uid()) AND status IN ('pending','rejected'));

DROP POLICY IF EXISTS "Customers read their own service payments" ON public.service_payments;
CREATE POLICY "Customers read their own service payments" ON public.service_payments FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Customers create awaiting service payments" ON public.service_payments;
CREATE POLICY "Customers create awaiting service payments" ON public.service_payments FOR INSERT TO authenticated WITH CHECK (customer_id = (SELECT auth.uid()) AND status = 'awaiting_transfer' AND confirmed_by IS NULL AND confirmed_at IS NULL);
DROP POLICY IF EXISTS "Bool admins manage service payments" ON public.service_payments;
CREATE POLICY "Bool admins manage service payments" ON public.service_payments FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

DROP POLICY IF EXISTS "Customers read their own disputes" ON public.service_disputes;
CREATE POLICY "Customers read their own disputes" ON public.service_disputes FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Customers create their own disputes" ON public.service_disputes;
CREATE POLICY "Customers create their own disputes" ON public.service_disputes FOR INSERT TO authenticated WITH CHECK (customer_id = (SELECT auth.uid()) AND status = 'open');
DROP POLICY IF EXISTS "Bool admins manage disputes" ON public.service_disputes;
CREATE POLICY "Bool admins manage disputes" ON public.service_disputes FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));

GRANT SELECT ON public.bool_devices, public.bool_testimonials, public.bool_partners, public.bool_providers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.bool_devices, public.bool_testimonials, public.bool_partners, public.bool_providers TO authenticated;
GRANT SELECT, INSERT ON public.service_payments, public.service_disputes TO authenticated;
GRANT UPDATE, DELETE ON public.service_payments, public.service_disputes TO authenticated;

-- The bank-transfer details are public payment instructions, not proof of payment or an escrow guarantee.
INSERT INTO public.cms_settings (key, value, description)
VALUES
  ('payment_instructions', '{"bank":"Moniepoint MFB","account_number":"6263388058","account_name":"RealTreats Technologies","method":"bank_transfer","paystack_enabled":false,"customer_notice":"Use your Bool request/reference as the transfer narration. Upload proof only through your signed-in Bool account. A transfer is not confirmed until RealTreats Technologies verifies it."}'::jsonb, 'Customer payment instructions. Enable Paystack only after the integration is configured and tested.'),
  ('platform_promise', '{"headline":"Find trusted technology services. Pay with confidence.","support_owner":"RealTreats Technologies","customer_first":true,"provider_verification_required":true}'::jsonb, 'Customer-first platform promise and service ownership.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.cms_pages (title, slug, excerpt, body_markdown, category, status, featured, seo_title, seo_description)
VALUES
('Terms and Conditions', 'terms-and-conditions', 'The rules for using Bool, requesting services, making payments, and raising complaints.', 'DRAFT FOR LEGAL REVIEW — Do not treat this template as legal advice or publish it as final until reviewed for Nigerian law and the actual payment workflow.

# 1. About Bool
Bool is operated by RealTreats Technologies. Bool helps customers discover approved technology service providers, request services, browse device listings, and contact RealTreats Technologies for support.

# 2. Provider approval and verification
Providers must submit information requested by Bool and remain subject to review, moderation, suspension, or removal. A verification label will describe only checks actually completed. Approval is not a guarantee that every future service or product will be defect-free.

# 3. Service requests and quotes
A request is not a confirmed booking until Bool or RealTreats Technologies confirms it. Customers should review the scope, quote, estimated timeline, parts, warranty, and any exclusions before approving work.

# 4. Payments
The currently listed manual transfer account is Moniepoint MFB, account number 6263388058, account name RealTreats Technologies. Customers should pay only against a Bool request/reference and submit proof through an approved Bool channel. Payment is not confirmed until RealTreats Technologies verifies receipt. Paystack is not available until explicitly enabled on Bool.

# 5. Managed payments and funds
Do not describe a payment as escrow or promise automatic release, safeguarding, or refund unless the relevant payment arrangement, operational process, and legal requirements have been implemented. The final terms must explain when funds are held, when a provider is paid, when a refund may be due, the timeline for decisions, and how disputed funds are handled.

# 6. Cancellations, refunds and complaints
Customers may contact RealTreats Technologies to report service problems, request cancellation, or ask for a review. Final rules must specify eligible grounds, evidence, timelines, deductions, repair-part exceptions, and the complaint escalation process before launch.

# 7. Device listings and descriptions
Prices, specifications, condition, availability, images, warranties, and seller identity should be accurate and updated. Images must not misrepresent the item. Customers should confirm final price and condition before payment.

# 8. Reviews and testimonials
Reviews must reflect genuine experiences. Bool may moderate content for relevance, abuse, privacy, and authenticity. Customer testimonials and photos should be displayed only with appropriate permission.

# 9. Acceptable use
Users must provide accurate information, avoid fraud, harassment, unlawful listings, impersonation, and misuse of other users' information. Bool may restrict accounts or listings to protect customers and the platform.

# 10. Privacy and contact
Personal information should be handled under the Bool Privacy Policy. Contact RealTreats Technologies through the official support contact displayed on Bool to ask questions or raise complaints.

# 11. Final legal review required
Before publication, add the verified business contact details, service levels, refund deadlines, dispute process, provider payout rules, applicable law and jurisdiction, and any required regulatory disclosures.', 'Legal', 'draft', false, 'Bool Terms and Conditions', 'Draft terms for Bool technology services, marketplace listings and managed payments.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cms_pages (title, slug, excerpt, body_markdown, category, status, featured, seo_title, seo_description)
VALUES
('Privacy Policy', 'privacy-policy', 'How Bool should collect, use, protect, retain, and share personal information.', 'DRAFT FOR LEGAL REVIEW — This is a working template. Confirm actual data flows, retention periods, vendors, and applicable Nigerian privacy requirements before publication.

# 1. Who operates Bool
Bool is operated by RealTreats Technologies. This policy should be completed with the official privacy contact and effective date before publication.

# 2. Information we may collect
Depending on the features used, Bool may process account details, contact information, service requests, device and listing information, messages sent to support, payment references and receipts, complaint evidence, ratings, and technical logs. Do not submit passwords, one-time passcodes, or unnecessary sensitive information in a support message.

# 3. How information is used
Information may be used to provide accounts, connect customers with approved providers, coordinate service requests, verify payment receipts, investigate complaints, prevent fraud, moderate listings, improve the platform, and meet legal obligations.

# 4. Sharing
Information should be shared only where needed to operate the requested service, process a payment, investigate a dispute, protect users, or comply with law. Provider-facing information should be limited to what is needed to fulfil the request. Bool should not publish private verification notes, payment proofs, or complaint records.

# 5. Payments
Manual bank transfers are currently listed to RealTreats Technologies. Payment evidence and references should be accessible only to the customer and authorised staff who need them. Paystack is not enabled until a future integration is configured. The final policy must describe the actual payment processor and its data handling once integrated.

# 6. Storage, security and retention
Bool should use access controls, secure transport, least-privilege permissions, and reasonable safeguards. Define retention periods for accounts, receipts, disputes, verification records, and audit logs before launch. No internet service can guarantee absolute security.

# 7. Your choices and requests
Users should be given a clear channel to request access, correction, deletion where applicable, account closure, or answers about their personal information, subject to lawful retention and dispute-handling requirements.

# 8. Cookies and analytics
List any cookies, analytics, advertising pixels, or tracking tools actually enabled on Bool. Do not claim that none are used until the production configuration has been checked.

# 9. Children
Bool should define the minimum age for account creation and the process for handling information submitted by children in accordance with applicable law.

# 10. Changes and contact
State the effective date and notify users of material changes. Add the official privacy contact and confirm applicable Nigerian data-protection requirements before publishing this policy.', 'Legal', 'draft', false, 'Bool Privacy Policy', 'Draft privacy policy for Bool accounts, service requests, payments and customer support.')
ON CONFLICT (slug) DO NOTHING;

