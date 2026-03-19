import type { BillingAccessStatus, BillingCheckoutSessionStatus, BillingEventRecord } from "@/modules/billing/domain/types";
import type { MercadoPagoWebhookEnvelope } from "@/modules/billing/providers/mercado-pago-webhooks";
import { fetchMercadoPagoPayment } from "@/modules/billing/providers/mercado-pago";
import {
  getBillingCheckoutSessionById,
  getBillingPlanById,
  updateBillingCheckoutSession,
  updateBillingEventProcessingStatus,
  upsertBillingEntitlement,
  upsertBillingPayment,
  upsertBillingSubscription,
} from "@/modules/billing/repositories/billing-store";

export interface MercadoPagoReconciliationResult {
  processingStatus: string;
  duplicate: boolean;
}

function addMonths(baseDateIso: string, months: number): string {
  const date = new Date(baseDateIso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function resolveInternalPaymentStatus(
  providerStatus: string,
  statusDetail: string | null | undefined,
): string {
  if (providerStatus === "approved") {
    return "paid";
  }

  if (providerStatus === "pending" || providerStatus === "in_process") {
    return "pending";
  }

  if (providerStatus === "refunded") {
    return "refunded";
  }

  if (providerStatus === "charged_back" || statusDetail?.toLowerCase().includes("chargeback")) {
    return "chargeback_hold";
  }

  if (providerStatus === "cancelled" || providerStatus === "rejected") {
    return "failed";
  }

  return providerStatus;
}

function resolveCheckoutStatus(providerStatus: string): BillingCheckoutSessionStatus {
  if (providerStatus === "approved" || providerStatus === "refunded" || providerStatus === "charged_back") {
    return "completed";
  }

  if (providerStatus === "cancelled" || providerStatus === "rejected") {
    return "cancelled";
  }

  return "pending";
}

function resolveEntitlementStatus(
  providerStatus: string,
  statusDetail: string | null | undefined,
): BillingAccessStatus | null {
  if (providerStatus === "approved") {
    return "active";
  }

  if (providerStatus === "refunded") {
    return "cancelled";
  }

  if (providerStatus === "charged_back" || statusDetail?.toLowerCase().includes("chargeback")) {
    return "chargeback_hold";
  }

  return null;
}

function resolveSubscriptionStatus(
  providerStatus: string,
  statusDetail: string | null | undefined,
): string {
  if (providerStatus === "approved") {
    return "active";
  }

  if (providerStatus === "pending" || providerStatus === "in_process") {
    return "pending";
  }

  if (providerStatus === "charged_back" || statusDetail?.toLowerCase().includes("chargeback")) {
    return "chargeback_hold";
  }

  if (providerStatus === "cancelled" || providerStatus === "rejected" || providerStatus === "refunded") {
    return "cancelled";
  }

  return providerStatus;
}

export async function reconcileMercadoPagoBillingEvent(
  eventRecord: BillingEventRecord,
  envelope: MercadoPagoWebhookEnvelope,
): Promise<MercadoPagoReconciliationResult> {
  const shouldProcess =
    eventRecord.processingStatus === "received" ||
    eventRecord.processingStatus === "failed" ||
    eventRecord.processingStatus === "reconciliation_failed";

  if (!shouldProcess) {
    return {
      processingStatus: eventRecord.processingStatus,
      duplicate: true,
    };
  }

  const resourceId = envelope.resourceId ?? eventRecord.providerEventId;
  if (!resourceId) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: !shouldProcess,
    };
  }

  const payment = await fetchMercadoPagoPayment(resourceId);
  const checkoutSessionId = payment.externalReference?.trim() ?? "";

  if (!checkoutSessionId) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: false,
    };
  }

  const checkoutSession = await getBillingCheckoutSessionById(checkoutSessionId);
  if (!checkoutSession) {
    await updateBillingEventProcessingStatus(eventRecord.id, "orphaned");
    return {
      processingStatus: "orphaned",
      duplicate: false,
    };
  }

  const plan = await getBillingPlanById(checkoutSession.planId);
  if (!plan) {
    await updateBillingEventProcessingStatus(eventRecord.id, "failed");
    throw new Error("BILLING_PLAN_NOT_FOUND");
  }

  const amountMatches = payment.amountCents === checkoutSession.expectedAmountCents;
  const currencyMatches = payment.currency === checkoutSession.currency;
  const now = new Date().toISOString();
  const subscriptionId = checkoutSession.providerCheckoutId
    ? `billing-subscription:${checkoutSession.providerCheckoutId}`
    : null;

  if (!amountMatches || !currencyMatches) {
    await upsertBillingEntitlement({
      id: `mercado_pago_payment:${payment.providerPaymentId}`,
      userId: checkoutSession.userId,
      sourceType: "subscription",
      sourceId: payment.providerPaymentId,
      status: "fraud_hold",
      startsAt: now,
      endsAt: null,
    });
    await updateBillingEventProcessingStatus(eventRecord.id, "mismatch");

    return {
      processingStatus: "mismatch",
      duplicate: false,
    };
  }

  await upsertBillingPayment({
    id: `billing-payment:${payment.providerPaymentId}`,
    userId: checkoutSession.userId,
    subscriptionId,
    provider: "mercado_pago",
    providerPaymentId: payment.providerPaymentId,
    providerStatus: payment.status,
    internalStatus: resolveInternalPaymentStatus(payment.status, payment.statusDetail),
    amountCents: payment.amountCents,
    currency: payment.currency,
    paidAt: payment.approvedAt ?? null,
    rawReferenceId: checkoutSession.id,
  });

  await updateBillingCheckoutSession({
    sessionId: checkoutSession.id,
    status: resolveCheckoutStatus(payment.status),
    providerCheckoutId: checkoutSession.providerCheckoutId ?? undefined,
    providerCheckoutUrl: checkoutSession.providerCheckoutUrl ?? undefined,
  });

  const entitlementStatus = resolveEntitlementStatus(payment.status, payment.statusDetail);
  if (entitlementStatus) {
    const startsAt = payment.approvedAt ?? now;
    const endsAt = entitlementStatus === "active" ? addMonths(startsAt, 1) : null;

    if (checkoutSession.providerCheckoutId) {
      await upsertBillingSubscription({
        id: `billing-subscription:${checkoutSession.providerCheckoutId}`,
        userId: checkoutSession.userId,
        planId: plan.id,
        providerSubscriptionId: checkoutSession.providerCheckoutId,
        status: resolveSubscriptionStatus(payment.status, payment.statusDetail),
        currentPeriodStart: entitlementStatus === "active" ? startsAt : null,
        currentPeriodEnd: endsAt,
        cancelAtPeriodEnd: entitlementStatus === "cancelled",
        canceledAt: entitlementStatus === "cancelled" ? now : null,
      });
    }

    await upsertBillingEntitlement({
      id: `mercado_pago_payment:${payment.providerPaymentId}`,
      userId: checkoutSession.userId,
      sourceType: "subscription",
      sourceId: payment.providerPaymentId,
      status: entitlementStatus,
      startsAt,
      endsAt,
    });
  } else if (checkoutSession.providerCheckoutId) {
    await upsertBillingSubscription({
      id: `billing-subscription:${checkoutSession.providerCheckoutId}`,
      userId: checkoutSession.userId,
      planId: plan.id,
      providerSubscriptionId: checkoutSession.providerCheckoutId,
      status: resolveSubscriptionStatus(payment.status, payment.statusDetail),
    });
  }

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
}
