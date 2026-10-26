CREATE OR REPLACE FUNCTION private.guard_service_payment_transitions()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE req record;
BEGIN
 IF (SELECT private.is_bool_admin()) THEN
   IF NEW.status='confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
     IF NOT ((OLD.status='submitted_for_review' AND length(trim(NEW.transfer_reference))>0) OR (OLD.status='disputed' AND length(trim(NEW.transfer_reference))>0 AND NOT EXISTS (SELECT 1 FROM public.service_disputes d WHERE d.payment_id=NEW.id AND d.status NOT IN ('resolved','rejected')))) THEN
       RAISE EXCEPTION 'A submitted transfer must be verified and any dispute resolved before confirmation';
     END IF;
     NEW.confirmed_by=(SELECT auth.uid()); NEW.confirmed_at=now();
   ELSIF NEW.status='disputed' AND OLD.status IS DISTINCT FROM 'disputed' THEN
     IF NOT EXISTS (SELECT 1 FROM public.service_disputes d WHERE d.payment_id=NEW.id AND d.status NOT IN ('resolved','rejected')) THEN RAISE EXCEPTION 'An unresolved customer dispute is required'; END IF;
   ELSIF NEW.status='refund_requested' AND OLD.status IS DISTINCT FROM 'refund_requested' THEN
     IF OLD.status NOT IN ('confirmed','disputed','allocated_to_provider') THEN RAISE EXCEPTION 'Refund requests require a confirmed, disputed, or paid-out transaction'; END IF;
   ELSIF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
     IF OLD.status NOT IN ('awaiting_transfer','submitted_for_review') THEN RAISE EXCEPTION 'Only unpaid or unconfirmed payment records can be cancelled'; END IF;
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
END;
$$;
