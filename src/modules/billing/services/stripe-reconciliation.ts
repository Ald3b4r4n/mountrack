import type Stripe from "stripe";
import type {
  BillingAccessStatus,
  BillingCheckoutSessionStatus,
  BillingEventRecord,
} from "@/modules/billing/domain/types";
import { fetchStripeSubscription } from "@/modules/billing/providers/stripe";
import {
  getBillingCheckoutSessionById,
  updateBillingCheckoutSession,
  updateBillingEventProcessingStatus,
  upsertBillingEntitlement,
  upsertBillingPayment,
  upsertBillingSubscription,
} from "@/modules/billing/repositories/billing-store";

export interface StripeReconciliationResult {
  processingStatus: string;
  duplicate: boolean;
}

interface SubscriptionFallbackContext {
  userId?: string | null;
  planId?: string | null;
  billingSessionId?: string | null;
}

function readMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function readStripeResourceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.trim()
  ) {
    return value.id.trim();
  }

  return null;
}

function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function resolveSubscriptionStatus(status: Stripe.Subscription.Status): string {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  if (status === "past_due" || status === "unpaid" || status === "incomplete") {
    return "past_due";
  }

  if (status === "paused") {
    return "suspended";
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "cancelled";
  }

  return status;
}

function resolveEntitlementStatus(
  status: Stripe.Subscription.Status,
): BillingAccessStatus | null {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  if (status === "past_due" || status === "unpaid" || status === "incomplete") {
    return "past_due";
  }

  if (status === "paused") {
    return "suspended";
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "cancelled";
  }

  return null;
}

function resolveCheckoutStatusFromSubscription(
  status: Stripe.Subscription.Status,
): BillingCheckoutSessionStatus {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "incomplete"
  ) {
    return "completed";
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "cancelled";
  }

  return "pending";
}

function resolveSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
} {
  const firstItem = subscription.items.data[0];

  return {
    currentPeriodStart: toIsoFromUnixSeconds(firstItem?.current_period_start),
    currentPeriodEnd: toIsoFromUnixSeconds(firstItem?.current_period_end),
  };
}

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return readStripeResourceId(
    invoice.parent?.subscription_details?.subscription,
  );
}

function resolveInvoicePaymentId(
  invoice: Stripe.Invoice,
  eventRecord: BillingEventRecord,
): string {
  const firstPayment = invoice.payments?.data[0]?.payment;

  return (
    readStripeResourceId(firstPayment?.payment_intent) ??
    readStripeResourceId(firstPayment?.charge) ??
    invoice.id ??
    eventRecord.providerEventId
  );
}

function resolveInvoicePaidAt(invoice: Stripe.Invoice): string | null {
  const paidAt = invoice.payments?.data[0]?.status_transitions?.paid_at ?? null;
  return toIsoFromUnixSeconds(paidAt);
}

async function reconcileSubscriptionSnapshot(
  subscription: Stripe.Subscription,
  fallback: SubscriptionFallbackContext = {},
): Promise<{ processed: boolean; userId?: string; planId?: string }> {
  let userId =
    readMetadataValue(subscription.metadata, "appUserId") ??
    fallback.userId ??
    null;
  let planId =
    readMetadataValue(subscription.metadata, "planId") ??
    fallback.planId ??
    null;
  const billingSessionId =
    readMetadataValue(subscription.metadata, "billingSessionId") ??
    fallback.billingSessionId ??
    null;

  if ((!userId || !planId) && billingSessionId) {
    const checkoutSession =
      await getBillingCheckoutSessionById(billingSessionId);
    if (checkoutSession) {
      userId = userId ?? checkoutSession.userId;
      planId = planId ?? checkoutSession.planId;
    }
  }

  if (!userId || !planId) {
    return { processed: false };
  }

  const { currentPeriodStart, currentPeriodEnd } =
    resolveSubscriptionPeriod(subscription);
  const canceledAt = toIsoFromUnixSeconds(subscription.canceled_at);

  await upsertBillingSubscription({
    id: `billing-subscription:${subscription.id}`,
    userId,
    planId,
    providerSubscriptionId: subscription.id,
    status: resolveSubscriptionStatus(subscription.status),
    trialEndsAt: toIsoFromUnixSeconds(subscription.trial_end),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt,
  });

  const entitlementStatus = resolveEntitlementStatus(subscription.status);
  if (entitlementStatus) {
    await upsertBillingEntitlement({
      id: `stripe_subscription:${subscription.id}`,
      userId,
      sourceType: "subscription",
      sourceId: subscription.id,
      status: entitlementStatus,
      startsAt: currentPeriodStart ?? new Date().toISOString(),
      endsAt: entitlementStatus === "cancelled" ? null : currentPeriodEnd,
    });
  }

  if (billingSessionId) {
    await updateBillingCheckoutSession({
      sessionId: billingSessionId,
      status: resolveCheckoutStatusFromSubscription(subscription.status),
    });
  }

  return {
    processed: true,
    userId,
    planId,
  };
}

