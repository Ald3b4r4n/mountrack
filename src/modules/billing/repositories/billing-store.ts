import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type {
  AppRole,
  BillingAccessSnapshot,
  BillingEntitlementRecord,
  BillingEventRecord,
  BillingPlan,
  BillingEntitlementSourceType,
  BillingAccessStatus,
  ManualAccessGrantRecord,
  ManualAccessGrantSnapshot,
} from "@/modules/billing/domain/types";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";

const DEFAULT_BILLING_PLAN_ID = "billing-plan-pro-monthly";
const BILLING_ROLES: Array<{ code: AppRole; description: string }> = [
  { code: "owner", description: "Full platform control" },
  { code: "admin", description: "Operational billing control" },
  { code: "finance", description: "Finance visibility" },
  { code: "support", description: "Support visibility" },
  { code: "user", description: "Standard product access" },
];

const globalBillingState = globalThis as typeof globalThis & {
  __billingPool__?: Pool;
  __billingSchemaPromise__?: Promise<void>;
};

const SCHEMA_SQL = `
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
`;

type QueryExecutor = Pick<Pool, "query">;
export type BillingStorageResponse = "database" | "unavailable";

interface BillingPlanRow {
  id: string;
  code: string;
  name: string;
  billing_interval: string;
  amount_cents: number | string;
  currency: string;
  trial_days: number | string;
  is_active: boolean;
}

interface BillingRoleRow {
  code: AppRole;
}

interface BillingEntitlementRow {
  id: string;
  user_id: string;
  source_type: BillingEntitlementSourceType;
  source_id: string;
  status: BillingAccessStatus;
  starts_at: string;
  ends_at: string | null;
}

interface ManualAccessGrantRow {
  id: string;
  user_id: string;
  grant_type: ManualAccessGrantRecord["grantType"];
  reason: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  granted_by: string;
  revoked_at: string | null;
  created_at: string;
}

interface BillingEventRow {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processing_status: string;
  idempotency_key: string | null;
  processed_at: string | null;
}

export interface RecordBillingEventInput {
  provider: string;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  processingStatus: string;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
  processedAt?: string | null;
}

export interface UpsertBillingEntitlementInput {
  id: string;
  userId: string;
  sourceType: BillingEntitlementSourceType;
  sourceId: string;
  status: BillingAccessStatus;
  startsAt: string;
  endsAt?: string | null;
}

export interface SaveManualAccessGrantInput {
  id: string;
  userId: string;
  grantType: ManualAccessGrantRecord["grantType"];
  reason: string;
  notes?: string | null;
  startsAt: string;
  endsAt?: string | null;
  grantedBy: string;
}

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_POOLER_URL ??
    ""
  );
}

function hasDatabaseUrl(): boolean {
  return Boolean(getDatabaseUrl());
}

function requireDatabaseUrl(): string {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("BILLING_STORAGE_UNAVAILABLE");
  }

  return databaseUrl;
}

export function getBillingStorageResponse(): BillingStorageResponse {
  return hasDatabaseUrl() ? "database" : "unavailable";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getPool(): Pool {
  if (!globalBillingState.__billingPool__) {
    globalBillingState.__billingPool__ = new Pool({
      connectionString: requireDatabaseUrl(),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : undefined,
    });
  }

  return globalBillingState.__billingPool__;
}

function mapBillingPlanRow(row: BillingPlanRow): BillingPlan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    billingInterval: row.billing_interval,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    trialDays: Number(row.trial_days),
    isActive: Boolean(row.is_active),
  };
}

function mapManualAccessGrantRow(row: ManualAccessGrantRow): ManualAccessGrantRecord {
  return {
    id: row.id,
    userId: row.user_id,
    grantType: row.grant_type,
    reason: row.reason,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    grantedBy: row.granted_by,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

function mapBillingEventRow(row: BillingEventRow): BillingEventRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventType: row.event_type,
    signatureVerified: Boolean(row.signature_verified),
    processingStatus: row.processing_status,
    idempotencyKey: row.idempotency_key,
    processedAt: row.processed_at,
  };
}

async function seedBillingRoles(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  for (const role of BILLING_ROLES) {
    await getPool().query(
      `
      insert into billing_roles (id, code, description)
      values ($1, $2, $3)
      on conflict (code) do update set description = excluded.description
      `,
      [`billing-role:${role.code}`, role.code, role.description],
    );
  }
}

async function seedDefaultBillingPlan(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  await getPool().query(
    `
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
    values ($1, $2, $3, $4, $5, $6, $7, true)
    on conflict (code) do update set
      name = excluded.name,
      billing_interval = excluded.billing_interval,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      trial_days = excluded.trial_days,
      is_active = true,
      updated_at = now()
    `,
    [
      DEFAULT_BILLING_PLAN_ID,
      BILLING_MONTHLY_PLAN_CODE,
      "MounTrack Pro Mensal",
      "monthly",
      BILLING_MONTHLY_PRICE_CENTS,
      BILLING_CURRENCY,
      BILLING_TRIAL_DAYS,
    ],
  );
}

