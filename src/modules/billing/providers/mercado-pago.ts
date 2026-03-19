import { z } from "zod";
import {
  getMercadoPagoAccessToken,
  getMercadoPagoApiBaseUrl,
} from "@/modules/billing/config/mercado-pago";

export interface CreateMercadoPagoPreapprovalInput {
  sessionId: string;
  planName: string;
  amountCents: number;
  currency: string;
  payerEmail?: string;
  appBaseUrl: string | null;
}

export interface MercadoPagoPreapproval {
  providerSubscriptionId: string;
  providerCheckoutUrl: string;
  providerStatus: string;
}

export interface MercadoPagoPaymentResource {
  providerPaymentId: string;
  status: string;
  statusDetail?: string | null;
  amountCents: number;
  currency: string;
  externalReference?: string | null;
  approvedAt?: string | null;
  rawPayload: Record<string, unknown>;
}

const mercadoPagoPreapprovalResponseSchema = z.object({
  id: z.string().trim().min(1),
  init_point: z.string().trim().url(),
  status: z.string().trim().min(1),
});

const mercadoPagoPaymentResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    status: z.string().trim().min(1),
    status_detail: z.string().trim().min(1).nullable().optional(),
    transaction_amount: z.number(),
    currency_id: z.string().trim().min(1),
    external_reference: z.string().trim().min(1).nullable().optional(),
    date_approved: z.string().trim().min(1).nullable().optional(),
  })
  .passthrough();

export async function createMercadoPagoPreapproval(
  input: CreateMercadoPagoPreapprovalInput,
): Promise<MercadoPagoPreapproval> {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_NOT_CONFIGURED");
  }

  const response = await fetch(`${getMercadoPagoApiBaseUrl()}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: input.planName,
      external_reference: input.sessionId,
      payer_email: input.payerEmail,
      back_url: input.appBaseUrl ? `${input.appBaseUrl}/subscribe?checkout=subscription` : undefined,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number((input.amountCents / 100).toFixed(2)),
        currency_id: input.currency,
        end_date: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`MERCADO_PAGO_PREAPPROVAL_FAILED:${response.status}:${payload.slice(0, 240)}`);
  }

  const parsed = mercadoPagoPreapprovalResponseSchema.parse(await response.json());

  return {
    providerSubscriptionId: parsed.id,
    providerCheckoutUrl: parsed.init_point,
    providerStatus: parsed.status,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentResource> {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_NOT_CONFIGURED");
  }

  const response = await fetch(`${getMercadoPagoApiBaseUrl()}/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`MERCADO_PAGO_PAYMENT_FETCH_FAILED:${response.status}:${payload.slice(0, 240)}`);
  }

  const parsed = mercadoPagoPaymentResponseSchema.parse(await response.json());

  return {
    providerPaymentId: String(parsed.id),
    status: parsed.status,
    statusDetail: parsed.status_detail ?? null,
    amountCents: Math.round(parsed.transaction_amount * 100),
    currency: parsed.currency_id,
    externalReference: parsed.external_reference ?? null,
    approvedAt: parsed.date_approved ?? null,
    rawPayload: parsed as Record<string, unknown>,
  };
}
