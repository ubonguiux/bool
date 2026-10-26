ALTER TABLE public.provider_service_requests ADD COLUMN IF NOT EXISTS customer_accepted_at timestamptz;
DROP POLICY IF EXISTS "Customers accept their quoted requests" ON public.provider_service_requests;
CREATE POLICY "Customers accept their quoted requests" ON public.provider_service_requests FOR UPDATE TO authenticated
 USING (customer_id=(SELECT auth.uid()) AND status IN ('quoted','completed'))
 WITH CHECK (customer_id=(SELECT auth.uid()) AND status IN ('customer_approved','completed'));
CREATE OR REPLACE FUNCTION private.guard_customer_service_request_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT (SELECT private.is_bool_admin()) THEN
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.description IS DISTINCT FROM OLD.description OR NEW.quote_ngn IS DISTINCT FROM OLD.quote_ngn OR NEW.quote_details IS DISTINCT FROM OLD.quote_details OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.preferred_contact IS DISTINCT FROM OLD.preferred_contact THEN
     RAISE EXCEPTION 'Customers cannot change provider requests or quotes';
   END IF;
   IF OLD.status='quoted' AND NEW.status='customer_approved' THEN
     NEW.customer_approved_at=now();
     NEW.customer_accepted_at=OLD.customer_accepted_at;
   ELSIF OLD.status='completed' AND NEW.status='completed' THEN
     NEW.customer_accepted_at=now();
   ELSE
     RAISE EXCEPTION 'Customers can only accept a quote or confirm completion';
   END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_customer_service_request_update ON public.provider_service_requests;
CREATE TRIGGER guard_customer_service_request_update BEFORE UPDATE ON public.provider_service_requests FOR EACH ROW EXECUTE FUNCTION private.guard_customer_service_request_update();
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
     IF EXISTS (SELECT 1 FROM public.service_disputes WHERE payment_id=NEW.id AND status='open') THEN RAISE EXCEPTION 'Review open disputes before marking a refund complete'; END IF;
   END IF;
 ELSE
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.repair_job_id IS DISTINCT FROM OLD.repair_job_id OR NEW.service_request_id IS DISTINCT FROM OLD.service_request_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.amount_ngn IS DISTINCT FROM OLD.amount_ngn OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.admin_note_private IS DISTINCT FROM OLD.admin_note_private OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Customers cannot change protected payment fields'; END IF;
   IF NEW.status NOT IN ('awaiting_transfer','submitted_for_review') THEN RAISE EXCEPTION 'Customers cannot confirm, release, refund, or dispute payments directly'; END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_customer_payment_update ON public.service_payments;
DROP TRIGGER IF EXISTS guard_service_payment_transitions ON public.service_payments;
CREATE TRIGGER guard_service_payment_transitions BEFORE UPDATE ON public.service_payments FOR EACH ROW EXECUTE FUNCTION private.guard_service_payment_transitions();
CREATE UNIQUE INDEX IF NOT EXISTS service_payments_one_active_per_service_request ON public.service_payments(service_request_id) WHERE service_request_id IS NOT NULL AND status NOT IN ('refunded','cancelled');
