/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
  getBillingWebhookHealthSummary: jest.fn(),
}));

import { GET } from "@/app/api/billing/webhook-health/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import {
  getBillingStorageResponse,
  getBillingWebhookHealthSummary,
} from "@/modules/billing/repositories/billing-store";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const getBillingWebhookHealthSummaryMock = jest.mocked(getBillingWebhookHealthSummary);

describe("GET /api/billing/webhook-health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBillingStorageResponseMock.mockReturnValue("database");
  });

  it("returns 401 when there is no authenticated server session", async () => {
    readServerAppAccessMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Missing authenticated session",
    });
  });

  it("returns 403 when the authenticated user lacks webhook visibility permission", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: { uid: "user-123", email: "user@example.com" },
      roles: ["support"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden",
    });
  });

  it("returns 503 when billing storage is unavailable", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: { uid: "owner-123", email: "owner@example.com" },
      roles: ["owner"],
      accessAllowed: true,
      effectiveStatus: "operator_override",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
    });
    getBillingStorageResponseMock.mockReturnValue("unavailable");

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Billing storage unavailable",
    });
  });

  it("returns a healthy summary for owner/admin/finance operators", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: { uid: "finance-123", email: "finance@example.com" },
      roles: ["finance"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
    });
    getBillingWebhookHealthSummaryMock.mockResolvedValue({
      provider: "mercado_pago",
      recentProcessedCount: 8,
      recentFailureCount: 0,
      staleReceivedCount: 0,
      latestProcessedAt: "2026-03-23T18:44:23.000Z",
      latestFailureAt: null,
      latestFailureEventType: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provider: "mercado_pago",
      status: "healthy",
      recentWindowHours: 24,
      staleAfterMinutes: 10,
      recentProcessedCount: 8,
      recentFailureCount: 0,
      staleReceivedCount: 0,
      latestProcessedAt: "2026-03-23T18:44:23.000Z",
      latestFailureAt: null,
      latestFailureEventType: null,
    });
    expect(getBillingWebhookHealthSummaryMock).toHaveBeenCalledWith(
      "mercado_pago",
      expect.any(Date),
      24,
      10,
    );
  });

  it("returns attention when recent failures or stale events exist", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: { uid: "admin-123", email: "admin@example.com" },
      roles: ["admin"],
      accessAllowed: true,
      effectiveStatus: "operator_override",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
    });
    getBillingWebhookHealthSummaryMock.mockResolvedValue({
      provider: "mercado_pago",
      recentProcessedCount: 6,
      recentFailureCount: 1,
      staleReceivedCount: 0,
      latestProcessedAt: "2026-03-23T18:44:23.000Z",
      latestFailureAt: "2026-03-23T18:10:00.000Z",
      latestFailureEventType: "subscription_preapproval.updated",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provider: "mercado_pago",
      status: "attention",
      recentWindowHours: 24,
      staleAfterMinutes: 10,
      recentProcessedCount: 6,
      recentFailureCount: 1,
      staleReceivedCount: 0,
      latestProcessedAt: "2026-03-23T18:44:23.000Z",
      latestFailureAt: "2026-03-23T18:10:00.000Z",
      latestFailureEventType: "subscription_preapproval.updated",
    });
  });
});
