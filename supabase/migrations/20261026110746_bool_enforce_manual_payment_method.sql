DROP POLICY IF EXISTS "Customers create awaiting service payments" ON public.service_payments;
CREATE POLICY "Customers create awaiting service payments" ON public.service_payments FOR INSERT TO authenticated WITH CHECK (
 customer_id=(SELECT auth.uid()) AND status='awaiting_transfer' AND payment_method='bank_transfer'
 AND confirmed_by IS NULL AND confirmed_at IS NULL AND transfer_reference=''
 AND ((service_request_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.provider_service_requests r WHERE r.id=service_request_id AND r.customer_id=(SELECT auth.uid()) AND r.status='customer_approved' AND r.quote_ngn=amount_ngn AND r.provider_id=service_payments.provider_id))
 OR (service_request_id IS NULL AND repair_job_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.repair_jobs j WHERE j.id=repair_job_id AND j.customer_id=(SELECT auth.uid()) AND j.quote_ngn=amount_ngn AND j.status IN ('quoted','approved'))))
);
