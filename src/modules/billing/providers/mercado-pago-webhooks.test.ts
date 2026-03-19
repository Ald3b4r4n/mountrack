/** @jest-environment node */

import { createHmac } from "node:crypto";
import {
  parseMercadoPagoWebhookPayload,
  verifyMercadoPagoWebhookSignature,
} from "@/modules/billing/providers/mercado-pago-webhooks";

describe("mercado-pago webhooks", () => {
  const originalWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it("parses the Mercado Pago webhook envelope", () => {
    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      type: "payment",
      data: {
        id: "999999999",
      },
    });

    expect(envelope).toEqual({
      payload: expect.objectContaining({
        id: 12345,
        action: "payment.updated",
        type: "payment",
        data: {
          id: "999999999",
        },
      }),
      providerEventId: "12345",
      resourceId: "999999999",
      eventType: "payment.updated",
      requestId: null,
    });
  });

  it("verifies a valid Mercado Pago webhook signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-123";
    const requestId = "request-1";
    const ts = "1710859200";
    const resourceId = "999999999";
    const signature = createHmac("sha256", "secret-123")
      .update(`id:${resourceId};request-id:${requestId};ts:${ts};`)
      .digest("hex");

    const request = new Request(
      `https://mountrack.app/api/billing/webhooks/mercado-pago?data.id=${resourceId}`,
      {
        method: "POST",
        headers: {
          "x-request-id": requestId,
          "x-signature": `ts=${ts},v1=${signature}`,
        },
      },
    );

    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      data: { id: resourceId },
    });

    expect(verifyMercadoPagoWebhookSignature(request, envelope)).toBe(true);
  });

  it("rejects an invalid Mercado Pago webhook signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-123";

    const request = new Request(
      "https://mountrack.app/api/billing/webhooks/mercado-pago?data.id=999999999",
      {
        method: "POST",
        headers: {
          "x-request-id": "request-1",
          "x-signature": "ts=1710859200,v1=deadbeef",
        },
      },
    );

    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      data: { id: "999999999" },
    });

    expect(verifyMercadoPagoWebhookSignature(request, envelope)).toBe(false);
  });
});
