alter table if exists public.billing_checkout_sessions
  add column if not exists provider_checkout_url text;
