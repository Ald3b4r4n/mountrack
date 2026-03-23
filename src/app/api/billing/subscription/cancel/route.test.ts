/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/providers/mercado-pago", () => ({
  cancelMercadoPagoPreapproval: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  upsertBillingSubscription: jest.fn(),
}));

import { POST } from "@/app/api/billing/subscription/cancel/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { cancelMercadoPagoPreapproval } from "@/modules/billing/providers/mercado-pago";
import { upsertBillingSubscription } from "@/modules/billing/repositories/billing-store";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const cancelMercadoPagoPreapprovalMock = jest.mocked(cancelMercadoPagoPreapproval);
const upsertBillingSubscriptionMock = jest.mocked(upsertBillingSubscription);

const activeSubscription = {
  id: "billing-subscription:preapproval-123",
  userId: "user-123",
  planId: "billing-plan-pro-monthly",
  providerSubscriptionId: "preapproval-123",
  status: "active",
  trialEndsAt: null,
  currentPeriodStart: "2026-03-23T12:00:00.000Z",
  currentPeriodEnd: "2026-04-23T12:00:00.000Z",
  cancelAtPeriodEnd: false,
  canceledAt: null,
  gracePeriodEndsAt: null,
  createdAt: "2026-03-23T12:00:00.000Z",
  updatedAt: "2026-03-23T12:00:00.000Z",
  planName: "MounTrack Pro Mensal",
  planCode: "pro_monthly",
} as const;

describe("POST /api/billing/subscription/cancel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when there is no authenticated server session", async () => {
    readServerAppAccessMock.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Missing authenticated session",
    });
  });

  it("returns 404 when the user has no subscription to cancel", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-23T12:00:00.000Z",
      subscription: null,
    });

    const response = await POST();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Billing subscription not found",
    });
  });

  it("returns the current subscription when cancellation was already requested", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-23T12:00:00.000Z",
      subscription: {
        ...activeSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: "2026-03-23T15:00:00.000Z",
      },
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(cancelMercadoPagoPreapprovalMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      subscription: {
        ...activeSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: "2026-03-23T15:00:00.000Z",
      },
    });
  });

  it("cancels renewal and keeps the current paid period locally", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-23T12:00:00.000Z",
      subscription: activeSubscription,
    });
    cancelMercadoPagoPreapprovalMock.mockResolvedValue({
      providerSubscriptionId: "preapproval-123",
      status: "cancelled",
      externalReference: "checkout-123",
      nextPaymentDate: null,
      lastChargedAt: "2026-03-23T12:00:00.000Z",
      rawPayload: {
        id: "preapproval-123",
        status: "cancelled",
      },
    });
    upsertBillingSubscriptionMock.mockResolvedValue({
      ...activeSubscription,
      cancelAtPeriodEnd: true,
      canceledAt: "2026-03-23T15:00:00.000Z",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(cancelMercadoPagoPreapprovalMock).toHaveBeenCalledWith("preapproval-123");
    expect(upsertBillingSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "billing-subscription:preapproval-123",
        providerSubscriptionId: "preapproval-123",
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-04-23T12:00:00.000Z",
      }),
    );
    await expect(response.json()).resolves.toEqual({
      subscription: {
        ...activeSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: "2026-03-23T15:00:00.000Z",
      },
    });
  });

  it("returns 502 when Mercado Pago rejects the cancellation request", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-23T12:00:00.000Z",
      subscription: activeSubscription,
    });
    cancelMercadoPagoPreapprovalMock.mockRejectedValue(
      new Error("MERCADO_PAGO_PREAPPROVAL_CANCEL_FAILED:400:bad_request"),
    );

    const response = await POST();

    expect(response.status).toBe(502);
    expect(upsertBillingSubscriptionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Failed to cancel Mercado Pago subscription",
    });
  });
});
