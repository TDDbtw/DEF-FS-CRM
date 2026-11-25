-- Split payment columns for bucket sales. Safe to run once.
-- Does not change existing rows.

alter table public.bucket_sales
  add column if not exists split_cash numeric,
  add column if not exists split_gpay numeric;

notify pgrst, 'reload schema';
