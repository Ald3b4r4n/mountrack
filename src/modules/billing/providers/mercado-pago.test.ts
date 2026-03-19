/** @jest-environment node */

import {
  createMercadoPagoPreapproval,
  fetchMercadoPagoPayment,
} from "@/modules/billing/providers/mercado-pago";

describe("mercado-pago provider", () => {
  const originalAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const originalAppBaseUrl = process.env.APP_BASE_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-123";
    process.env.APP_BASE_URL = "https://mountrack.app";
    global.fetch = fetchMock as typeof fetch;
  });

  afterAll(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = originalAccessToken;
    process.env.APP_BASE_URL = originalAppBaseUrl;
  });

  it("creates a recurring preapproval checkout for pending-payment subscriptions", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "preapproval-123",
        init_point:
          "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
        status: "pending",
      }),
    } as Response);

    const subscription = await createMercadoPagoPreapproval({
      sessionId: "checkout-1",
      planName: "MounTrack Pro Mensal",
      amountCents: 1499,
      currency: "BRL",
      payerEmail: "user@example.com",
      appBaseUrl: "https://mountrack.app",
    });

    expect(subscription).toEqual({
      providerSubscriptionId: "preapproval-123",
      providerCheckoutUrl:
        "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      providerStatus: "pending",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer TEST-123",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual(
      expect.objectContaining({
        reason: "MounTrack Pro Mensal",
        external_reference: "checkout-1",
        payer_email: "user@example.com",
        back_url: "https://mountrack.app/subscribe?checkout=subscription",
        status: "pending",
        auto_recurring: expect.objectContaining({
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 14.99,
          currency_id: "BRL",
        }),
      }),
    );
  });

  it("fails fast when Mercado Pago credentials are missing", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "";

    await expect(
      createMercadoPagoPreapproval({
        sessionId: "checkout-1",
        planName: "MounTrack Pro Mensal",
        amountCents: 1499,
        currency: "BRL",
        appBaseUrl: "https://mountrack.app",
      }),
    ).rejects.toThrow("MERCADO_PAGO_NOT_CONFIGURED");
  });

  it("fetches a payment resource for webhook reconciliation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 777,
        status: "approved",
        status_detail: "accredited",
        transaction_amount: 14.99,
        currency_id: "BRL",
        external_reference: "checkout-1",
        date_approved: "2026-03-19T15:00:00.000Z",
      }),
    } as Response);

    const payment = await fetchMercadoPagoPayment("777");

    expect(payment).toEqual({
      providerPaymentId: "777",
      status: "approved",
      statusDetail: "accredited",
      amountCents: 1499,
      currency: "BRL",
      externalReference: "checkout-1",
      approvedAt: "2026-03-19T15:00:00.000Z",
      rawPayload: expect.objectContaining({
        id: 777,
        status: "approved",
      }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/777",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
