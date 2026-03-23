/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

import { GET } from "@/app/api/billing/access/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);

describe("GET /api/billing/access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when there is no authenticated server session", async () => {
    readServerAppAccessMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      accessAllowed: false,
      effectiveStatus: "missing",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      roles: [],
      subscription: null,
    });
  });

  it("returns 403 when the user is authenticated but billing access is blocked", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: false,
      effectiveStatus: "past_due",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      subscription: null,
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      accessAllowed: false,
      effectiveStatus: "past_due",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      roles: ["user"],
      subscription: null,
    });
  });

  it("returns 200 when the user can access the paid app", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-20T12:00:00.000Z",
      entitlementEndsAt: "2026-04-20T12:00:00.000Z",
      subscription: {
        id: "billing-subscription:preapproval-123",
        userId: "user-123",
        planId: "billing-plan-pro-monthly",
        providerSubscriptionId: "preapproval-123",
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: "2026-03-20T12:00:00.000Z",
        currentPeriodEnd: "2026-04-20T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        gracePeriodEndsAt: null,
        createdAt: "2026-03-20T12:00:00.000Z",
        updatedAt: "2026-03-20T12:00:00.000Z",
        planName: "MounTrack Pro Mensal",
        planCode: "pro_monthly",
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-20T12:00:00.000Z",
      entitlementEndsAt: "2026-04-20T12:00:00.000Z",
      roles: ["user"],
      subscription: {
        id: "billing-subscription:preapproval-123",
        userId: "user-123",
        planId: "billing-plan-pro-monthly",
        providerSubscriptionId: "preapproval-123",
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: "2026-03-20T12:00:00.000Z",
        currentPeriodEnd: "2026-04-20T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        gracePeriodEndsAt: null,
        createdAt: "2026-03-20T12:00:00.000Z",
        updatedAt: "2026-03-20T12:00:00.000Z",
        planName: "MounTrack Pro Mensal",
        planCode: "pro_monthly",
      },
    });
  });
});
