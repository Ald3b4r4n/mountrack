/** @jest-environment node */

jest.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  createBillingCheckoutSession: jest.fn(),
  getBillingPlan: jest.fn(),
  getBillingStorageResponse: jest.fn(),
  updateBillingCheckoutSession: jest.fn(),
  upsertBillingSubscription: jest.fn(),
}));

jest.mock("@/modules/billing/config/mercado-pago", () => ({
  isMercadoPagoConfigured: jest.fn(),
  resolveBillingAppBaseUrl: jest.fn(),
}));

jest.mock("@/modules/billing/providers/mercado-pago", () => ({
  createMercadoPagoPreapproval: jest.fn(),
}));

import { POST } from "@/app/api/billing/checkout/route";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  isMercadoPagoConfigured,
  resolveBillingAppBaseUrl,
} from "@/modules/billing/config/mercado-pago";
import { createMercadoPagoPreapproval } from "@/modules/billing/providers/mercado-pago";
import {
  createBillingCheckoutSession,
  getBillingPlan,
  getBillingStorageResponse,
  updateBillingCheckoutSession,
  upsertBillingSubscription,
} from "@/modules/billing/repositories/billing-store";

const verifyFirebaseIdTokenMock = jest.mocked(verifyFirebaseIdToken);
const isMercadoPagoConfiguredMock = jest.mocked(isMercadoPagoConfigured);
const resolveBillingAppBaseUrlMock = jest.mocked(resolveBillingAppBaseUrl);
const createMercadoPagoPreapprovalMock = jest.mocked(createMercadoPagoPreapproval);
const createBillingCheckoutSessionMock = jest.mocked(createBillingCheckoutSession);
const getBillingPlanMock = jest.mocked(getBillingPlan);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const updateBillingCheckoutSessionMock = jest.mocked(updateBillingCheckoutSession);
const upsertBillingSubscriptionMock = jest.mocked(upsertBillingSubscription);

describe("POST /api/billing/checkout", () => {
  const randomUuidSpy = jest.spyOn(globalThis.crypto, "randomUUID");

  beforeEach(() => {
    jest.clearAllMocks();
    randomUuidSpy.mockReset();
    randomUuidSpy.mockReturnValueOnce("checkout-id").mockReturnValueOnce("checkout-nonce");
    verifyFirebaseIdTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "user@example.com",
    } as never);
    isMercadoPagoConfiguredMock.mockReturnValue(true);
    resolveBillingAppBaseUrlMock.mockReturnValue("http://localhost");
    getBillingStorageResponseMock.mockReturnValue("database");
    getBillingPlanMock.mockResolvedValue({
      id: "billing-plan-pro-monthly",
      code: "pro_monthly",
      name: "MounTrack Pro Mensal",
      billingInterval: "monthly",
      amountCents: 1499,
      currency: "BRL",
      trialDays: 3,
      isActive: true,
    });
    createBillingCheckoutSessionMock.mockResolvedValue({
      id: "checkout-id",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "checkout-nonce",
      providerCheckoutId: null,
      providerCheckoutUrl: null,
      status: "pending",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
    createMercadoPagoPreapprovalMock.mockResolvedValue({
      providerSubscriptionId: "preapproval-123",
      providerCheckoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      providerStatus: "pending",
    });
    upsertBillingSubscriptionMock.mockResolvedValue({
      id: "billing-subscription:preapproval-123",
      userId: "user-123",
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
    updateBillingCheckoutSessionMock.mockResolvedValue({
      id: "checkout-id",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "checkout-nonce",
      providerCheckoutId: "preapproval-123",
      providerCheckoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      status: "redirect_ready",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
  });

  afterAll(() => {
    randomUuidSpy.mockRestore();
  });

  it("creates a Mercado Pago recurring subscription checkout for the authenticated user", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "mt_session=session-token",
        },
        body: JSON.stringify({
          planCode: "pro_monthly",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(verifyFirebaseIdTokenMock).toHaveBeenCalledWith("session-token");
    expect(getBillingPlanMock).toHaveBeenCalledWith("pro_monthly");
    expect(createBillingCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "checkout-id",
        userId: "user-123",
        planId: "billing-plan-pro-monthly",
        expectedAmountCents: 1499,
        currency: "BRL",
        nonce: "checkout-nonce",
        status: "pending",
      }),
    );
    expect(createMercadoPagoPreapprovalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "checkout-id",
        planName: "MounTrack Pro Mensal",
        amountCents: 1499,
        currency: "BRL",
        payerEmail: "user@example.com",
        appBaseUrl: "http://localhost",
      }),
    );
    expect(upsertBillingSubscriptionMock).toHaveBeenCalledWith({
      id: "billing-subscription:preapproval-123",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "pending",
    });
    expect(updateBillingCheckoutSessionMock).toHaveBeenCalledWith({
      sessionId: "checkout-id",
      status: "redirect_ready",
      providerCheckoutId: "preapproval-123",
      providerCheckoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
    });

    await expect(response.json()).resolves.toEqual({
      session: {
        id: "checkout-id",
        status: "redirect_ready",
        expiresAt: "2026-03-19T14:30:00.000Z",
      },
      checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      provider: "mercado_pago",
    });
  });

  it("rejects requests without the server session cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planCode: "pro_monthly" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(verifyFirebaseIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads before touching billing persistence", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "mt_session=session-token",
        },
        body: JSON.stringify({ planCode: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(getBillingPlanMock).not.toHaveBeenCalled();
    expect(createBillingCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns 503 when billing storage is unavailable", async () => {
    getBillingStorageResponseMock.mockReturnValue("unavailable");

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "mt_session=session-token",
        },
        body: JSON.stringify({ planCode: "pro_monthly" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(createBillingCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Mercado Pago is not configured", async () => {
    isMercadoPagoConfiguredMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "mt_session=session-token",
        },
        body: JSON.stringify({ planCode: "pro_monthly" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(createBillingCheckoutSessionMock).not.toHaveBeenCalled();
    expect(createMercadoPagoPreapprovalMock).not.toHaveBeenCalled();
  });

  it("cancels the internal session when Mercado Pago subscription creation fails", async () => {
    createMercadoPagoPreapprovalMock.mockRejectedValue(
      new Error("MERCADO_PAGO_PREAPPROVAL_FAILED:500:boom"),
    );

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "mt_session=session-token",
        },
        body: JSON.stringify({ planCode: "pro_monthly" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(updateBillingCheckoutSessionMock).toHaveBeenCalledWith({
      sessionId: "checkout-id",
      status: "cancelled",
    });
  });
});
