CREATE OR REPLACE FUNCTION private.guard_customer_service_request_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT (SELECT private.is_bool_admin()) THEN
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.description IS DISTINCT FROM OLD.description OR NEW.quote_ngn IS DISTINCT FROM OLD.quote_ngn OR NEW.quote_details IS DISTINCT FROM OLD.quote_details OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.preferred_contact IS DISTINCT FROM OLD.preferred_contact OR NEW.completion_confirmed_at IS DISTINCT FROM OLD.completion_confirmed_at THEN
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
 NEW.updated_at=now();
 RETURN NEW;
END;
$$;
