import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getMercadoPagoWebhookSecret } from "@/modules/billing/config/mercado-pago";

const mercadoPagoWebhookPayloadSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    live_mode: z.boolean().optional(),
    type: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1).optional(),
    api_version: z.string().trim().min(1).optional(),
    date_created: z.string().trim().min(1).optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    data: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export interface MercadoPagoWebhookEnvelope {
  payload: z.infer<typeof mercadoPagoWebhookPayloadSchema>;
  providerEventId: string;
  resourceId: string | null;
  eventType: string;
  requestId: string | null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function parseSignatureHeader(headerValue: string | null): { ts: string; v1: string } | null {
  if (!headerValue) {
    return null;
  }

  const parts = headerValue.split(",").map((part) => part.trim());
  let ts = "";
  let v1 = "";

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) {
      continue;
    }

    if (key === "ts") {
      ts = value;
    }

    if (key === "v1") {
      v1 = value;
    }
  }

  if (!ts || !v1) {
    return null;
  }

  return { ts, v1 };
}

function areEqualHexSignatures(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function parseMercadoPagoWebhookPayload(payload: unknown): MercadoPagoWebhookEnvelope {
  const parsedPayload = mercadoPagoWebhookPayloadSchema.parse(payload);
  const providerEventId =
    coerceString(parsedPayload.id) ??
    coerceString(parsedPayload.data?.id) ??
    "unknown-notification";
  const resourceId = coerceString(parsedPayload.data?.id) ?? coerceString(parsedPayload.id);
  const eventType = parsedPayload.action ?? parsedPayload.type ?? "unknown";

  return {
    payload: parsedPayload,
    providerEventId,
    resourceId,
    eventType,
    requestId: null,
  };
}

export function verifyMercadoPagoWebhookSignature(
  request: Request,
  envelope: MercadoPagoWebhookEnvelope,
): boolean {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) {
    return false;
  }

  const signature = parseSignatureHeader(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id");
  const resourceId =
    new URL(request.url).searchParams.get("data.id") ??
    envelope.resourceId;

  if (!signature || !requestId || !resourceId) {
    return false;
  }

  const manifest = `id:${resourceId};request-id:${requestId};ts:${signature.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return areEqualHexSignatures(expected, signature.v1.toLowerCase());
}
