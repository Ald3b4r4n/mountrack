create table if not exists billing_plans (
  id text primary key,
  code text not null unique,
  name text not null,
  billing_interval text not null,
  amount_cents integer not null,
  currency text not null,
  trial_days integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_roles (
  id text primary key,
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists billing_user_roles (
  user_id text not null,
  role_id text not null references billing_roles(id) on delete cascade,
  granted_by text,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists billing_user_roles_user_idx on billing_user_roles (user_id);

create table if not exists billing_customers (
  id text primary key,
  user_id text not null,
  provider text not null,
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

create index if not exists billing_customers_user_idx on billing_customers (user_id);

create table if not exists billing_subscriptions (
  id text primary key,
  user_id text not null,
  billing_customer_id text references billing_customers(id) on delete set null,
  plan_id text references billing_plans(id) on delete set null,
  provider_subscription_id text,
  status text not null,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_subscription_id)
);

create index if not exists billing_subscriptions_user_idx on billing_subscriptions (user_id, status, current_period_end desc);

create table if not exists billing_payments (
  id text primary key,
  user_id text not null,
  subscription_id text references billing_subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  provider_status text not null,
  internal_status text not null,
  amount_cents integer not null,
  currency text not null,
  paid_at timestamptz,
  raw_reference_id text,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists billing_payments_user_idx on billing_payments (user_id, created_at desc);

create table if not exists billing_checkout_sessions (
  id text primary key,
  user_id text not null,
  plan_id text not null references billing_plans(id) on delete restrict,
  expected_amount_cents integer not null,
  currency text not null,
  nonce text not null unique,
  provider_checkout_id text,
  status text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider_checkout_id)
);

create index if not exists billing_checkout_sessions_user_idx on billing_checkout_sessions (user_id, created_at desc);

create table if not exists billing_entitlements (
  id text primary key,
  user_id text not null,
  source_type text not null,
  source_id text not null,
  status text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_entitlements_user_idx on billing_entitlements (user_id, starts_at desc);

create table if not exists billing_manual_access_grants (
  id text primary key,
  user_id text not null,
  grant_type text not null,
  reason text not null,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  granted_by text not null,
  revoked_by text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_manual_access_grants_user_idx on billing_manual_access_grants (user_id, starts_at desc);

create table if not exists billing_events (
  id text primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  processing_status text not null,
  idempotency_key text,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_provider_status_idx on billing_events (provider, processing_status, created_at desc);

create table if not exists billing_audit_logs (
  id text primary key,
  actor_user_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_audit_logs_actor_idx on billing_audit_logs (actor_user_id, created_at desc);

insert into billing_roles (id, code, description)
values
  ('billing-role:owner', 'owner', 'Full platform control'),
  ('billing-role:admin', 'admin', 'Operational billing control'),
  ('billing-role:finance', 'finance', 'Finance visibility'),
  ('billing-role:support', 'support', 'Support visibility'),
  ('billing-role:user', 'user', 'Standard product access')
on conflict (code) do update set description = excluded.description;

insert into billing_plans (
  id,
  code,
  name,
  billing_interval,
  amount_cents,
  currency,
  trial_days,
  is_active
)
values (
  'billing-plan-pro-monthly',
  'pro_monthly',
  'MounTrack Pro Mensal',
  'monthly',
  1499,
  'BRL',
  3,
  true
)
on conflict (code) do update set
  name = excluded.name,
  billing_interval = excluded.billing_interval,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  trial_days = excluded.trial_days,
  is_active = true,
  updated_at = now();