async function reconcileCheckoutSessionEvent(
  eventRecord: BillingEventRecord,
  checkoutSession: Stripe.Checkout.Session,
  isCompleted: boolean,
): Promise<StripeReconciliationResult> {
  const billingSessionId =
    checkoutSession.client_reference_id ??
    readMetadataValue(checkoutSession.metadata, "billingSessionId");

  if (!billingSessionId) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: false,
    };
  }

  const internalSession = await getBillingCheckoutSessionById(billingSessionId);
  if (!internalSession) {
    await updateBillingEventProcessingStatus(eventRecord.id, "orphaned");
    return {
      processingStatus: "orphaned",
      duplicate: false,
    };
  }

  await updateBillingCheckoutSession({
    sessionId: internalSession.id,
    status: isCompleted ? "completed" : "expired",
    providerCheckoutId: checkoutSession.id,
    providerCheckoutUrl: checkoutSession.url ?? undefined,
  });

  if (isCompleted) {
    const subscriptionId = readStripeResourceId(checkoutSession.subscription);
    if (subscriptionId) {
      const subscription = await fetchStripeSubscription(subscriptionId);
      await reconcileSubscriptionSnapshot(subscription, {
        userId:
          readMetadataValue(checkoutSession.metadata, "appUserId") ??
          internalSession.userId,
        planId:
          readMetadataValue(checkoutSession.metadata, "planId") ??
          internalSession.planId,
        billingSessionId: internalSession.id,
      });
    }
  }

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
}

async function reconcileSubscriptionEvent(
  eventRecord: BillingEventRecord,
  subscription: Stripe.Subscription,
): Promise<StripeReconciliationResult> {
  const result = await reconcileSubscriptionSnapshot(subscription);

  if (!result.processed) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: false,
    };
  }

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
}

async function reconcileInvoiceEvent(
  eventRecord: BillingEventRecord,
  invoice: Stripe.Invoice,
  eventType: string,
): Promise<StripeReconciliationResult> {
  const subscriptionId = resolveInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: false,
    };
  }

  const subscription = await fetchStripeSubscription(subscriptionId);
  const result = await reconcileSubscriptionSnapshot(subscription, {
    billingSessionId: readMetadataValue(invoice.metadata, "billingSessionId"),
  });

  if (!result.processed || !result.userId || !result.planId) {
    await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
    return {
      processingStatus: "ignored",
      duplicate: false,
    };
  }

  const providerPaymentId = resolveInvoicePaymentId(invoice, eventRecord);
  const amountCents =
    eventType === "invoice.payment_failed"
      ? Math.max(invoice.amount_due, 0)
      : Math.max(invoice.amount_paid, 0);

  await upsertBillingPayment({
    id: `billing-payment:${providerPaymentId}`,
    userId: result.userId,
    subscriptionId: `billing-subscription:${subscription.id}`,
    provider: "stripe",
    providerPaymentId,
    providerStatus: eventType,
    internalStatus: eventType === "invoice.payment_failed" ? "failed" : "paid",
    amountCents,
    currency: invoice.currency.toUpperCase(),
    paidAt:
      eventType === "invoice.payment_failed"
        ? null
        : resolveInvoicePaidAt(invoice),
    rawReferenceId: invoice.id ?? null,
  });

  await updateBillingEventProcessingStatus(eventRecord.id, "processed");

  return {
    processingStatus: "processed",
    duplicate: false,
  };
}

export async function reconcileStripeBillingEvent(
  eventRecord: BillingEventRecord,
  event: Stripe.Event,
): Promise<StripeReconciliationResult> {
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

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return reconcileCheckoutSessionEvent(
        eventRecord,
        event.data.object as Stripe.Checkout.Session,
        true,
      );

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return reconcileCheckoutSessionEvent(
        eventRecord,
        event.data.object as Stripe.Checkout.Session,
        false,
      );

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return reconcileSubscriptionEvent(
        eventRecord,
        event.data.object as Stripe.Subscription,
      );

    case "invoice.paid":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      return reconcileInvoiceEvent(
        eventRecord,
        event.data.object as Stripe.Invoice,
        event.type,
      );

    default:
      await updateBillingEventProcessingStatus(eventRecord.id, "ignored");
      return {
        processingStatus: "ignored",
        duplicate: false,
      };
  }
}
