-- Prefilled DEF bucket sales. Run once in the Supabase SQL editor.
-- Prices stay in the app env. This table only stores sales.

create table if not exists public.bucket_sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  employee text,
  product_id text not null,
  product_name text not null,
  litres numeric,
  qty numeric not null,
  unit_price numeric not null,
  total numeric not null,
  customer_name text,
  phone text,
  vehicle text,
  company text,
  payment text,
  notes text
);

create index if not exists bucket_sales_created_at_idx
  on public.bucket_sales (created_at desc);

alter table public.bucket_sales enable row level security;

grant select, insert, delete on public.bucket_sales to authenticated;

drop policy if exists "bucket_sales_select_auth" on public.bucket_sales;
create policy "bucket_sales_select_auth"
  on public.bucket_sales for select
  to authenticated
  using (true);

drop policy if exists "bucket_sales_insert_auth" on public.bucket_sales;
create policy "bucket_sales_insert_auth"
  on public.bucket_sales for insert
  to authenticated
  with check (true);

drop policy if exists "bucket_sales_delete_auth" on public.bucket_sales;
create policy "bucket_sales_delete_auth"
  on public.bucket_sales for delete
  to authenticated
  using (true);

notify pgrst, 'reload schema';
