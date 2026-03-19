import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  BILLING_MONTHLY_PLAN_CODE,
  type BillingCheckoutSessionStatus,
} from "@/modules/billing/domain/types";
import { APP_SESSION_COOKIE_NAME } from "@/modules/billing/auth/session-cookie";
import {
  isMercadoPagoConfigured,
  resolveBillingAppBaseUrl,
} from "@/modules/billing/config/mercado-pago";
import { createMercadoPagoPreapproval } from "@/modules/billing/providers/mercado-pago";
import {
  createBillingCheckoutSession,
  getBillingPlan,
  getBillingStorageResponse,
  updateBillingCheckoutSession,
  upsertBillingSubscription,
} from "@/modules/billing/repositories/billing-store";

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
    const payload = checkoutRequestSchema.parse(await request.json().catch(() => ({})));

    if (getBillingStorageResponse() === "unavailable") {
      return createJsonError("Billing storage unavailable", 503);
    }

    if (!isMercadoPagoConfigured()) {
      return createJsonError("Mercado Pago checkout unavailable", 503);
    }

    const decodedToken = await verifyFirebaseIdToken(sessionToken);
    const plan = await getBillingPlan(payload.planCode ?? BILLING_MONTHLY_PLAN_CODE);

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

    const subscription = await createMercadoPagoPreapproval({
      sessionId: session.id,
      planName: plan.name,
      amountCents: plan.amountCents,
      currency: plan.currency,
      payerEmail: typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      appBaseUrl: resolveBillingAppBaseUrl(request.url),
    });

    await upsertBillingSubscription({
      id: `billing-subscription:${subscription.providerSubscriptionId}`,
      userId: decodedToken.uid,
      planId: plan.id,
      providerSubscriptionId: subscription.providerSubscriptionId,
      status: subscription.providerStatus,
    });

    const readySession = await updateBillingCheckoutSession({
      sessionId: session.id,
      status: "redirect_ready",
      providerCheckoutId: subscription.providerSubscriptionId,
      providerCheckoutUrl: subscription.providerCheckoutUrl,
    });

    if (!readySession?.providerCheckoutUrl) {
      return createJsonError("Failed to prepare Mercado Pago subscription checkout", 502);
    }

    return NextResponse.json(
      {
        session: {
          id: readySession.id,
          status: readySession.status,
          expiresAt: readySession.expiresAt,
        },
        checkoutUrl: readySession.providerCheckoutUrl,
        provider: "mercado_pago",
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

    if (error instanceof Error && error.message === "MERCADO_PAGO_NOT_CONFIGURED") {
      return createJsonError("Mercado Pago checkout unavailable", 503);
    }

    if (error instanceof Error && error.message.startsWith("MERCADO_PAGO_")) {
      return createJsonError("Failed to create Mercado Pago subscription checkout", 502);
    }

    return createJsonError("Failed to create checkout session", 500);
  }
}
