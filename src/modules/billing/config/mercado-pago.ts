const MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";

function normalizeBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getMercadoPagoAccessToken(): string | null {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
  return accessToken || null;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getMercadoPagoAccessToken());
}

export function isMercadoPagoSandboxToken(accessToken: string): boolean {
  return accessToken.startsWith("TEST-");
}

export function getMercadoPagoApiBaseUrl(): string {
  return MERCADO_PAGO_API_BASE_URL;
}

export function resolveBillingAppBaseUrl(requestUrl?: string): string | null {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    requestUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getMercadoPagoNotificationUrl(): string | null {
  const configuredUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim() ?? "";
  return configuredUrl || null;
}

export function getMercadoPagoWebhookSecret(): string | null {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() ?? "";
  return secret || null;
}

export function resolveMercadoPagoBackUrls(appBaseUrl: string | null): {
  success: string;
  failure: string;
  pending: string;
} | null {
  if (!appBaseUrl) {
    return null;
  }

  return {
    success: `${appBaseUrl}/subscribe?checkout=success`,
    failure: `${appBaseUrl}/subscribe?checkout=failure`,
    pending: `${appBaseUrl}/subscribe?checkout=pending`,
  };
}
