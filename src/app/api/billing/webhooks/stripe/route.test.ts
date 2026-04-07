/** @jest-environment node */

jest.mock("@/modules/billing/config/stripe", () => ({
  getStripeWebhookSecret: jest.fn(),
}));

jest.mock("@/modules/billing/providers/stripe", () => ({
  getStripeClient: jest.fn(),
}));

jest.mock("@/modules/billing/services/stripe-reconciliation", () => ({
  reconcileStripeBillingEvent: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
  recordBillingEventIfNew: jest.fn(),
  updateBillingEventProcessingStatus: jest.fn(),
}));

import { POST } from "@/app/api/billing/webhooks/stripe/route";
import { getStripeWebhookSecret } from "@/modules/billing/config/stripe";
import { getStripeClient } from "@/modules/billing/providers/stripe";
import { reconcileStripeBillingEvent } from "@/modules/billing/services/stripe-reconciliation";
import {
  getBillingStorageResponse,
  recordBillingEventIfNew,
  updateBillingEventProcessingStatus,
} from "@/modules/billing/repositories/billing-store";

const getStripeWebhookSecretMock = jest.mocked(getStripeWebhookSecret);
const getStripeClientMock = jest.mocked(getStripeClient);
const reconcileStripeBillingEventMock = jest.mocked(
  reconcileStripeBillingEvent,
);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const recordBillingEventIfNewMock = jest.mocked(recordBillingEventIfNew);
const updateBillingEventProcessingStatusMock = jest.mocked(
  updateBillingEventProcessingStatus,
);

describe("POST /api/billing/webhooks/stripe", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getBillingStorageResponseMock.mockReturnValue("database");
    getStripeWebhookSecretMock.mockReturnValue(null);

    recordBillingEventIfNewMock.mockResolvedValue({
      inserted: true,
      record: {
        id: "billing-event-123",
        provider: "stripe",
        providerEventId: "evt_123",
        eventType: "checkout.session.completed",
        signatureVerified: false,
        processingStatus: "received",
        idempotencyKey: "stripe:evt_123",
        processedAt: null,
      },
    });

    reconcileStripeBillingEventMock.mockResolvedValue({
      processingStatus: "processed",
      duplicate: false,
    });
  });

  it("records and reconciles a Stripe webhook event", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "evt_123",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_123",
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(recordBillingEventIfNewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "stripe",
        providerEventId: "evt_123",
        eventType: "checkout.session.completed",
      }),
    );
    expect(reconcileStripeBillingEventMock).toHaveBeenCalled();

    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: false,
    });
  });

  it("returns 401 for invalid Stripe signature when webhook secret is configured", async () => {
    getStripeWebhookSecretMock.mockReturnValue("whsec_123");
    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn(() => {
          throw new Error("invalid signature");
        }),
      },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/billing/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1,v1=bad",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(401);
    expect(recordBillingEventIfNewMock).not.toHaveBeenCalled();
    expect(updateBillingEventProcessingStatusMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid Stripe webhook signature",
    });
  });
});
