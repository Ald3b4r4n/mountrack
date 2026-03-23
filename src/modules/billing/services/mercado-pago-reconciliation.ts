import type { BillingAccessStatus, BillingCheckoutSessionStatus, BillingEventRecord } from "@/modules/billing/domain/types";
import type { MercadoPagoWebhookEnvelope } from "@/modules/billing/providers/mercado-pago-webhooks";
import {
  fetchMercadoPagoAuthorizedPayment,
  fetchMercadoPagoPayment,
  fetchMercadoPagoPreapproval,
} from "@/modules/billing/providers/mercado-pago";
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

interface MercadoPagoPaymentLikeResource {
  providerPaymentId: string;
  status: string;
  statusDetail?: string | null;
  amountCents: number;
  currency: string;
  externalReference?: string | null;
  approvedAt?: string | null;
  providerSubscriptionId?: string | null;
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

function resolveSubscriptionStatusFromPreapproval(providerStatus: string): string {
  if (providerStatus === "authorized") {
    return "active";
  }

  if (providerStatus === "pending") {
    return "pending";
  }

  if (providerStatus === "paused") {
    return "suspended";
  }

  if (providerStatus === "cancelled") {
    return "cancelled";
  }

  return providerStatus;
}

function isAuthorizedPaymentEvent(envelope: MercadoPagoWebhookEnvelope): boolean {
  const payloadType = envelope.payload.type?.toLowerCase() ?? "";
  const entity = typeof envelope.payload.entity === "string" ? envelope.payload.entity.toLowerCase() : "";
  return payloadType === "subscription_authorized_payment" || entity === "authorized_payment";
}

function isPreapprovalEvent(envelope: MercadoPagoWebhookEnvelope): boolean {
  const payloadType = envelope.payload.type?.toLowerCase() ?? "";
  const entity = typeof envelope.payload.entity === "string" ? envelope.payload.entity.toLowerCase() : "";
  return payloadType === "subscription_preapproval" || entity === "preapproval";
}

async function reconcilePaymentLikeResource(
  eventRecord: BillingEventRecord,
  payment: MercadoPagoPaymentLikeResource,
): Promise<MercadoPagoReconciliationResult> {
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
  const providerSubscriptionId = payment.providerSubscriptionId ?? checkoutSession.providerCheckoutId;

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

  const entitlementStatus = resolveEntitlementStatus(payment.status, payment.statusDetail);
  const startsAt = payment.approvedAt ?? now;
  const endsAt = entitlementStatus === "active" ? addMonths(startsAt, 1) : null;
  const subscriptionRecord = providerSubscriptionId
    ? await upsertBillingSubscription({
        id: `billing-subscription:${providerSubscriptionId}`,
        userId: checkoutSession.userId,
        planId: plan.id,
        providerSubscriptionId,
        status: resolveSubscriptionStatus(payment.status, payment.statusDetail),
        currentPeriodStart: entitlementStatus === "active" ? startsAt : null,
        currentPeriodEnd: endsAt,
        cancelAtPeriodEnd: entitlementStatus === "cancelled",
        canceledAt: entitlementStatus === "cancelled" ? now : null,
      })
    : null;

  await upsertBillingPayment({
    id: `billing-payment:${payment.providerPaymentId}`,
    userId: checkoutSession.userId,
    subscriptionId: subscriptionRecord?.id ?? null,
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
    providerCheckoutId: checkoutSession.providerCheckoutId ?? providerSubscriptionId ?? undefined,
    providerCheckoutUrl: checkoutSession.providerCheckoutUrl ?? undefined,
  });

  if (entitlementStatus) {
    await upsertBillingEntitlement({
      id: `mercado_pago_payment:${payment.providerPaymentId}`,
      userId: checkoutSession.userId,
      sourceType: "subscription",
      sourceId: payment.providerPaymentId,
      status: entitlementStatus,
      startsAt,
      endsAt,
    });
  }

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
}

async function reconcilePreapprovalResource(
  eventRecord: BillingEventRecord,
  resourceId: string,
): Promise<MercadoPagoReconciliationResult> {
  const preapproval = await fetchMercadoPagoPreapproval(resourceId);
  const checkoutSessionId = preapproval.externalReference?.trim() ?? "";

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

  await upsertBillingSubscription({
    id: `billing-subscription:${preapproval.providerSubscriptionId}`,
    userId: checkoutSession.userId,
    planId: plan.id,
    providerSubscriptionId: preapproval.providerSubscriptionId,
    status: resolveSubscriptionStatusFromPreapproval(preapproval.status),
    currentPeriodStart: preapproval.lastChargedAt ?? null,
    currentPeriodEnd: preapproval.nextPaymentDate ?? null,
    cancelAtPeriodEnd: preapproval.status === "cancelled",
    canceledAt: preapproval.status === "cancelled" ? new Date().toISOString() : null,
  });

  await updateBillingCheckoutSession({
    sessionId: checkoutSession.id,
    status:
      preapproval.status === "authorized"
        ? "completed"
        : preapproval.status === "cancelled"
          ? "cancelled"
          : checkoutSession.status,
    providerCheckoutId: checkoutSession.providerCheckoutId ?? preapproval.providerSubscriptionId,
    providerCheckoutUrl: checkoutSession.providerCheckoutUrl ?? undefined,
  });

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
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

  if (isPreapprovalEvent(envelope)) {
    return reconcilePreapprovalResource(eventRecord, resourceId);
  }

  if (isAuthorizedPaymentEvent(envelope)) {
    const authorizedPayment = await fetchMercadoPagoAuthorizedPayment(resourceId);
    if (!authorizedPayment.providerPaymentId || !authorizedPayment.paymentStatus) {
      await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
      return {
        processingStatus: "ignored",
        duplicate: false,
      };
    }

    return reconcilePaymentLikeResource(eventRecord, {
      providerPaymentId: authorizedPayment.providerPaymentId,
      status: authorizedPayment.paymentStatus,
      statusDetail: authorizedPayment.paymentStatusDetail,
      amountCents: authorizedPayment.amountCents,
      currency: authorizedPayment.currency,
      externalReference: authorizedPayment.externalReference,
      approvedAt: authorizedPayment.approvedAt,
      providerSubscriptionId: authorizedPayment.providerSubscriptionId,
    });
  }

  const payment = await fetchMercadoPagoPayment(resourceId);
  return reconcilePaymentLikeResource(eventRecord, payment);
}
