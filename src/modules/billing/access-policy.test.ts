import {
  canAssignRole,
  hasBillingPermission,
  isManualAccessGrantActive,
  resolveAccessDecision,
} from "@/modules/billing/access-policy";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";

describe("billing access policy", () => {
  it("keeps the permanent monthly commercial configuration fixed", () => {
    expect(BILLING_MONTHLY_PLAN_CODE).toBe("pro_monthly");
    expect(BILLING_MONTHLY_PRICE_CENTS).toBe(1499);
    expect(BILLING_CURRENCY).toBe("BRL");
    expect(BILLING_TRIAL_DAYS).toBe(3);
  });

  it("allows active entitlement states", () => {
    const decision = resolveAccessDecision({
      entitlementStatus: "active",
    });

    expect(decision).toEqual({
      accessAllowed: true,
      source: "entitlement",
      reason: "active_entitlement",
      effectiveStatus: "active",
    });
  });

  it("allows an active manual grant when the paid entitlement is not active", () => {
    const decision = resolveAccessDecision({
      entitlementStatus: "past_due",
      manualGrant: {
        grantType: "doctor",
        startsAt: "2026-03-10T00:00:00.000Z",
        endsAt: "2026-04-10T00:00:00.000Z",
      },
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    expect(decision).toEqual({
      accessAllowed: true,
      source: "manual_grant",
      reason: "manual_grant",
      effectiveStatus: "manual_grant_active",
    });
  });

  it("blocks access when the entitlement is in hard blocked status even with a manual grant", () => {
    const decision = resolveAccessDecision({
      entitlementStatus: "fraud_hold",
      manualGrant: {
        grantType: "partner",
        startsAt: "2026-03-10T00:00:00.000Z",
        endsAt: "2026-04-10T00:00:00.000Z",
      },
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    expect(decision).toEqual({
      accessAllowed: false,
      source: "entitlement",
      reason: "blocked_hard_status",
      effectiveStatus: "fraud_hold",
    });
  });

  it("blocks access when no entitlement exists and no manual grant is active", () => {
    const decision = resolveAccessDecision({
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    expect(decision).toEqual({
      accessAllowed: false,
      source: "none",
      reason: "missing_entitlement",
      effectiveStatus: "missing",
    });
  });

  it("treats expired and revoked courtesy grants as inactive", () => {
    expect(
      isManualAccessGrantActive(
        {
          grantType: "courtesy",
          startsAt: "2026-03-01T00:00:00.000Z",
          endsAt: "2026-03-10T00:00:00.000Z",
        },
        new Date("2026-03-15T12:00:00.000Z"),
      ),
    ).toBe(false);

    expect(
      isManualAccessGrantActive(
        {
          grantType: "influencer",
          startsAt: "2026-03-01T00:00:00.000Z",
          revokedAt: "2026-03-05T00:00:00.000Z",
        },
        new Date("2026-03-04T12:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("enforces billing permissions by operator role", () => {
    expect(hasBillingPermission(["owner"], "billing:roles:assign-admin")).toBe(true);
    expect(hasBillingPermission(["admin"], "billing:manual-grants:manage")).toBe(true);
    expect(hasBillingPermission(["finance"], "billing:payments:view")).toBe(true);
    expect(hasBillingPermission(["support"], "billing:user-access:view")).toBe(true);
    expect(hasBillingPermission(["support"], "billing:payments:view")).toBe(false);
  });

  it("allows only owner to assign privileged roles", () => {
    expect(canAssignRole(["owner"], "admin")).toBe(true);
    expect(canAssignRole(["owner"], "finance")).toBe(true);
    expect(canAssignRole(["admin"], "finance")).toBe(false);
    expect(canAssignRole(["finance"], "support")).toBe(false);
    expect(canAssignRole(["owner"], "owner")).toBe(false);
    expect(canAssignRole(["owner"], "user")).toBe(false);
  });
});
