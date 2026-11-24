-- Adds the discount column to an existing bucket_sales table.
-- Safe to run once. Does not change existing rows: they stay at discount 0.

alter table public.bucket_sales
  add column if not exists discount numeric not null default 0;

notify pgrst, 'reload schema';
