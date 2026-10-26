-- Harden customer payment/dispute ownership and separate private payment notes.
DROP POLICY IF EXISTS "Customers create awaiting service payments" ON public.service_payments;
CREATE POLICY "Customers create awaiting service payments" ON public.service_payments
 FOR INSERT TO authenticated WITH CHECK (
  customer_id=(SELECT auth.uid()) AND status='awaiting_transfer' AND confirmed_by IS NULL AND confirmed_at IS NULL
  AND transfer_reference=''
  AND (
    (service_request_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.provider_service_requests r WHERE r.id=service_request_id AND r.customer_id=(SELECT auth.uid()) AND r.status='customer_approved' AND r.quote_ngn=amount_ngn AND r.provider_id=service_payments.provider_id))
    OR
    (service_request_id IS NULL AND repair_job_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.repair_jobs j WHERE j.id=repair_job_id AND j.customer_id=(SELECT auth.uid()) AND j.quote_ngn=amount_ngn AND j.status IN ('quoted','approved')))
  )
);
DROP POLICY IF EXISTS "Customers create their own disputes" ON public.service_disputes;
CREATE POLICY "Customers create their own disputes" ON public.service_disputes
 FOR INSERT TO authenticated WITH CHECK (
  customer_id=(SELECT auth.uid()) AND status='open' AND payment_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.service_payments p WHERE p.id=payment_id AND p.customer_id=(SELECT auth.uid()))
  AND (repair_job_id IS NULL OR EXISTS (SELECT 1 FROM public.repair_jobs j WHERE j.id=repair_job_id AND j.customer_id=(SELECT auth.uid())))
);
CREATE TABLE IF NOT EXISTS public.service_payment_private_notes (
 payment_id uuid PRIMARY KEY REFERENCES public.service_payments(id) ON DELETE CASCADE,
 notes text NOT NULL DEFAULT '',
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_payment_private_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bool admins manage private payment notes" ON public.service_payment_private_notes;
CREATE POLICY "Bool admins manage private payment notes" ON public.service_payment_private_notes FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_payment_private_notes TO authenticated;
CREATE OR REPLACE FUNCTION private.guard_service_payment_transitions()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE req record;
BEGIN
 IF (SELECT private.is_bool_admin()) THEN
   IF NEW.status='confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
     IF OLD.status <> 'submitted_for_review' OR length(trim(NEW.transfer_reference))=0 THEN RAISE EXCEPTION 'Only a submitted transfer with a reference can be confirmed'; END IF;
     NEW.confirmed_by=(SELECT auth.uid()); NEW.confirmed_at=now();
   ELSIF NEW.status='allocated_to_provider' AND OLD.status IS DISTINCT FROM 'allocated_to_provider' THEN
     IF OLD.status <> 'confirmed' THEN RAISE EXCEPTION 'Only confirmed payments can be allocated'; END IF;
     IF NEW.service_request_id IS NOT NULL THEN
       SELECT status, customer_accepted_at INTO req FROM public.provider_service_requests WHERE id=NEW.service_request_id;
       IF req.status IS DISTINCT FROM 'completed' OR req.customer_accepted_at IS NULL THEN RAISE EXCEPTION 'Customer completion confirmation is required before provider payout'; END IF;
     ELSIF NEW.repair_job_id IS NOT NULL THEN
       IF NOT EXISTS (SELECT 1 FROM public.repair_jobs WHERE id=NEW.repair_job_id AND status='completed') THEN RAISE EXCEPTION 'Repair completion is required before provider payout'; END IF;
     ELSE RAISE EXCEPTION 'A service request is required before provider payout'; END IF;
     IF EXISTS (SELECT 1 FROM public.service_disputes WHERE payment_id=NEW.id AND status NOT IN ('resolved','rejected')) THEN RAISE EXCEPTION 'Resolve the dispute before provider payout'; END IF;
   ELSIF NEW.status='refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
     IF OLD.status NOT IN ('refund_requested','disputed') THEN RAISE EXCEPTION 'A refund must be requested or disputed first'; END IF;
     IF EXISTS (SELECT 1 FROM public.service_disputes WHERE payment_id=NEW.id AND status NOT IN ('resolved','rejected')) THEN RAISE EXCEPTION 'Resolve open disputes before marking a refund complete'; END IF;
   END IF;
 ELSE
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.repair_job_id IS DISTINCT FROM OLD.repair_job_id OR NEW.service_request_id IS DISTINCT FROM OLD.service_request_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.amount_ngn IS DISTINCT FROM OLD.amount_ngn OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.proof_image_url IS DISTINCT FROM OLD.proof_image_url THEN RAISE EXCEPTION 'Customers cannot change protected payment fields'; END IF;
   IF OLD.status='submitted_for_review' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.transfer_reference IS DISTINCT FROM OLD.transfer_reference) THEN RAISE EXCEPTION 'Submitted payment references cannot be changed by customers'; END IF;
   IF NEW.status NOT IN ('awaiting_transfer','submitted_for_review') THEN RAISE EXCEPTION 'Customers cannot confirm, release, refund, or dispute payments directly'; END IF;
   IF NEW.status='submitted_for_review' AND length(trim(NEW.transfer_reference))=0 THEN RAISE EXCEPTION 'A bank transfer reference is required for review'; END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_customer_payment_update ON public.service_payments;
DROP TRIGGER IF EXISTS guard_service_payment_transitions ON public.service_payments;
CREATE TRIGGER guard_service_payment_transitions BEFORE UPDATE ON public.service_payments FOR EACH ROW EXECUTE FUNCTION private.guard_service_payment_transitions();
DROP FUNCTION IF EXISTS private.guard_customer_payment_update();
ALTER TABLE public.service_payments DROP COLUMN IF EXISTS admin_note_private;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.service_payments FROM authenticated;
GRANT SELECT (id,customer_id,service_request_id,repair_job_id,provider_id,amount_ngn,payment_method,transfer_reference,proof_image_url,status,customer_note,confirmed_at,created_at,updated_at) ON public.service_payments TO authenticated;
GRANT INSERT (customer_id,service_request_id,repair_job_id,provider_id,amount_ngn,payment_method,status,customer_note) ON public.service_payments TO authenticated;
GRANT UPDATE (transfer_reference,customer_note,status,updated_at) ON public.service_payments TO authenticated;
