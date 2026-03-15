import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import {
  bootstrapBillingOwner,
  ensureBillingTrialEntitlement,
  getBillingAccessSnapshot,
  listBillingPlans,
  recordBillingEventIfNew,
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
  const globalStore = globalThis as typeof globalThis & {
    __billingPool__?: {
      query: jest.Mock;
    };
    __billingSchemaPromise__?: Promise<void>;
  };

  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://billing:test@localhost:5432/mountrack";
    process.env.BOOTSTRAP_OWNER_EMAIL = "";
    delete globalStore.__billingPool__;
    delete globalStore.__billingSchemaPromise__;
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.BOOTSTRAP_OWNER_EMAIL = originalBootstrapOwnerEmail;
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
        trialDays: 3,
        isActive: true,
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into billing_plans"), expect.any(Array));
  });

  it("bootstraps the owner role only for the configured email", async () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = "owner@mountrack.app";

    const query = makeQueryMock((sql) => {
      if (sql.includes("insert into billing_user_roles")) {
        return {
          rows: [{ user_id: "user-owner" }],
        };
      }

      if (sql.includes("select r.code")) {
        return {
          rows: [{ code: "owner" }],
        };
      }

      return { rows: [] };
    });

    globalStore.__billingPool__ = { query };

    const roles = await bootstrapBillingOwner("user-owner", "OWNER@mountrack.app");

    expect(roles).toEqual(["owner"]);
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
      manualGrant: {
        grantType: "doctor",
        startsAt: "2026-03-14T00:00:00.000Z",
        endsAt: "2026-04-14T00:00:00.000Z",
        revokedAt: null,
      },
      roles: ["owner", "finance"],
    });
  });

  it("creates the initial 3-day trial only when the user has no prior entitlement", async () => {
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
              ends_at: "2026-03-18T12:00:00.000Z",
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
      endsAt: "2026-03-18T12:00:00.000Z",
    });
  });
});
