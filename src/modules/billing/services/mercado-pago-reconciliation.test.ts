/** @jest-environment node */

jest.mock("@/modules/billing/providers/mercado-pago", () => ({
  fetchMercadoPagoAuthorizedPayment: jest.fn(),
  fetchMercadoPagoPayment: jest.fn(),
  fetchMercadoPagoPreapproval: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingCheckoutSessionById: jest.fn(),
  getBillingPlanById: jest.fn(),
  updateBillingCheckoutSession: jest.fn(),
  updateBillingEventProcessingStatus: jest.fn(),
  upsertBillingEntitlement: jest.fn(),
  upsertBillingPayment: jest.fn(),
  upsertBillingSubscription: jest.fn(),
}));

import type { BillingEventRecord } from "@/modules/billing/domain/types";
import {
  fetchMercadoPagoAuthorizedPayment,
  fetchMercadoPagoPayment,
  fetchMercadoPagoPreapproval,
} from "@/modules/billing/providers/mercado-pago";
import { parseMercadoPagoWebhookPayload } from "@/modules/billing/providers/mercado-pago-webhooks";
import {
  getBillingCheckoutSessionById,
  getBillingPlanById,
  updateBillingCheckoutSession,
  updateBillingEventProcessingStatus,
  upsertBillingEntitlement,
  upsertBillingPayment,
  upsertBillingSubscription,
} from "@/modules/billing/repositories/billing-store";
import { reconcileMercadoPagoBillingEvent } from "@/modules/billing/services/mercado-pago-reconciliation";

const fetchMercadoPagoAuthorizedPaymentMock = jest.mocked(fetchMercadoPagoAuthorizedPayment);
const fetchMercadoPagoPaymentMock = jest.mocked(fetchMercadoPagoPayment);
const fetchMercadoPagoPreapprovalMock = jest.mocked(fetchMercadoPagoPreapproval);
const getBillingCheckoutSessionByIdMock = jest.mocked(getBillingCheckoutSessionById);
const getBillingPlanByIdMock = jest.mocked(getBillingPlanById);
const updateBillingCheckoutSessionMock = jest.mocked(updateBillingCheckoutSession);
const updateBillingEventProcessingStatusMock = jest.mocked(updateBillingEventProcessingStatus);
const upsertBillingEntitlementMock = jest.mocked(upsertBillingEntitlement);
const upsertBillingPaymentMock = jest.mocked(upsertBillingPayment);
const upsertBillingSubscriptionMock = jest.mocked(upsertBillingSubscription);

