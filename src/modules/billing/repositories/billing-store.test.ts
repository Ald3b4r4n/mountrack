import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import {
  bootstrapBillingOwner,
  createBillingCheckoutSession,
  ensureBillingTrialEntitlement,
  getBillingAccessSnapshot,
  getBillingCheckoutSessionById,
  getManualAccessGrantById,
  getBillingPlanById,
  getBillingWebhookHealthSummary,
  listBillingAuditLogsForUser,
  listManualAccessGrantsForUser,
  listBillingPlans,
  recordBillingEventIfNew,
  updateBillingEventProcessingStatus,
  updateBillingCheckoutSession,
  updateManualAccessGrant,
  upsertBillingPayment,
  upsertBillingSubscription,
  upsertBillingEntitlement,
} from "@/modules/billing/repositories/billing-store";

type QueryResult = {
  rows?: unknown[];
  rowCount?: number;
};

function makeQueryMock(resolver: (sql: string, params?: unknown[]) => QueryResult): jest.Mock {
  return jest.fn(async (sql: string, params?: unknown[]) => {
    const result = resolver(String(sql), params);
    return {
      rows: result.rows ?? [],
      rowCount: result.rowCount ?? (result.rows?.length ?? 0),
    };
  });
}

describe("billing-store", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalBootstrapOwnerEmail = process.env.BOOTSTRAP_OWNER_EMAIL;
  const originalBootstrapAdminEmails = process.env.BOOTSTRAP_ADMIN_EMAILS;
  const globalStore = globalThis as typeof globalThis & {
    __billingPool__?: {
      query: jest.Mock;
    };
    __billingSchemaPromise__?: Promise<void>;
  };

  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://billing:test@localhost:5432/mountrack";
    process.env.BOOTSTRAP_OWNER_EMAIL = "";
    process.env.BOOTSTRAP_ADMIN_EMAILS = "";
    delete globalStore.__billingPool__;
    delete globalStore.__billingSchemaPromise__;
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.BOOTSTRAP_OWNER_EMAIL = originalBootstrapOwnerEmail;
    process.env.BOOTSTRAP_ADMIN_EMAILS = originalBootstrapAdminEmails;
  });

  it("lists billing plans and preserves the permanent monthly configuration", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("from billing_plans")) {
        return {
          rows: [
            {
              id: "billing-plan-pro-monthly",
              code: BILLING_MONTHLY_PLAN_CODE,
              name: "MounTrack Pro Mensal",
              billing_interval: "monthly",
              amount_cents: BILLING_MONTHLY_PRICE_CENTS,
              currency: BILLING_CURRENCY,
              trial_days: BILLING_TRIAL_DAYS,
              is_active: true,
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const plans = await listBillingPlans();

    expect(plans).toEqual([
      {
        id: "billing-plan-pro-monthly",
        code: "pro_monthly",
        name: "MounTrack Pro Mensal",
        billingInterval: "monthly",
        amountCents: 1499,
        currency: "BRL",
        trialDays: 7,
        isActive: true,
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into billing_plans"), expect.any(Array));
  });

  it("bootstraps owner and admin roles for the configured operator email", async () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = "owner@mountrack.app";
    process.env.BOOTSTRAP_ADMIN_EMAILS = "owner@mountrack.app";

    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_user_roles")) {
        return {
          rows: [{ role_id: "billing-role:owner" }, { role_id: "billing-role:admin" }],
        };
      }

      if (sql.includes("select r.code")) {
        return {
          rows: [{ code: "owner" }, { code: "admin" }],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const roles = await bootstrapBillingOwner("user-owner", "OWNER@mountrack.app");

    expect(roles).toEqual(["owner", "admin"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into billing_audit_logs"), expect.any(Array));
  });

  it("records billing webhook events idempotently", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_events")) {
        return { rows: [] };
      }

      if (sql.includes("from billing_events")) {
        return {
          rows: [
            {
              id: "event-1",
              provider: "mercado_pago",
              provider_event_id: "provider-event-1",
              event_type: "payment.updated",
              signature_verified: true,
              processing_status: "received",
              idempotency_key: "event:provider-event-1",
              processed_at: null,
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const result = await recordBillingEventIfNew({
      provider: "mercado_pago",
      providerEventId: "provider-event-1",
      eventType: "payment.updated",
      signatureVerified: true,
      processingStatus: "received",
      idempotencyKey: "event:provider-event-1",
    });

    expect(result).toEqual({
      inserted: false,
      record: {
        id: "event-1",
        provider: "mercado_pago",
        providerEventId: "provider-event-1",
        eventType: "payment.updated",
        signatureVerified: true,
        processingStatus: "received",
        idempotencyKey: "event:provider-event-1",
        processedAt: null,
      },
    });
  });

  it("updates billing webhook processing status", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("update billing_events")) {
        return {
          rows: [
            {
              id: "evt-1",
              provider: "mercado_pago",
              provider_event_id: "provider-event-1",
              event_type: "payment.updated",
              signature_verified: true,
              processing_status: "processed",
              idempotency_key: "event:provider-event-1",
              processed_at: "2026-03-19T16:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const record = await updateBillingEventProcessingStatus(
      "evt-1",
      "processed",
      "2026-03-19T16:00:00.000Z",
    );

    expect(record).toEqual({
      id: "evt-1",
      provider: "mercado_pago",
      providerEventId: "provider-event-1",
      eventType: "payment.updated",
      signatureVerified: true,
      processingStatus: "processed",
      idempotencyKey: "event:provider-event-1",
      processedAt: "2026-03-19T16:00:00.000Z",
    });
  });

  it("summarizes Mercado Pago webhook health for operator visibility", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("with latest_processed as")) {
        return {
          rows: [
            {
              recent_processed_count: 12,
              recent_failure_count: 1,
              stale_received_count: 2,
              latest_processed_at: "2026-03-23T18:44:23.000Z",
              latest_failure_at: "2026-03-23T17:10:00.000Z",
              latest_failure_event_type: "subscription_preapproval.updated",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const summary = await getBillingWebhookHealthSummary(
      "mercado_pago",
      new Date("2026-03-23T18:45:00.000Z"),
      24,
      10,
    );

    expect(summary).toEqual({
      provider: "mercado_pago",
      recentProcessedCount: 12,
      recentFailureCount: 1,
      staleReceivedCount: 2,
      latestProcessedAt: "2026-03-23T18:44:23.000Z",
      latestFailureAt: "2026-03-23T17:10:00.000Z",
      latestFailureEventType: "subscription_preapproval.updated",
    });
  });

  it("creates checkout sessions bound to the user and resolved plan values", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_checkout_sessions")) {
        return {
          rows: [
            {
              id: "checkout-1",
              user_id: "user-a",
              plan_id: "billing-plan-pro-monthly",
              expected_amount_cents: 1499,
              currency: "BRL",
              nonce: "nonce-1",
              provider_checkout_id: null,
              provider_checkout_url: null,
              status: "pending",
              expires_at: "2026-03-19T14:30:00.000Z",
              created_at: "2026-03-19T14:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const session = await createBillingCheckoutSession({
      id: "checkout-1",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      status: "pending",
      nonce: "nonce-1",
      expiresAt: "2026-03-19T14:30:00.000Z",
    });

    expect(session).toEqual({
      id: "checkout-1",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "nonce-1",
      providerCheckoutId: null,
      providerCheckoutUrl: null,
      status: "pending",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into billing_checkout_sessions"), expect.any(Array));
  });

  it("updates checkout sessions with Mercado Pago redirect data", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("update billing_checkout_sessions")) {
        return {
          rows: [
            {
              id: "checkout-1",
              user_id: "user-a",
              plan_id: "billing-plan-pro-monthly",
              expected_amount_cents: 1499,
              currency: "BRL",
              nonce: "nonce-1",
              provider_checkout_id: "pref-123",
              provider_checkout_url: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123",
              status: "redirect_ready",
              expires_at: "2026-03-19T14:30:00.000Z",
              created_at: "2026-03-19T14:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const session = await updateBillingCheckoutSession({
      sessionId: "checkout-1",
      status: "redirect_ready",
      providerCheckoutId: "pref-123",
      providerCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123",
    });

    expect(session).toEqual({
      id: "checkout-1",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "nonce-1",
      providerCheckoutId: "pref-123",
      providerCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123",
      status: "redirect_ready",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update billing_checkout_sessions"), expect.any(Array));
  });

  it("finds a checkout session by id", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("from billing_checkout_sessions")) {
        return {
          rows: [
            {
              id: "checkout-1",
              user_id: "user-a",
              plan_id: "billing-plan-pro-monthly",
              expected_amount_cents: 1499,
              currency: "BRL",
              nonce: "nonce-1",
              provider_checkout_id: "pref-123",
              provider_checkout_url: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123",
              status: "redirect_ready",
              expires_at: "2026-03-19T14:30:00.000Z",
              created_at: "2026-03-19T14:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const session = await getBillingCheckoutSessionById("checkout-1");

    expect(session).toEqual({
      id: "checkout-1",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "nonce-1",
      providerCheckoutId: "pref-123",
      providerCheckoutUrl: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123",
      status: "redirect_ready",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
  });

  it("upserts billing payment records from provider reconciliation", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_payments")) {
        return {
          rows: [
            {
              id: "billing-payment:999999999",
              user_id: "user-a",
              subscription_id: null,
              provider: "mercado_pago",
              provider_payment_id: "999999999",
              provider_status: "approved",
              internal_status: "paid",
              amount_cents: 1499,
              currency: "BRL",
              paid_at: "2026-03-19T15:00:00.000Z",
              raw_reference_id: "checkout-1",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const payment = await upsertBillingPayment({
      id: "billing-payment:999999999",
      userId: "user-a",
      provider: "mercado_pago",
      providerPaymentId: "999999999",
      providerStatus: "approved",
      internalStatus: "paid",
      amountCents: 1499,
      currency: "BRL",
      paidAt: "2026-03-19T15:00:00.000Z",
      rawReferenceId: "checkout-1",
    });

    expect(payment).toEqual({
      id: "billing-payment:999999999",
      userId: "user-a",
      subscriptionId: null,
      provider: "mercado_pago",
      providerPaymentId: "999999999",
      providerStatus: "approved",
      internalStatus: "paid",
      amountCents: 1499,
      currency: "BRL",
      paidAt: "2026-03-19T15:00:00.000Z",
      rawReferenceId: "checkout-1",
    });
  });

  it("upserts billing subscriptions for Mercado Pago recurring checkouts", async () => {
    let subscriptionUpsertSql = "";
    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_subscriptions")) {
        subscriptionUpsertSql = sql;
        return {
          rows: [
            {
              id: "billing-subscription:preapproval-123",
              user_id: "user-a",
              billing_customer_id: null,
              plan_id: "billing-plan-pro-monthly",
              provider_subscription_id: "preapproval-123",
              status: "pending",
              trial_ends_at: null,
              current_period_start: null,
              current_period_end: null,
              cancel_at_period_end: false,
              canceled_at: null,
              grace_period_ends_at: null,
              created_at: "2026-03-19T14:00:00.000Z",
              updated_at: "2026-03-19T14:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const subscription = await upsertBillingSubscription({
      id: "billing-subscription:preapproval-123",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "pending",
    });

    expect(subscription).toEqual({
      id: "billing-subscription:preapproval-123",
      userId: "user-a",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "pending",
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriodEndsAt: null,
      createdAt: "2026-03-19T14:00:00.000Z",
      updatedAt: "2026-03-19T14:00:00.000Z",
    });
    expect(subscriptionUpsertSql).toContain(
      "current_period_start = coalesce(excluded.current_period_start, billing_subscriptions.current_period_start)",
    );
    expect(subscriptionUpsertSql).toContain(
      "current_period_end = coalesce(excluded.current_period_end, billing_subscriptions.current_period_end)",
    );
  });

  it("keeps billing schema hardening in runtime bootstrap and Supabase migration", () => {
    const runtimeSchemaSource = readFileSync(
      join(process.cwd(), "src/modules/billing/repositories/billing-store.ts"),
      "utf8",
    );
    const migrationSource = readFileSync(
      join(process.cwd(), "supabase/migrations/20260318_000003_public_rls_hardening.sql"),
      "utf8",
    );

    for (const tableName of [
      "billing_plans",
      "billing_roles",
      "billing_user_roles",
      "billing_customers",
      "billing_subscriptions",
      "billing_payments",
      "billing_checkout_sessions",
      "billing_entitlements",
      "billing_manual_access_grants",
      "billing_events",
      "billing_audit_logs",
    ]) {
      expect(runtimeSchemaSource).toContain(`alter table ${tableName} enable row level security;`);
      expect(migrationSource).toContain(`alter table if exists public.${tableName} enable row level security;`);
    }
  });

  it("keeps checkout provider url persistence in runtime bootstrap and Supabase migration", () => {
    const runtimeSchemaSource = readFileSync(
      join(process.cwd(), "src/modules/billing/repositories/billing-store.ts"),
      "utf8",
    );
    const migrationSource = readFileSync(
      join(process.cwd(), "supabase/migrations/20260319_000004_billing_checkout_provider_link.sql"),
      "utf8",
    );

    expect(runtimeSchemaSource).toContain("provider_checkout_url text");
    expect(runtimeSchemaSource).toContain(
      "alter table billing_checkout_sessions add column if not exists provider_checkout_url text;",
    );
    expect(migrationSource).toContain("add column if not exists provider_checkout_url text");
  });

  it("returns the current access snapshot from entitlements, manual grant and roles", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("returning id, user_id, source_type")) {
        return {
          rows: [
            {
              id: "ent-1",
              user_id: "user-a",
              source_type: "trial",
              source_id: "trial:user-a",
              status: "trialing",
              starts_at: "2026-03-15T00:00:00.000Z",
              ends_at: "2026-03-18T00:00:00.000Z",
            },
          ],
        };
      }

      if (sql.includes("from billing_entitlements")) {
        return {
          rows: [
            {
              id: "ent-1",
              user_id: "user-a",
              source_type: "trial",
              source_id: "trial:user-a",
              status: "trialing",
              starts_at: "2026-03-15T00:00:00.000Z",
              ends_at: "2026-03-18T00:00:00.000Z",
            },
          ],
        };
      }

      if (sql.includes("from billing_manual_access_grants")) {
        return {
          rows: [
            {
              id: "grant-1",
              user_id: "user-a",
              grant_type: "doctor",
              reason: "Medical partnership",
              notes: "Invite access",
              starts_at: "2026-03-14T00:00:00.000Z",
              ends_at: "2026-04-14T00:00:00.000Z",
              granted_by: "user-owner",
              revoked_at: null,
              created_at: "2026-03-14T00:00:00.000Z",
            },
          ],
        };
      }

      if (sql.includes("select r.code")) {
        return {
          rows: [{ code: "owner" }, { code: "finance" }],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    await upsertBillingEntitlement({
      id: "ent-1",
      userId: "user-a",
      sourceType: "trial",
      sourceId: "trial:user-a",
      status: "trialing",
      startsAt: "2026-03-15T00:00:00.000Z",
      endsAt: "2026-03-18T00:00:00.000Z",
    });

    const snapshot = await getBillingAccessSnapshot("user-a", new Date("2026-03-15T12:00:00.000Z"));

    expect(snapshot).toEqual({
      entitlementStatus: "trialing",
      entitlementStartsAt: "2026-03-15T00:00:00.000Z",
      entitlementEndsAt: "2026-03-18T00:00:00.000Z",
      manualGrant: {
        grantType: "doctor",
        startsAt: "2026-03-14T00:00:00.000Z",
        endsAt: "2026-04-14T00:00:00.000Z",
        revokedAt: null,
      },
      roles: ["owner", "finance"],
    });
  });

  it("lists manual access grants for the selected user in descending order", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("from billing_manual_access_grants")) {
        return {
          rows: [
            {
              id: "grant-2",
              user_id: "user-a",
              grant_type: "partner",
              reason: "Parceiro regional",
              notes: null,
              starts_at: "2026-03-20T00:00:00.000Z",
              ends_at: null,
              granted_by: "owner-1",
              revoked_at: null,
              created_at: "2026-03-20T00:00:00.000Z",
            },
            {
              id: "grant-1",
              user_id: "user-a",
              grant_type: "courtesy",
              reason: "Primeiro ciclo",
              notes: "Lancamento",
              starts_at: "2026-02-20T00:00:00.000Z",
              ends_at: "2026-03-20T00:00:00.000Z",
              granted_by: "owner-1",
              revoked_at: "2026-03-01T00:00:00.000Z",
              created_at: "2026-02-20T00:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const grants = await listManualAccessGrantsForUser("user-a");

    expect(grants).toEqual([
      {
        id: "grant-2",
        userId: "user-a",
        grantType: "partner",
        reason: "Parceiro regional",
        notes: null,
        startsAt: "2026-03-20T00:00:00.000Z",
        endsAt: null,
        grantedBy: "owner-1",
        revokedAt: null,
        createdAt: "2026-03-20T00:00:00.000Z",
      },
      {
        id: "grant-1",
        userId: "user-a",
        grantType: "courtesy",
        reason: "Primeiro ciclo",
        notes: "Lancamento",
        startsAt: "2026-02-20T00:00:00.000Z",
        endsAt: "2026-03-20T00:00:00.000Z",
        grantedBy: "owner-1",
        revokedAt: "2026-03-01T00:00:00.000Z",
        createdAt: "2026-02-20T00:00:00.000Z",
      },
    ]);
  });

  it("lists recent billing audit logs for the selected user", async () => {
    const query = makeQueryMock((sql, params) => {
      if (sql.includes("from billing_audit_logs")) {
        expect(params).toEqual(["user-a", 20]);
        return {
          rows: [
            {
              id: "audit-2",
              actor_user_id: "owner-1",
              action: "billing.manual_grant_updated",
              target_type: "manual_access_grant",
              target_id: "grant-2",
              metadata_json: {
                userId: "user-a",
                grantType: "partner",
                reason: "Prazo ampliado",
              },
              created_at: "2026-03-23T09:00:00.000Z",
            },
            {
              id: "audit-1",
              actor_user_id: "owner-1",
              action: "billing.manual_grant_saved",
              target_type: "manual_access_grant",
              target_id: "grant-1",
              metadata_json: {
                userId: "user-a",
                grantType: "courtesy",
                reason: "Lancamento",
              },
              created_at: "2026-03-22T09:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const auditLogs = await listBillingAuditLogsForUser("user-a");

    expect(auditLogs).toEqual([
      {
        id: "audit-2",
        actorUserId: "owner-1",
        action: "billing.manual_grant_updated",
        targetType: "manual_access_grant",
        targetId: "grant-2",
        metadata: {
          userId: "user-a",
          grantType: "partner",
          reason: "Prazo ampliado",
        },
        createdAt: "2026-03-23T09:00:00.000Z",
      },
      {
        id: "audit-1",
        actorUserId: "owner-1",
        action: "billing.manual_grant_saved",
        targetType: "manual_access_grant",
        targetId: "grant-1",
        metadata: {
          userId: "user-a",
          grantType: "courtesy",
          reason: "Lancamento",
        },
        createdAt: "2026-03-22T09:00:00.000Z",
      },
    ]);
  });

  it("loads a single manual access grant by id", async () => {
    const query = makeQueryMock((sql, params) => {
      if (
        sql.includes("from billing_manual_access_grants") &&
        sql.includes("where id = $1")
      ) {
        expect(params).toEqual(["grant-9"]);
        return {
          rows: [
            {
              id: "grant-9",
              user_id: "user-a",
              grant_type: "staff",
              reason: "Equipe operacional",
              notes: "Janela interna",
              starts_at: "2026-03-20T00:00:00.000Z",
              ends_at: null,
              granted_by: "owner-1",
              revoked_at: null,
              created_at: "2026-03-20T00:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const grant = await getManualAccessGrantById("grant-9");

    expect(grant).toEqual({
      id: "grant-9",
      userId: "user-a",
      grantType: "staff",
      reason: "Equipe operacional",
      notes: "Janela interna",
      startsAt: "2026-03-20T00:00:00.000Z",
      endsAt: null,
      grantedBy: "owner-1",
      revokedAt: null,
      createdAt: "2026-03-20T00:00:00.000Z",
    });
  });

  it("updates an active manual access grant without revogar o registro", async () => {
    const query = makeQueryMock((sql, params) => {
      if (
        sql.includes("update billing_manual_access_grants") &&
        sql.includes("where id = $1 and revoked_at is null")
      ) {
        expect(params).toEqual([
          "grant-9",
          "partner",
          "Prazo ajustado",
          "Extensao aprovada",
          "2026-06-21T00:00:00.000Z",
        ]);

        return {
          rows: [
            {
              id: "grant-9",
              user_id: "user-a",
              grant_type: "partner",
              reason: "Prazo ajustado",
              notes: "Extensao aprovada",
              starts_at: "2026-03-23T00:00:00.000Z",
              ends_at: "2026-06-21T00:00:00.000Z",
              granted_by: "owner-1",
              revoked_at: null,
              created_at: "2026-03-23T00:00:00.000Z",
            },
          ],
        };
      }

      if (sql.includes("insert into billing_audit_logs")) {
        expect(params?.[1]).toBe("owner-2");
        expect(params?.[2]).toBe("billing.manual_grant_updated");
        expect(params?.[4]).toBe("grant-9");
        return { rows: [] };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const grant = await updateManualAccessGrant(
      {
        id: "grant-9",
        grantType: "partner",
        reason: "Prazo ajustado",
        notes: "Extensao aprovada",
        endsAt: "2026-06-21T00:00:00.000Z",
      },
      "owner-2",
    );

    expect(grant).toEqual({
      id: "grant-9",
      userId: "user-a",
      grantType: "partner",
      reason: "Prazo ajustado",
      notes: "Extensao aprovada",
      startsAt: "2026-03-23T00:00:00.000Z",
      endsAt: "2026-06-21T00:00:00.000Z",
      grantedBy: "owner-1",
      revokedAt: null,
      createdAt: "2026-03-23T00:00:00.000Z",
    });
  });

  it("finds a billing plan by id", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("from billing_plans")) {
        return {
          rows: [
            {
              id: "billing-plan-pro-monthly",
              code: "pro_monthly",
              name: "MounTrack Pro Mensal",
              billing_interval: "monthly",
              amount_cents: 1499,
              currency: "BRL",
              trial_days: 7,
              is_active: true,
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const plan = await getBillingPlanById("billing-plan-pro-monthly");

    expect(plan).toEqual({
      id: "billing-plan-pro-monthly",
      code: "pro_monthly",
      name: "MounTrack Pro Mensal",
      billingInterval: "monthly",
      amountCents: 1499,
      currency: "BRL",
      trialDays: 7,
      isActive: true,
    });
  });

  it("creates the initial 7-day trial only when the user has no prior entitlement", async () => {
    const query = makeQueryMock((sql) => {
      if (sql.includes("select exists")) {
        return {
          rows: [{ exists: false }],
        };
      }

      if (sql.includes("returning id, user_id, source_type")) {
        return {
          rows: [
            {
              id: "trial:user-trial",
              user_id: "user-trial",
              source_type: "trial",
              source_id: "trial:user-trial",
              status: "trialing",
              starts_at: "2026-03-15T12:00:00.000Z",
              ends_at: "2026-03-22T12:00:00.000Z",
            },
          ],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const entitlement = await ensureBillingTrialEntitlement(
      "user-trial",
      new Date("2026-03-15T12:00:00.000Z"),
    );

    expect(entitlement).toEqual({
      id: "trial:user-trial",
      userId: "user-trial",
      sourceType: "trial",
      sourceId: "trial:user-trial",
      status: "trialing",
      startsAt: "2026-03-15T12:00:00.000Z",
      endsAt: "2026-03-22T12:00:00.000Z",
    });
  });
});
