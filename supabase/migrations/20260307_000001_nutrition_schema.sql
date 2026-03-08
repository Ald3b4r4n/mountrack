create extension if not exists pg_trgm;

create table if not exists nutrition_foods (
  id text primary key,
  source text not null,
  source_id text,
  name text not null,
  display_name text,
  brand text,
  barcode text,
  locale text,
  country_code text,
  is_branded boolean not null default false,
  completeness_score numeric not null default 0,
  external_updated_at timestamptz,
  payload jsonb not null,
  confidence_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists nutrition_foods_source_idx on nutrition_foods (source, coalesce(source_id, id));
create unique index if not exists nutrition_foods_barcode_idx on nutrition_foods (barcode) where barcode is not null;
create index if not exists nutrition_foods_name_search_idx on nutrition_foods using gin (to_tsvector('simple', coalesce(display_name, name)));
create index if not exists nutrition_foods_name_trgm_idx on nutrition_foods using gin (lower(coalesce(display_name, name)) gin_trgm_ops);
create index if not exists nutrition_foods_brand_trgm_idx on nutrition_foods using gin (lower(coalesce(brand, '')) gin_trgm_ops);

create table if not exists nutrition_food_sources_raw (
  source text not null,
  source_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, source_id)
);

create table if not exists nutrition_brand_watchlist (
  brand text primary key,
  priority integer not null default 100,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

insert into nutrition_brand_watchlist (brand)
values
  ('Growth'),
  ('Max Titanium'),
  ('Integralmedica'),
  ('Probiotica'),
  ('DUX'),
  ('Black Skull'),
  ('Darkness'),
  ('Atlhetica'),
  ('Bodyaction'),
  ('New Millen'),
  ('Essential')
on conflict (brand) do nothing;

create table if not exists nutrition_missing_food_queue (
  id text primary key,
  query text,
  barcode text,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_missing_food_queue_status_idx on nutrition_missing_food_queue (status, created_at desc);

create table if not exists nutrition_goals (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_diaries (
  id text primary key,
  user_id text not null,
  diary_date date not null,
  target_calories numeric not null,
  target_water_ml numeric not null default 0,
  water_intake_ml numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, diary_date)
);

create index if not exists nutrition_diaries_user_date_idx on nutrition_diaries (user_id, diary_date desc);

create table if not exists nutrition_diary_items (
  id text primary key,
  diary_id text not null references nutrition_diaries(id) on delete cascade,
  payload jsonb not null,
  meal_type text not null,
  consumed_at timestamptz not null
);

create index if not exists nutrition_diary_items_diary_meal_idx on nutrition_diary_items (diary_id, meal_type, consumed_at desc);

create table if not exists nutrition_meal_plans (
  user_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
