/** @jest-environment node */

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
  recordBillingEventIfNew: jest.fn(),
}));

jest.mock("@/modules/billing/services/mercado-pago-reconciliation", () => ({
  reconcileMercadoPagoBillingEvent: jest.fn(),
}));

import { createHmac } from "node:crypto";
import { POST } from "@/app/api/billing/webhooks/mercado-pago/route";
import {
  getBillingStorageResponse,
  recordBillingEventIfNew,
} from "@/modules/billing/repositories/billing-store";
import { reconcileMercadoPagoBillingEvent } from "@/modules/billing/services/mercado-pago-reconciliation";

const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const recordBillingEventIfNewMock = jest.mocked(recordBillingEventIfNew);
const reconcileMercadoPagoBillingEventMock = jest.mocked(reconcileMercadoPagoBillingEvent);

describe("POST /api/billing/webhooks/mercado-pago", () => {
  const originalWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    getBillingStorageResponseMock.mockReturnValue("database");
    recordBillingEventIfNewMock.mockResolvedValue({
      inserted: true,
      record: {
        id: "evt-1",
        provider: "mercado_pago",
        providerEventId: "12345",
        eventType: "payment.updated",
        signatureVerified: false,
        processingStatus: "received",
        idempotencyKey: "mercado_pago:12345",
        processedAt: null,
      },
    });
    reconcileMercadoPagoBillingEventMock.mockResolvedValue({
      processingStatus: "processed",
      duplicate: false,
    });
  });

  afterAll(() => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it("records a Mercado Pago webhook event", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/webhooks/mercado-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 12345,
          action: "payment.updated",
          data: {
            id: "999999999",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(recordBillingEventIfNewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "mercado_pago",
        providerEventId: "12345",
        eventType: "payment.updated",
        signatureVerified: false,
      }),
    );
    expect(reconcileMercadoPagoBillingEventMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: false,
    });
  });

  it("rejects invalid signatures when the webhook secret is configured", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-123";

    const response = await POST(
      new Request("http://localhost/api/billing/webhooks/mercado-pago?data.id=999999999", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "request-1",
          "x-signature": "ts=1710859200,v1=deadbeef",
        },
        body: JSON.stringify({
          id: 12345,
          action: "payment.updated",
          data: {
            id: "999999999",
          },
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(recordBillingEventIfNewMock).not.toHaveBeenCalled();
  });

  it("accepts valid signatures when the webhook secret is configured", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-123";
    const ts = "1710859200";
    const requestId = "request-1";
    const resourceId = "999999999";
    const v1 = createHmac("sha256", "secret-123")
      .update(`id:${resourceId};request-id:${requestId};ts:${ts};`)
      .digest("hex");

    const response = await POST(
      new Request(`http://localhost/api/billing/webhooks/mercado-pago?data.id=${resourceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
          "x-signature": `ts=${ts},v1=${v1}`,
        },
        body: JSON.stringify({
          id: 12345,
          action: "payment.updated",
          data: {
            id: resourceId,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(recordBillingEventIfNewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureVerified: true,
      }),
    );
  });

  it("marks duplicate webhooks without failing the ack", async () => {
    recordBillingEventIfNewMock.mockResolvedValue({
      inserted: false,
      record: {
        id: "evt-1",
        provider: "mercado_pago",
        providerEventId: "12345",
        eventType: "payment.updated",
        signatureVerified: false,
        processingStatus: "received",
        idempotencyKey: "mercado_pago:12345",
        processedAt: null,
      },
    });
    reconcileMercadoPagoBillingEventMock.mockResolvedValue({
      processingStatus: "processed",
      duplicate: true,
    });

    const response = await POST(
      new Request("http://localhost/api/billing/webhooks/mercado-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 12345,
          action: "payment.updated",
          data: {
            id: "999999999",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: true,
    });
  });
});
