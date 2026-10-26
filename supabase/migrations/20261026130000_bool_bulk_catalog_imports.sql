-- Bool bulk catalogue import staging and review.
create table if not exists public.bool_catalog_imports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references public.bool_providers(id) on delete set null,
  source_filename text not null,
  source_file_path text,
  source_file_type text not null default 'text/csv',
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected')),
  reviewer_id uuid references auth.users(id) on delete set null,
  review_note text not null default '',
  item_count integer not null default 0 check (item_count >= 0),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists public.bool_catalog_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.bool_catalog_imports(id) on delete cascade,
  row_number integer not null,
  product_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now(),
  unique(import_id,row_number)
);
alter table public.bool_catalog_imports enable row level security;
alter table public.bool_catalog_import_items enable row level security;
drop policy if exists "catalog imports owner or admin read" on public.bool_catalog_imports;
create policy "catalog imports owner or admin read" on public.bool_catalog_imports for select to authenticated
using (submitted_by = (select auth.uid()) or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "verified dealers can submit catalog imports" on public.bool_catalog_imports;
create policy "verified dealers can submit catalog imports" on public.bool_catalog_imports for insert to authenticated
with check (
 submitted_by=(select auth.uid()) and
 (provider_id is null or exists (
  select 1 from public.bool_providers bp where bp.id=provider_id and bp.user_id=(select auth.uid())
   and bp.provider_type in ('dealer','business') and bp.status='approved'
   and bp.verification_status in ('identity_checked','business_checked','skills_assessed','verified')
 ))
 and (
  exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  or exists (select 1 from public.bool_providers bp where bp.user_id=(select auth.uid()) and bp.provider_type in ('dealer','business') and bp.status='approved' and bp.verification_status in ('identity_checked','business_checked','skills_assessed','verified'))
 )
);
drop policy if exists "catalog import items owner or admin read" on public.bool_catalog_import_items;
create policy "catalog import items owner or admin read" on public.bool_catalog_import_items for select to authenticated
using (exists (select 1 from public.bool_catalog_imports i where i.id=import_id and (i.submitted_by=(select auth.uid()) or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))));
drop policy if exists "catalog import items owner can add to own pending import" on public.bool_catalog_import_items;
create policy "catalog import items owner can add to own pending import" on public.bool_catalog_import_items for insert to authenticated
with check (exists (select 1 from public.bool_catalog_imports i where i.id=import_id and i.submitted_by=(select auth.uid()) and i.status='pending'));
drop policy if exists "catalog imports admin update" on public.bool_catalog_imports;
create policy "catalog imports admin update" on public.bool_catalog_imports for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') and status in ('pending','reviewing'))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "catalog items admin update" on public.bool_catalog_import_items;
create policy "catalog items admin update" on public.bool_catalog_import_items for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create index if not exists bool_catalog_imports_submitted_by_created_idx on public.bool_catalog_imports(submitted_by,created_at desc);
create index if not exists bool_catalog_import_items_import_id_idx on public.bool_catalog_import_items(import_id);