describe("mercado-pago reconciliation", () => {
  const eventRecord: BillingEventRecord = {
    id: "evt-1",
    provider: "mercado_pago",
    providerEventId: "12345",
    eventType: "payment.updated",
    signatureVerified: true,
    processingStatus: "received",
    idempotencyKey: "mercado_pago:12345",
    processedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMercadoPagoAuthorizedPaymentMock.mockResolvedValue({
      authorizedPaymentId: "7026602912",
      providerSubscriptionId: "preapproval-123",
      providerPaymentId: "999999999",
      paymentStatus: "approved",
      paymentStatusDetail: "accredited",
      amountCents: 1499,
      currency: "BRL",
      externalReference: "checkout-1",
      approvedAt: "2026-03-19T15:00:00.000Z",
      rawPayload: { id: 7026602912 },
    });
    fetchMercadoPagoPaymentMock.mockResolvedValue({
      providerPaymentId: "999999999",
      status: "approved",
      statusDetail: "accredited",
      amountCents: 1499,
      currency: "BRL",
      externalReference: "checkout-1",
      approvedAt: "2026-03-19T15:00:00.000Z",
      rawPayload: { id: 999999999, status: "approved" },
    });
    getBillingCheckoutSessionByIdMock.mockResolvedValue({
      id: "checkout-1",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      expectedAmountCents: 1499,
      currency: "BRL",
      nonce: "nonce-1",
      providerCheckoutId: "preapproval-123",
      providerCheckoutUrl:
        "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      status: "redirect_ready",
      expiresAt: "2026-03-19T14:30:00.000Z",
      createdAt: "2026-03-19T14:00:00.000Z",
    });
    getBillingPlanByIdMock.mockResolvedValue({
      id: "billing-plan-pro-monthly",
      code: "pro_monthly",
      name: "MounTrack Pro Mensal",
      billingInterval: "monthly",
      amountCents: 1499,
      currency: "BRL",
      trialDays: 7,
      isActive: true,
    });
    updateBillingCheckoutSessionMock.mockResolvedValue(null);
    updateBillingEventProcessingStatusMock.mockResolvedValue(null);
    upsertBillingPaymentMock.mockResolvedValue({
      id: "billing-payment:999999999",
      userId: "user-123",
      subscriptionId: null,
      provider: "mercado_pago",
      providerPaymentId: "999999999",
      providerStatus: "approved",
      internalStatus: "paid",
      amountCents: 1499,
      currency: "BRL",
      paidAt: "2026-03-19T15:00:00.000Z",
      rawReferenceId: "checkout-1",
    });
    upsertBillingEntitlementMock.mockResolvedValue({
      id: "mercado_pago_payment:999999999",
      userId: "user-123",
      sourceType: "subscription",
      sourceId: "999999999",
      status: "active",
      startsAt: "2026-03-19T15:00:00.000Z",
      endsAt: "2026-04-19T15:00:00.000Z",
    });
    upsertBillingSubscriptionMock.mockResolvedValue({
      id: "sub-db-1",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "active",
      trialEndsAt: null,
      currentPeriodStart: "2026-03-19T15:00:00.000Z",
      currentPeriodEnd: "2026-04-19T15:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriodEndsAt: null,
      createdAt: "2026-03-19T15:00:00.000Z",
      updatedAt: "2026-03-19T15:00:00.000Z",
    });
    fetchMercadoPagoPreapprovalMock.mockResolvedValue({
      providerSubscriptionId: "preapproval-123",
      status: "authorized",
      externalReference: "checkout-1",
      nextPaymentDate: "2026-04-19T15:00:00.000Z",
      lastChargedAt: "2026-03-19T15:00:00.000Z",
      rawPayload: { id: "preapproval-123", status: "authorized" },
    });
  });

  it("reconciles an approved payment into payment record, session completion and active entitlement", async () => {
    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      data: { id: "999999999" },
    });

    const result = await reconcileMercadoPagoBillingEvent(eventRecord, envelope);

    expect(result).toEqual({
      processingStatus: "processed",
      duplicate: false,
    });
    expect(upsertBillingPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        subscriptionId: "sub-db-1",
        providerPaymentId: "999999999",
        providerStatus: "approved",
        internalStatus: "paid",
      }),
    );
    expect(upsertBillingSubscriptionMock).toHaveBeenCalledWith({
      id: "billing-subscription:preapproval-123",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "active",
      currentPeriodStart: "2026-03-19T15:00:00.000Z",
      currentPeriodEnd: "2026-04-19T15:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
    expect(updateBillingCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "checkout-1",
        status: "completed",
      }),
    );
    expect(upsertBillingEntitlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mercado_pago_payment:999999999",
        userId: "user-123",
        status: "active",
      }),
    );
    expect(updateBillingEventProcessingStatusMock).toHaveBeenCalledWith("evt-1", "processed");
  });

  it("marks mismatched amount events as fraud hold", async () => {
    fetchMercadoPagoPaymentMock.mockResolvedValue({
      providerPaymentId: "999999999",
      status: "approved",
      statusDetail: "accredited",
      amountCents: 100,
      currency: "BRL",
      externalReference: "checkout-1",
      approvedAt: "2026-03-19T15:00:00.000Z",
      rawPayload: { id: 999999999, status: "approved" },
    });

    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      data: { id: "999999999" },
    });

    const result = await reconcileMercadoPagoBillingEvent(eventRecord, envelope);

    expect(result).toEqual({
      processingStatus: "mismatch",
      duplicate: false,
    });
    expect(upsertBillingEntitlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "fraud_hold",
      }),
    );
    expect(updateBillingEventProcessingStatusMock).toHaveBeenCalledWith("evt-1", "mismatch");
    expect(upsertBillingSubscriptionMock).not.toHaveBeenCalled();
  });

  it("reconciles subscription_authorized_payment by resolving the nested payment id", async () => {
    const envelope = parseMercadoPagoWebhookPayload({
      id: 130077436157,
      type: "subscription_authorized_payment",
      action: "created",
      entity: "authorized_payment",
      data: { id: "7026602912" },
    });

    const result = await reconcileMercadoPagoBillingEvent(eventRecord, envelope);

    expect(result).toEqual({
      processingStatus: "processed",
      duplicate: false,
    });
    expect(fetchMercadoPagoAuthorizedPaymentMock).toHaveBeenCalledWith("7026602912");
    expect(upsertBillingPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerPaymentId: "999999999",
      }),
    );
    expect(updateBillingEventProcessingStatusMock).toHaveBeenCalledWith("evt-1", "processed");
  });

  it("reconciles subscription_preapproval without trying to create a payment row", async () => {
    const envelope = parseMercadoPagoWebhookPayload({
      id: 130077169701,
      type: "subscription_preapproval",
      action: "created",
      entity: "preapproval",
      data: { id: "preapproval-123" },
    });

    const result = await reconcileMercadoPagoBillingEvent(eventRecord, envelope);

    expect(result).toEqual({
      processingStatus: "processed",
      duplicate: false,
    });
    expect(fetchMercadoPagoPreapprovalMock).toHaveBeenCalledWith("preapproval-123");
    expect(upsertBillingSubscriptionMock).toHaveBeenCalledWith({
      id: "billing-subscription:preapproval-123",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "active",
      currentPeriodStart: "2026-03-19T15:00:00.000Z",
      currentPeriodEnd: "2026-04-19T15:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
    expect(upsertBillingPaymentMock).not.toHaveBeenCalled();
    expect(updateBillingEventProcessingStatusMock).toHaveBeenCalledWith("evt-1", "processed");
  });

  it("skips reprocessing already processed events", async () => {
    const envelope = parseMercadoPagoWebhookPayload({
      id: 12345,
      action: "payment.updated",
      data: { id: "999999999" },
    });

    const result = await reconcileMercadoPagoBillingEvent(
      {
        ...eventRecord,
        processingStatus: "processed",
      },
      envelope,
    );

    expect(result).toEqual({
      processingStatus: "processed",
      duplicate: true,
    });
    expect(fetchMercadoPagoPaymentMock).not.toHaveBeenCalled();
  });
});
