import Stripe from "stripe";
import { getStripeSecretKey } from "@/modules/billing/config/stripe";

export interface CreateStripeCheckoutSessionInput {
  sessionId: string;
  userId: string;
  planId: string;
  planCode: string;
  planName: string;
  amountCents: number;
  currency: string;
  customerEmail?: string;
  appBaseUrl: string | null;
}

export interface StripeCheckoutSession {
  providerCheckoutId: string;
  providerCheckoutUrl: string;
  providerSubscriptionId: string | null;
}

let stripeClient: Stripe | null = null;
let stripeClientSecret: string | null = null;

type CheckoutPaymentMethodType =
  Stripe.Checkout.SessionCreateParams.PaymentMethodType;

function toStripeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function resolveCheckoutUrls(appBaseUrl: string | null): {
  successUrl: string;
  cancelUrl: string;
} | null {
  if (!appBaseUrl) {
    return null;
  }

  return {
    successUrl: `${appBaseUrl}/subscribe?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appBaseUrl}/subscribe?checkout=cancelled`,
  };
}

function shouldRetryCheckoutWithoutLink(error: unknown): boolean {
  const normalizedMessage = toStripeError(error).toLowerCase();

  return (
    normalizedMessage.includes("link") &&
    (normalizedMessage.includes("payment method type") ||
      normalizedMessage.includes("payment_method_types") ||
      normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("not supported") ||
      normalizedMessage.includes("activated in your dashboard"))
  );
}

async function createCheckoutSession(
  stripe: Stripe,
  input: CreateStripeCheckoutSessionInput,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>,
  paymentMethodTypes: CheckoutPaymentMethodType[],
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: input.sessionId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: input.customerEmail,
    payment_method_types: paymentMethodTypes,
    locale: "pt-BR",
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          recurring: {
            interval: "month",
          },
          product_data: {
            name: input.planName,
          },
        },
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
  });
}

export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  if (!stripeClient || stripeClientSecret !== secretKey) {
    stripeClient = new Stripe(secretKey);
    stripeClientSecret = secretKey;
  }

  return stripeClient;
}

export async function createStripeCheckoutSubscriptionSession(
  input: CreateStripeCheckoutSessionInput,
): Promise<StripeCheckoutSession> {
  const urls = resolveCheckoutUrls(input.appBaseUrl);
  if (!urls) {
    throw new Error("BILLING_APP_BASE_URL_REQUIRED");
  }

  const stripe = getStripeClient();
  const metadata = {
    billingSessionId: input.sessionId,
    appUserId: input.userId,
    planId: input.planId,
    planCode: input.planCode,
  };

  try {
    let session: Stripe.Checkout.Session;

    try {
      session = await createCheckoutSession(
        stripe,
        input,
        urls.successUrl,
        urls.cancelUrl,
        metadata,
        ["card", "link"],
      );
    } catch (error) {
      if (!shouldRetryCheckoutWithoutLink(error)) {
        throw error;
      }

      session = await createCheckoutSession(
        stripe,
        input,
        urls.successUrl,
        urls.cancelUrl,
        metadata,
        ["card"],
      );
    }

    if (!session.url) {
      throw new Error("STRIPE_CHECKOUT_SESSION_URL_MISSING");
    }

    return {
      providerCheckoutId: session.id,
      providerCheckoutUrl: session.url,
      providerSubscriptionId:
        typeof session.subscription === "string" ? session.subscription : null,
    };
  } catch (error) {
    const message = toStripeError(error);

    if (message.startsWith("STRIPE_")) {
      throw error;
    }

    throw new Error(
      `STRIPE_CHECKOUT_SESSION_CREATE_FAILED:${message.slice(0, 240)}`,
    );
  }
}

export async function cancelStripeSubscription(
  providerSubscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  try {
    return await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    throw new Error(
      `STRIPE_SUBSCRIPTION_CANCEL_FAILED:${toStripeError(error).slice(0, 240)}`,
    );
  }
}

export async function fetchStripeSubscription(
  providerSubscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  try {
    return await stripe.subscriptions.retrieve(providerSubscriptionId);
  } catch (error) {
    throw new Error(
      `STRIPE_SUBSCRIPTION_FETCH_FAILED:${toStripeError(error).slice(0, 240)}`,
    );
  }
}