async function ensureSchema(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  if (!globalBillingState.__billingSchemaPromise__) {
    globalBillingState.__billingSchemaPromise__ = getPool()
      .query(SCHEMA_SQL)
      .then(() => seedBillingRoles())
      .then(() => seedDefaultBillingPlan())
      .then(() => undefined);
  }

  await globalBillingState.__billingSchemaPromise__;
}

async function appendAuditLog(
  executor: QueryExecutor,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await executor.query(
    `
    insert into billing_audit_logs (id, actor_user_id, action, target_type, target_id, metadata_json)
    values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [randomUUID(), actorUserId, action, targetType, targetId, JSON.stringify(metadata)],
  );
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureSchema();
  const result = await getPool().query<BillingPlanRow>(
    `
    select id, code, name, billing_interval, amount_cents, currency, trial_days, is_active
    from billing_plans
    order by amount_cents asc, created_at asc
    `,
  );

  return result.rows.map(mapBillingPlanRow);
}

export async function getBillingPlan(code = BILLING_MONTHLY_PLAN_CODE): Promise<BillingPlan | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureSchema();
  const result = await getPool().query<BillingPlanRow>(
    `
    select id, code, name, billing_interval, amount_cents, currency, trial_days, is_active
    from billing_plans
    where code = $1
    limit 1
    `,
    [code],
  );

  return result.rows[0] ? mapBillingPlanRow(result.rows[0]) : null;
}

export async function listBillingUserRoles(userId: string): Promise<AppRole[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureSchema();
  const result = await getPool().query<BillingRoleRow>(
    `
    select r.code
    from billing_user_roles ur
    inner join billing_roles r on r.id = ur.role_id
    where ur.user_id = $1
    order by ur.granted_at asc
    `,
    [userId],
  );

  return result.rows.map((row) => row.code);
}

export async function bootstrapBillingOwner(userId: string, email: string): Promise<AppRole[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureSchema();

  const bootstrapOwnerEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim();
  if (!bootstrapOwnerEmail || normalizeEmail(email) !== normalizeEmail(bootstrapOwnerEmail)) {
    return listBillingUserRoles(userId);
  }

  const insertResult = await getPool().query(
    `
    insert into billing_user_roles (user_id, role_id, granted_by)
    select $1, id, $2
    from billing_roles
    where code = 'owner'
    on conflict (user_id, role_id) do nothing
    returning user_id
    `,
    [userId, "system:bootstrap"],
  );

  if (insertResult.rows.length > 0) {
    await appendAuditLog(
      getPool(),
      "system:bootstrap",
      "billing.owner_bootstrap",
      "user",
      userId,
      { email },
    );
  }

  return listBillingUserRoles(userId);
}

export async function upsertBillingEntitlement(input: UpsertBillingEntitlementInput): Promise<BillingEntitlementRecord> {
  requireDatabaseUrl();
  await ensureSchema();

  const result = await getPool().query<BillingEntitlementRow>(
    `
    insert into billing_entitlements (id, user_id, source_type, source_id, status, starts_at, ends_at)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (id) do update set
      user_id = excluded.user_id,
      source_type = excluded.source_type,
      source_id = excluded.source_id,
      status = excluded.status,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      updated_at = now()
    returning id, user_id, source_type, source_id, status, starts_at, ends_at
    `,
    [
      input.id,
      input.userId,
      input.sourceType,
      input.sourceId,
      input.status,
      input.startsAt,
      input.endsAt ?? null,
    ],
  );

  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    sourceType: result.rows[0].source_type,
    sourceId: result.rows[0].source_id,
    status: result.rows[0].status,
    startsAt: result.rows[0].starts_at,
    endsAt: result.rows[0].ends_at,
  };
}

export async function ensureBillingTrialEntitlement(
  userId: string,
  now = new Date(),
): Promise<BillingEntitlementRecord | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureSchema();

  const existingResult = await getPool().query<{ exists: boolean }>(
    `
    select exists (
      select 1
      from billing_entitlements
      where user_id = $1
    ) as exists
    `,
    [userId],
  );

  if (existingResult.rows[0]?.exists) {
    return null;
  }

  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const trialId = `trial:${userId}`;

  return upsertBillingEntitlement({
    id: trialId,
    userId,
    sourceType: "trial",
    sourceId: trialId,
    status: "trialing",
    startsAt,
    endsAt,
  });
}

export async function saveManualAccessGrant(input: SaveManualAccessGrantInput): Promise<ManualAccessGrantRecord> {
  requireDatabaseUrl();
  await ensureSchema();

  const result = await getPool().query<ManualAccessGrantRow>(
    `
    insert into billing_manual_access_grants (
      id,
      user_id,
      grant_type,
      reason,
      notes,
      starts_at,
      ends_at,
      granted_by
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    on conflict (id) do update set
      grant_type = excluded.grant_type,
      reason = excluded.reason,
      notes = excluded.notes,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      granted_by = excluded.granted_by
    returning id, user_id, grant_type, reason, notes, starts_at, ends_at, granted_by, revoked_at, created_at
    `,
    [
      input.id,
      input.userId,
      input.grantType,
      input.reason,
      input.notes ?? null,
      input.startsAt,
      input.endsAt ?? null,
      input.grantedBy,
    ],
  );

  await appendAuditLog(
    getPool(),
    input.grantedBy,
    "billing.manual_grant_saved",
    "manual_access_grant",
    input.id,
    {
      userId: input.userId,
      grantType: input.grantType,
      reason: input.reason,
    },
  );

  return mapManualAccessGrantRow(result.rows[0]);
}

export async function revokeManualAccessGrant(grantId: string, revokedBy: string): Promise<boolean> {
  requireDatabaseUrl();
  await ensureSchema();

  const result = await getPool().query<Pick<ManualAccessGrantRow, "id" | "user_id">>(
    `
    update billing_manual_access_grants
    set revoked_by = $2, revoked_at = now()
    where id = $1 and revoked_at is null
    returning id, user_id
    `,
    [grantId, revokedBy],
  );

  if (!result.rows[0]) {
    return false;
  }

  await appendAuditLog(
    getPool(),
    revokedBy,
    "billing.manual_grant_revoked",
    "manual_access_grant",
    grantId,
    { userId: result.rows[0].user_id },
  );

  return true;
}

export async function recordBillingEventIfNew(
  input: RecordBillingEventInput,
): Promise<{ inserted: boolean; record: BillingEventRecord }> {
  requireDatabaseUrl();
  await ensureSchema();

  const insertedResult = await getPool().query<BillingEventRow>(
    `
    insert into billing_events (
      id,
      provider,
      provider_event_id,
      event_type,
      signature_verified,
      processing_status,
      idempotency_key,
      processed_at,
      payload
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    on conflict (provider, provider_event_id) do nothing
    returning id, provider, provider_event_id, event_type, signature_verified, processing_status, idempotency_key, processed_at
    `,
    [
      randomUUID(),
      input.provider,
      input.providerEventId,
      input.eventType,
      input.signatureVerified,
      input.processingStatus,
      input.idempotencyKey ?? null,
      input.processedAt ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );

  if (insertedResult.rows[0]) {
    return {
      inserted: true,
      record: mapBillingEventRow(insertedResult.rows[0]),
    };
  }

  const existingResult = await getPool().query<BillingEventRow>(
    `
    select id, provider, provider_event_id, event_type, signature_verified, processing_status, idempotency_key, processed_at
    from billing_events
    where provider = $1 and provider_event_id = $2
    limit 1
    `,
    [input.provider, input.providerEventId],
  );

  return {
    inserted: false,
    record: mapBillingEventRow(existingResult.rows[0]),
  };
}

export async function getBillingAccessSnapshot(
  userId: string,
  now = new Date(),
): Promise<BillingAccessSnapshot> {
  if (!hasDatabaseUrl()) {
    return {
      entitlementStatus: null,
      manualGrant: null,
      roles: [],
    };
  }

  await ensureSchema();
  const timestamp = now.toISOString();

  const [entitlementResult, manualGrantResult, roles] = await Promise.all([
    getPool().query<BillingEntitlementRow>(
      `
      select id, user_id, source_type, source_id, status, starts_at, ends_at
      from billing_entitlements
      where user_id = $1
        and starts_at <= $2
        and (ends_at is null or ends_at > $2)
      order by starts_at desc, created_at desc
      limit 1
      `,
      [userId, timestamp],
    ),
    getPool().query<ManualAccessGrantRow>(
      `
      select id, user_id, grant_type, reason, notes, starts_at, ends_at, granted_by, revoked_at, created_at
      from billing_manual_access_grants
      where user_id = $1
        and starts_at <= $2
        and (ends_at is null or ends_at > $2)
        and revoked_at is null
      order by starts_at desc, created_at desc
      limit 1
      `,
      [userId, timestamp],
    ),
    listBillingUserRoles(userId),
  ]);

  const entitlementStatus = entitlementResult.rows[0]?.status ?? null;
  const manualGrant = manualGrantResult.rows[0]
    ? ({
        grantType: manualGrantResult.rows[0].grant_type,
        startsAt: manualGrantResult.rows[0].starts_at,
        endsAt: manualGrantResult.rows[0].ends_at,
        revokedAt: manualGrantResult.rows[0].revoked_at,
      } satisfies ManualAccessGrantSnapshot)
    : null;

  return {
    entitlementStatus,
    manualGrant,
    roles,
  };
}
