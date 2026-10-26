CREATE OR REPLACE FUNCTION private.guard_customer_service_request_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF (SELECT private.is_bool_admin()) THEN
   IF NEW.quote_ngn IS DISTINCT FROM OLD.quote_ngn OR NEW.quote_details IS DISTINCT FROM OLD.quote_details THEN
     IF EXISTS (SELECT 1 FROM public.service_payments p WHERE p.service_request_id=OLD.id AND p.status NOT IN ('refunded','cancelled')) THEN
       RAISE EXCEPTION 'A quote cannot be changed after a payment record exists';
     END IF;
   END IF;
   IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
     (OLD.status='requested' AND NEW.status IN ('reviewing','quoted','cancelled')) OR
     (OLD.status='reviewing' AND NEW.status IN ('quoted','cancelled')) OR
     (OLD.status='quoted' AND NEW.status='cancelled') OR
     (OLD.status='customer_approved' AND NEW.status IN ('in_progress','cancelled','disputed')) OR
     (OLD.status='in_progress' AND NEW.status IN ('waiting_parts','completed','cancelled','disputed')) OR
     (OLD.status='waiting_parts' AND NEW.status IN ('in_progress','completed','cancelled','disputed')) OR
     (OLD.status='completed' AND NEW.status='disputed') OR
     (OLD.status='disputed' AND NEW.status IN ('completed','cancelled'))
   ) THEN RAISE EXCEPTION 'This service request status transition is not allowed'; END IF;
   IF NEW.status IN ('in_progress','waiting_parts','completed') AND NEW.status IS DISTINCT FROM OLD.status THEN
     IF NOT EXISTS (SELECT 1 FROM public.service_payments p WHERE p.service_request_id=NEW.id AND p.status IN ('confirmed','allocated_to_provider')) THEN
       RAISE EXCEPTION 'A confirmed payment is required before work can progress';
     END IF;
   END IF;
 ELSE
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.description IS DISTINCT FROM OLD.description OR NEW.quote_ngn IS DISTINCT FROM OLD.quote_ngn OR NEW.quote_details IS DISTINCT FROM OLD.quote_details OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.preferred_contact IS DISTINCT FROM OLD.preferred_contact OR NEW.completion_confirmed_at IS DISTINCT FROM OLD.completion_confirmed_at THEN
     RAISE EXCEPTION 'Customers cannot change provider requests or quotes';
   END IF;
   IF OLD.status='quoted' AND NEW.status='customer_approved' THEN
     NEW.customer_approved_at=now(); NEW.customer_accepted_at=OLD.customer_accepted_at;
   ELSIF OLD.status='completed' AND NEW.status='completed' THEN
     NEW.customer_accepted_at=now();
   ELSE RAISE EXCEPTION 'Customers can only accept a quote or confirm completion'; END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END;
$$;
