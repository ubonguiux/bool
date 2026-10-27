-- BOOL premium role-based workspaces: dealer POS/inventory, technician jobs,
-- dispatch management, and case-reviewed device-history requests.
create extension if not exists pgcrypto;

create table if not exists public.bool_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  delivery_reference text not null unique default ('BDEL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  order_id uuid references public.bool_orders(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  dispatcher_id uuid references auth.users(id) on delete set null,
  customer_name text not null, customer_phone text not null,
  pickup_name text not null, pickup_phone text, pickup_address text not null,
  delivery_name text not null, delivery_phone text not null, delivery_address text not null,
  item_summary text not null,
  delivery_fee_ngn numeric(12,2) check (delivery_fee_ngn is null or delivery_fee_ngn >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','waived','refunded')),
  status text not null default 'requested' check (status in ('requested','assigned','pickup_en_route','picked_up','in_transit','delivered','failed','cancelled')),
  pickup_proof_url text, delivery_proof_url text, delivery_notes text,
  requested_at timestamptz not null default now(), assigned_at timestamptz,
  picked_up_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bool_delivery_jobs_dispatcher_status_idx on public.bool_delivery_jobs(dispatcher_id,status,created_at desc);
create index if not exists bool_delivery_jobs_customer_idx on public.bool_delivery_jobs(customer_id,created_at desc);
alter table public.bool_delivery_jobs enable row level security;
drop policy if exists "Bool admins manage delivery jobs" on public.bool_delivery_jobs;
create policy "Bool admins manage delivery jobs" on public.bool_delivery_jobs for all to authenticated using (private.is_bool_admin()) with check (private.is_bool_admin());
drop policy if exists "Customers create own delivery requests" on public.bool_delivery_jobs;
create policy "Customers create own delivery requests" on public.bool_delivery_jobs for insert to authenticated with check (customer_id=auth.uid() and dispatcher_id is null and status='requested');
drop policy if exists "Customers read own delivery requests" on public.bool_delivery_jobs;
create policy "Customers read own delivery requests" on public.bool_delivery_jobs for select to authenticated using (customer_id=auth.uid());
drop policy if exists "Assigned dispatchers read their jobs" on public.bool_delivery_jobs;
create policy "Assigned dispatchers read their jobs" on public.bool_delivery_jobs for select to authenticated using (dispatcher_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dispatcher'));
drop policy if exists "Assigned dispatchers update their jobs" on public.bool_delivery_jobs;
create policy "Assigned dispatchers update their jobs" on public.bool_delivery_jobs for update to authenticated using (dispatcher_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dispatcher')) with check (dispatcher_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dispatcher'));

create table if not exists public.bool_technician_jobs (
  id uuid primary key default gen_random_uuid(),
  job_reference text not null unique default ('BTECH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  service_request_id uuid references public.provider_service_requests(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  technician_id uuid references auth.users(id) on delete set null,
  title text not null, device_model text, issue_description text not null,
  customer_phone text, service_address text, appointment_at timestamptz,
  quoted_amount_ngn numeric(12,2) check (quoted_amount_ngn is null or quoted_amount_ngn >= 0),
  status text not null default 'requested' check (status in ('requested','assigned','accepted','diagnosing','awaiting_approval','in_progress','ready_for_collection','completed','cancelled')),
  technician_notes text, customer_visible_update text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bool_technician_jobs_assigned_idx on public.bool_technician_jobs(technician_id,status,created_at desc);
alter table public.bool_technician_jobs enable row level security;
drop policy if exists "Bool admins manage technician jobs" on public.bool_technician_jobs;
create policy "Bool admins manage technician jobs" on public.bool_technician_jobs for all to authenticated using (private.is_bool_admin()) with check (private.is_bool_admin());
drop policy if exists "Customers create technician service requests" on public.bool_technician_jobs;
create policy "Customers create technician service requests" on public.bool_technician_jobs for insert to authenticated with check (customer_id=auth.uid() and technician_id is null and status='requested');
drop policy if exists "Customers read own technician jobs" on public.bool_technician_jobs;
create policy "Customers read own technician jobs" on public.bool_technician_jobs for select to authenticated using (customer_id=auth.uid());
drop policy if exists "Assigned technicians read own jobs" on public.bool_technician_jobs;
create policy "Assigned technicians read own jobs" on public.bool_technician_jobs for select to authenticated using (technician_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='technician'));
drop policy if exists "Assigned technicians update own jobs" on public.bool_technician_jobs;
create policy "Assigned technicians update own jobs" on public.bool_technician_jobs for update to authenticated using (technician_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='technician')) with check (technician_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='technician'));

create table if not exists public.bool_pos_sales (
  id uuid primary key default gen_random_uuid(),
  sale_reference text not null unique default ('BPOS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  dealer_id uuid not null references auth.users(id) on delete restrict,
  inventory_id uuid,
  customer_name text, customer_phone text,
  device_brand text not null, device_model text not null,
  device_condition text not null default 'used' check (device_condition in ('new','used','refurbished')),
  imei_last4 text check (imei_last4 is null or imei_last4 ~ '^[0-9]{4}$'),
  imei_fingerprint text, serial_last4 text,
  quantity integer not null default 1 check (quantity between 1 and 999),
  unit_price_ngn numeric(12,2) not null check (unit_price_ngn >= 0),
  total_ngn numeric(12,2) generated always as (quantity * unit_price_ngn) stored,
  payment_method text not null default 'other' check (payment_method in ('cash','transfer','pos','other')),
  receipt_note text, sold_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists bool_pos_sales_dealer_idx on public.bool_pos_sales(dealer_id,sold_at desc);
create index if not exists bool_pos_sales_imei_fingerprint_idx on public.bool_pos_sales(imei_fingerprint) where imei_fingerprint is not null;
alter table public.bool_pos_sales enable row level security;
drop policy if exists "Dealers manage their own POS sales" on public.bool_pos_sales;
drop policy if exists "Dealers read their own POS sales" on public.bool_pos_sales;
drop policy if exists "Dealers insert their own POS sales" on public.bool_pos_sales;
create policy "Dealers read their own POS sales" on public.bool_pos_sales for select to authenticated using (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer'));
create policy "Dealers insert their own POS sales" on public.bool_pos_sales for insert to authenticated with check (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer'));
drop policy if exists "Bool admins read POS sales" on public.bool_pos_sales;
create policy "Bool admins read POS sales" on public.bool_pos_sales for select to authenticated using (private.is_bool_admin());

create table if not exists public.bool_dealer_inventory (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete restrict,
  sku text not null, device_brand text not null, device_model text not null,
  device_condition text not null default 'used' check (device_condition in ('new','used','refurbished')),
  unit_price_ngn numeric(12,2) not null check (unit_price_ngn >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reorder_level integer not null default 2 check (reorder_level >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(dealer_id,sku)
);
alter table public.bool_pos_sales add column if not exists inventory_id uuid;
do $ begin\n if not exists(select 1 from pg_constraint where conname='bool_pos_sales_inventory_id_fkey') then\n  alter table public.bool_pos_sales add constraint bool_pos_sales_inventory_id_fkey foreign key (inventory_id) references public.bool_dealer_inventory(id) on delete set null;\n end if;\nend $;\nalter table public.bool_dealer_inventory enable row level security;
drop policy if exists "Dealers manage their own inventory" on public.bool_dealer_inventory;
create policy "Dealers manage their own inventory" on public.bool_dealer_inventory for all to authenticated using (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer')) with check (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer'));
drop policy if exists "Bool admins read dealer inventory" on public.bool_dealer_inventory;
create policy "Bool admins read dealer inventory" on public.bool_dealer_inventory for select to authenticated using (private.is_bool_admin());

create or replace function public.bool_decrement_inventory_for_sale()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.bool_dealer_inventory%rowtype;
begin
  if new.inventory_id is null then return new; end if;
  select * into item from public.bool_dealer_inventory where id=new.inventory_id and dealer_id=new.dealer_id for update;
  if not found then raise exception 'Inventory item not found for this dealer'; end if;
  if item.stock_quantity < new.quantity then raise exception 'Not enough stock to complete this sale'; end if;
  new.device_brand:=item.device_brand; new.device_model:=item.device_model;
  new.device_condition:=item.device_condition; new.unit_price_ngn:=item.unit_price_ngn;
  update public.bool_dealer_inventory set stock_quantity=stock_quantity-new.quantity,updated_at=now() where id=item.id;
  return new;
end;
$$;
drop trigger if exists bool_pos_decrement_inventory on public.bool_pos_sales;
create trigger bool_pos_decrement_inventory before insert on public.bool_pos_sales for each row execute function public.bool_decrement_inventory_for_sale();

create table if not exists public.bool_device_transaction_history (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.bool_pos_sales(id) on delete set null,
  dealer_id uuid not null references auth.users(id) on delete restrict,
  device_brand text not null, device_model text not null, device_condition text not null,
  imei_last4 text check (imei_last4 is null or imei_last4 ~ '^[0-9]{4}$'),
  imei_fingerprint text, seller_business_name text, buyer_name text, buyer_phone text,
  sale_reference text not null, sold_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists bool_device_history_fingerprint_idx on public.bool_device_transaction_history(imei_fingerprint) where imei_fingerprint is not null;
create index if not exists bool_device_history_sale_reference_idx on public.bool_device_transaction_history(sale_reference);
alter table public.bool_device_transaction_history enable row level security;
drop policy if exists "Dealers read own transaction history" on public.bool_device_transaction_history;
create policy "Dealers read own transaction history" on public.bool_device_transaction_history for select to authenticated using (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer'));
drop policy if exists "Dealers record own POS transaction history" on public.bool_device_transaction_history;
create policy "Dealers record own POS transaction history" on public.bool_device_transaction_history for insert to authenticated with check (dealer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='dealer') and (sale_id is null or exists(select 1 from public.bool_pos_sales s where s.id=sale_id and s.dealer_id=auth.uid())));
drop policy if exists "Bool admins manage device transaction history" on public.bool_device_transaction_history;
create policy "Bool admins manage device transaction history" on public.bool_device_transaction_history for all to authenticated using (private.is_bool_admin()) with check (private.is_bool_admin());

create table if not exists public.bool_device_trace_requests (
  id uuid primary key default gen_random_uuid(),
  request_reference text not null unique default ('BTRACE-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  requested_by uuid not null references auth.users(id) on delete restrict,
  agency_name text not null, officer_name text not null, official_email text not null,
  case_reference text not null, legal_basis text not null,
  device_imei_last4 text check (device_imei_last4 is null or device_imei_last4 ~ '^[0-9]{4}$'),
  imei_fingerprint text,
  status text not null default 'pending_review' check (status in ('pending_review','approved','declined','completed')),
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  result_summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.bool_device_trace_requests add column if not exists updated_at timestamptz not null default now();
alter table public.bool_device_trace_requests enable row level security;
drop policy if exists "Law enforcement submit trace requests" on public.bool_device_trace_requests;
create policy "Law enforcement submit trace requests" on public.bool_device_trace_requests for insert to authenticated with check (requested_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='law_enforcement'));
drop policy if exists "Requesters read own trace requests" on public.bool_device_trace_requests;
create policy "Requesters read own trace requests" on public.bool_device_trace_requests for select to authenticated using (requested_by=auth.uid());
drop policy if exists "Bool admins review trace requests" on public.bool_device_trace_requests;
create policy "Bool admins review trace requests" on public.bool_device_trace_requests for all to authenticated using (private.is_bool_admin()) with check (private.is_bool_admin());

create or replace function public.bool_prevent_self_role_change()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if new.role is distinct from old.role and not private.is_bool_admin() then
    raise exception 'Only an authorised Bool administrator may change account roles';
  end if;
  return new;
end;
$$;
drop trigger if exists bool_protect_profile_role on public.profiles;
create trigger bool_protect_profile_role before update of role on public.profiles for each row execute function public.bool_prevent_self_role_change();

alter table public.bool_delivery_jobs replica identity full;
alter table public.bool_technician_jobs replica identity full;
alter table public.bool_pos_sales replica identity full;
alter table public.bool_dealer_inventory replica identity full;
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bool_delivery_jobs') then alter publication supabase_realtime add table public.bool_delivery_jobs; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bool_technician_jobs') then alter publication supabase_realtime add table public.bool_technician_jobs; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bool_dealer_inventory') then alter publication supabase_realtime add table public.bool_dealer_inventory; end if;
end $$;

drop policy if exists "Public can read safe Bool branding settings" on public.cms_settings;
create policy "Public can read safe Bool branding settings" on public.cms_settings for select to anon,authenticated using (key in ('brand_logo_url','hero_banners'));

insert into public.bool_partners(name,description,logo_url,website_url,partner_type,status,sort_order)
select v.name,v.description,'',v.website_url,v.partner_type,'published',v.sort_order from (values
('Akwa Ibom State Phone Dealers & Technician Association (AKPTTA)','Industry association supporting mobile phone dealers and technicians in Akwa Ibom State','','association',10),
('Akwa Ibom State Ministry of Science & Digital Economy','State ministry advancing science, technology and digital development','','government',20),
('Phone Doctor','Mobile phone diagnostics, repairs and technical services','','service_partner',30)
) as v(name,description,website_url,partner_type,sort_order)
where not exists(select 1 from public.bool_partners p where lower(p.name)=lower(v.name));

insert into public.cms_settings(key,value,description) values
('brand_logo_url','""'::jsonb,'Public brand logo image URL. Admin can replace this from CMS.'),
('hero_banners','[]'::jsonb,'Audience-specific home hero banner copy and image URLs managed by admin.')
on conflict(key) do nothing;
