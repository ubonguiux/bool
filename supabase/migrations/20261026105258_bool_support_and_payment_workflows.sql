CREATE TABLE IF NOT EXISTS public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 subject text NOT NULL CHECK (char_length(subject) BETWEEN 4 AND 160),
 category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','service_request','payment','refund','provider_complaint','device_listing','privacy','other')),
 request_reference text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','awaiting_customer','resolved','closed')),
 priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
 assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 resolution_summary text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS support_tickets_customer_idx ON public.support_tickets(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status, priority, created_at DESC);
CREATE TABLE IF NOT EXISTS public.support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 6000),
 staff_only boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages(ticket_id, created_at ASC);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers read own support tickets" ON public.support_tickets;
CREATE POLICY "Customers read own support tickets" ON public.support_tickets FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Customers create own support tickets" ON public.support_tickets;
CREATE POLICY "Customers create own support tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (customer_id = (SELECT auth.uid()) AND status = 'open' AND priority = 'normal' AND assigned_to IS NULL AND resolved_at IS NULL);
DROP POLICY IF EXISTS "Bool admins manage support tickets" ON public.support_tickets;
CREATE POLICY "Bool admins manage support tickets" ON public.support_tickets FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
DROP POLICY IF EXISTS "Customers read public messages on own tickets" ON public.support_messages;
CREATE POLICY "Customers read public messages on own tickets" ON public.support_messages FOR SELECT TO authenticated USING (staff_only = false AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.customer_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Customers reply to own open tickets" ON public.support_messages;
CREATE POLICY "Customers reply to own open tickets" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (author_id = (SELECT auth.uid()) AND staff_only = false AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.customer_id = (SELECT auth.uid()) AND t.status IN ('open','in_progress','awaiting_customer')));
DROP POLICY IF EXISTS "Bool admins manage support messages" ON public.support_messages;
CREATE POLICY "Bool admins manage support messages" ON public.support_messages FOR ALL TO authenticated USING ((SELECT private.is_bool_admin())) WITH CHECK ((SELECT private.is_bool_admin()));
GRANT SELECT, INSERT ON public.support_tickets, public.support_messages TO authenticated;
GRANT UPDATE, DELETE ON public.support_tickets, public.support_messages TO authenticated;
DROP POLICY IF EXISTS "Customers update own pending payment" ON public.service_payments;
CREATE POLICY "Customers update own pending payment" ON public.service_payments FOR UPDATE TO authenticated
 USING (customer_id = (SELECT auth.uid()) AND status IN ('awaiting_transfer','submitted_for_review') AND confirmed_by IS NULL)
 WITH CHECK (customer_id = (SELECT auth.uid()) AND status IN ('awaiting_transfer','submitted_for_review') AND confirmed_by IS NULL);
CREATE OR REPLACE FUNCTION private.guard_customer_payment_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT (SELECT private.is_bool_admin()) THEN
   IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.repair_job_id IS DISTINCT FROM OLD.repair_job_id OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.amount_ngn IS DISTINCT FROM OLD.amount_ngn OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.admin_note_private IS DISTINCT FROM OLD.admin_note_private OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Customers cannot change protected payment fields';
   END IF;
   IF NEW.status NOT IN ('awaiting_transfer','submitted_for_review') THEN RAISE EXCEPTION 'Customers cannot confirm, release, refund, or dispute payments directly'; END IF;
 END IF;
 NEW.updated_at = now(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_customer_payment_update ON public.service_payments;
CREATE TRIGGER guard_customer_payment_update BEFORE UPDATE ON public.service_payments FOR EACH ROW EXECUTE FUNCTION private.guard_customer_payment_update();
DROP POLICY IF EXISTS "Providers manage their own pending profile" ON public.bool_providers;
CREATE POLICY "Providers manage their own pending profile" ON public.bool_providers FOR ALL TO authenticated
 USING (user_id = (SELECT auth.uid()) AND status IN ('pending','rejected'))
 WITH CHECK (user_id = (SELECT auth.uid()) AND status IN ('pending','rejected') AND verification_status IN ('pending','rejected'));
