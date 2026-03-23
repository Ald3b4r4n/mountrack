import { NextResponse } from "next/server";
import { z } from "zod";
import { getMercadoPagoWebhookSecret } from "@/modules/billing/config/mercado-pago";
import {
  parseMercadoPagoWebhookPayload,
  verifyMercadoPagoWebhookSignature,
} from "@/modules/billing/providers/mercado-pago-webhooks";
import { reconcileMercadoPagoBillingEvent } from "@/modules/billing/services/mercado-pago-reconciliation";
import {
  getBillingStorageResponse,
  recordBillingEventIfNew,
  updateBillingEventProcessingStatus,
} from "@/modules/billing/repositories/billing-store";

export const runtime = "nodejs";

const mercadoPagoWebhookAckSchema = z.object({
  received: z.literal(true),
  duplicate: z.boolean(),
});

export async function POST(request: Request) {
  let recordedEventId: string | null = null;

  if (getBillingStorageResponse() === "unavailable") {
    return NextResponse.json({ error: "Billing storage unavailable" }, { status: 503 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const envelope = parseMercadoPagoWebhookPayload(payload);
    const secretConfigured = Boolean(getMercadoPagoWebhookSecret());
    const signatureVerified = verifyMercadoPagoWebhookSignature(request, envelope);

    if (secretConfigured && !signatureVerified) {
      return NextResponse.json({ error: "Invalid Mercado Pago webhook signature" }, { status: 401 });
    }

    const result = await recordBillingEventIfNew({
      provider: "mercado_pago",
      providerEventId: envelope.providerEventId,
      eventType: envelope.eventType,
      signatureVerified,
      processingStatus: "received",
      idempotencyKey: envelope.requestId ?? `mercado_pago:${envelope.providerEventId}`,
      payload: envelope.payload as Record<string, unknown>,
    });
    recordedEventId = result.record.id;

    const reconciliation = await reconcileMercadoPagoBillingEvent(result.record, envelope);
    const body = mercadoPagoWebhookAckSchema.parse({
      received: true,
      duplicate: reconciliation.duplicate || !result.inserted,
    });

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Mercado Pago webhook payload" }, { status: 400 });
    }

    if (recordedEventId) {
      await updateBillingEventProcessingStatus(recordedEventId, "reconciliation_failed").catch(() => undefined);
    }

    return NextResponse.json({ error: "Failed to ingest Mercado Pago webhook" }, { status: 500 });
  }
}
