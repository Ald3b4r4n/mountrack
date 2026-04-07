/** @jest-environment node */

jest.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  createBillingCheckoutSession: jest.fn(),
  getBillingPlan: jest.fn(),
  getBillingStorageResponse: jest.fn(),
  updateBillingCheckoutSession: jest.fn(),
}));

jest.mock("@/modules/billing/config/stripe", () => ({
  isStripeConfigured: jest.fn(),
  resolveStripeAppBaseUrl: jest.fn(),
}));

jest.mock("@/modules/billing/providers/stripe", () => ({
  createStripeCheckoutSubscriptionSession: jest.fn(),
}));

import { POST } from "@/app/api/billing/checkout/route";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  isStripeConfigured,
  resolveStripeAppBaseUrl,
} from "@/modules/billing/config/stripe";
import { createStripeCheckoutSubscriptionSession } from "@/modules/billing/providers/stripe";
import {
  createBillingCheckoutSession,
  getBillingPlan,
  getBillingStorageResponse,
  updateBillingCheckoutSession,
} from "@/modules/billing/repositories/billing-store";

const verifyFirebaseIdTokenMock = jest.mocked(verifyFirebaseIdToken);
const isStripeConfiguredMock = jest.mocked(isStripeConfigured);
const resolveStripeAppBaseUrlMock = jest.mocked(resolveStripeAppBaseUrl);
const createStripeCheckoutSubscriptionSessionMock = jest.mocked(
  createStripeCheckoutSubscriptionSession,
);
const createBillingCheckoutSessionMock = jest.mocked(
  createBillingCheckoutSession,
);
const getBillingPlanMock = jest.mocked(getBillingPlan);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const updateBillingCheckoutSessionMock = jest.mocked(
  updateBillingCheckoutSession,
);

describe("POST /api/billing/checkout", () => {
  const randomUuidSpy = jest.spyOn(globalThis.crypto, "randomUUID");

  beforeEach(() => {
    jest.clearAllMocks();
    randomUuidSpy.mockReset();
    randomUuidSpy
      .mockReturnValueOnce("checkout-id")
      .mockReturnValueOnce("checkout-nonce");

    verifyFirebaseIdTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "user@example.com",
    } as never);

    isStripeConfiguredMock.mockReturnValue(true);
    resolveStripeAppBaseUrlMock.mockReturnValue("http://localhost");
    getBillingStorageResponseMock.mockReturnValue("database");

    getBillingPlanMock.mockResolvedValue({
      id: "billing-plan-pro-monthly",
      code: "pro_monthly",
      name: "MounTrack Pro Mensal",
      billingInterval: "monthly",
      amountCents: 1499,
      currency: "BRL",
      trialDays: 7,
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

    createStripeCheckoutSubscriptionSessionMock.mockResolvedValue({
      providerCheckoutId: "cs_test_123",
      providerCheckoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      providerSubscriptionId: null,
    });

    updateBillingCheckoutSessionMock.mockResolvedValue({
      id: "checkout-id",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "checkout-nonce",
      providerCheckoutId: "cs_test_123",
      providerCheckoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      status: "redirect_ready",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
  });

  afterAll(() => {
    randomUuidSpy.mockRestore();
  });

  it("creates a Stripe checkout session for the authenticated user", async () => {
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
    expect(createStripeCheckoutSubscriptionSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "checkout-id",
        userId: "user-123",
        planId: "billing-plan-pro-monthly",
        planCode: "pro_monthly",
        planName: "MounTrack Pro Mensal",
        amountCents: 1499,
        currency: "BRL",
        customerEmail: "user@example.com",
        appBaseUrl: "http://localhost",
      }),
    );

    expect(updateBillingCheckoutSessionMock).toHaveBeenCalledWith({
      sessionId: "checkout-id",
      status: "redirect_ready",
      providerCheckoutId: "cs_test_123",
      providerCheckoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    await expect(response.json()).resolves.toEqual({
      session: {
        id: "checkout-id",
        status: "redirect_ready",
        expiresAt: "2026-03-19T14:30:00.000Z",
      },
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      provider: "stripe",
      flow: "redirect",
      paymentMethods: ["card", "apple_pay", "google_pay", "link"],
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

  it("returns 503 when Stripe is not configured", async () => {
    isStripeConfiguredMock.mockReturnValue(false);

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
    expect(createStripeCheckoutSubscriptionSessionMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Stripe checkout session creation fails", async () => {
    createStripeCheckoutSubscriptionSessionMock.mockRejectedValue(
      new Error("STRIPE_CHECKOUT_SESSION_CREATE_FAILED:boom"),
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
