import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripeWebhookSecret } from "@/modules/billing/config/stripe";
import { getStripeClient } from "@/modules/billing/providers/stripe";
import { reconcileStripeBillingEvent } from "@/modules/billing/services/stripe-reconciliation";
import {
  getBillingStorageResponse,
  recordBillingEventIfNew,
  updateBillingEventProcessingStatus,
} from "@/modules/billing/repositories/billing-store";

export const runtime = "nodejs";

const stripeWebhookAckSchema = z.object({
  received: z.literal(true),
  duplicate: z.boolean(),
});

const stripeEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
});

function buildStripeWebhookEvent(
  rawBody: string,
  signature: string | null,
): { event: Stripe.Event; signatureVerified: boolean } {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    const parsed = JSON.parse(rawBody || "{}");
    const event = parsed as Stripe.Event;
    stripeEventSchema.parse({
      id: event.id,
      type: event.type,
    });

    return {
      event,
      signatureVerified: false,
    };
  }

  if (!signature) {
    throw new Error("STRIPE_WEBHOOK_SIGNATURE_INVALID");
  }

  try {
    const event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    return {
      event,
      signatureVerified: true,
    };
  } catch {
    throw new Error("STRIPE_WEBHOOK_SIGNATURE_INVALID");
  }
}

export async function POST(request: Request) {
  let recordedEventId: string | null = null;

  if (getBillingStorageResponse() === "unavailable") {
    return NextResponse.json(
      { error: "Billing storage unavailable" },
      { status: 503 },
    );
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const { event, signatureVerified } = buildStripeWebhookEvent(
      rawBody,
      signature,
    );

    const result = await recordBillingEventIfNew({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      signatureVerified,
      processingStatus: "received",
      idempotencyKey: `stripe:${event.id}`,
      payload: event as unknown as Record<string, unknown>,
    });
    recordedEventId = result.record.id;

    const reconciliation = await reconcileStripeBillingEvent(
      result.record,
      event,
    );
    const body = stripeWebhookAckSchema.parse({
      received: true,
      duplicate: reconciliation.duplicate || !result.inserted,
    });

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid Stripe webhook payload" },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "STRIPE_WEBHOOK_SIGNATURE_INVALID"
    ) {
      return NextResponse.json(
        { error: "Invalid Stripe webhook signature" },
        { status: 401 },
      );
    }

    if (recordedEventId) {
      await updateBillingEventProcessingStatus(
        recordedEventId,
        "reconciliation_failed",
      ).catch(() => undefined);
    }

    return NextResponse.json(
      { error: "Failed to ingest Stripe webhook" },
      { status: 500 },
    );
  }
}
