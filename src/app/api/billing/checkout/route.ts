import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  BILLING_MONTHLY_PLAN_CODE,
  type BillingCheckoutSessionStatus,
} from "@/modules/billing/domain/types";
import { APP_SESSION_COOKIE_NAME } from "@/modules/billing/auth/session-cookie";
import {
  createBillingCheckoutSession,
  getBillingPlan,
  getBillingStorageResponse,
  updateBillingCheckoutSession,
} from "@/modules/billing/repositories/billing-store";
import {
  isStripeConfigured,
  resolveStripeAppBaseUrl,
} from "@/modules/billing/config/stripe";
import { createStripeCheckoutSubscriptionSession } from "@/modules/billing/providers/stripe";

export const runtime = "nodejs";

const checkoutRequestSchema = z
  .object({
    planCode: z.string().trim().min(1).optional(),
  })
  .strict();

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === APP_SESSION_COOKIE_NAME) {
      return rawValue.join("=") || null;
    }
  }

  return null;
}

function createJsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const sessionToken = readSessionToken(request);
  if (!sessionToken) {
    return createJsonError("Missing authenticated session", 401);
  }

  let sessionId: string | null = null;

  try {
    const payload = checkoutRequestSchema.parse(
      await request.json().catch(() => ({})),
    );

    if (getBillingStorageResponse() === "unavailable") {
      return createJsonError("Billing storage unavailable", 503);
    }

    if (!isStripeConfigured()) {
      return createJsonError("Stripe checkout unavailable", 503);
    }

    const decodedToken = await verifyFirebaseIdToken(sessionToken);
    const plan = await getBillingPlan(
      payload.planCode ?? BILLING_MONTHLY_PLAN_CODE,
    );

    if (!plan) {
      return createJsonError("Billing plan not found", 404);
    }

    if (!plan.isActive) {
      return createJsonError("Billing plan unavailable", 409);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const status: BillingCheckoutSessionStatus = "pending";

    const session = await createBillingCheckoutSession({
      id: crypto.randomUUID(),
      userId: decodedToken.uid,
      planId: plan.id,
      expectedAmountCents: plan.amountCents,
      currency: plan.currency,
      nonce: crypto.randomUUID(),
      status,
      expiresAt,
    });
    sessionId = session.id;

    const checkout = await createStripeCheckoutSubscriptionSession({
      sessionId: session.id,
      userId: decodedToken.uid,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      amountCents: plan.amountCents,
      currency: plan.currency,
      customerEmail:
        typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      appBaseUrl: resolveStripeAppBaseUrl(request.url),
    });
    const checkoutSessionStatus: BillingCheckoutSessionStatus =
      "redirect_ready";

    const readySession = await updateBillingCheckoutSession({
      sessionId: session.id,
      status: checkoutSessionStatus,
      providerCheckoutId: checkout.providerCheckoutId,
      providerCheckoutUrl: checkout.providerCheckoutUrl,
    });

    if (!readySession) {
      return createJsonError("Failed to prepare Stripe checkout", 502);
    }

    return NextResponse.json(
      {
        session: {
          id: readySession.id,
          status: readySession.status,
          expiresAt: readySession.expiresAt,
        },
        checkoutUrl: checkout.providerCheckoutUrl,
        provider: "stripe",
        flow: "redirect",
        paymentMethods: ["card", "apple_pay", "google_pay", "link"],
      },
      { status: 201 },
    );
  } catch (error) {
    if (sessionId) {
      await updateBillingCheckoutSession({
        sessionId,
        status: "cancelled",
      }).catch(() => undefined);
    }

    if (error instanceof z.ZodError) {
      return createJsonError("Invalid request payload", 400);
    }

    if (error instanceof Error && error.message === "STRIPE_NOT_CONFIGURED") {
      return createJsonError("Stripe checkout unavailable", 503);
    }

    if (
      error instanceof Error &&
      error.message === "BILLING_APP_BASE_URL_REQUIRED"
    ) {
      return createJsonError("Billing checkout URL unavailable", 503);
    }

    if (error instanceof Error && error.message.startsWith("STRIPE_")) {
      return createJsonError("Failed to create Stripe checkout session", 502);
    }

    return createJsonError("Failed to create checkout session", 500);
  }
}
