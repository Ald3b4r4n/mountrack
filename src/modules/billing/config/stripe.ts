const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;
const HOSTNAME_PATTERN = /^[\w.-]+\.[A-Za-z]{2,}(?::\d+)?(?:\/.*)?$/;

function coerceBaseUrlCandidate(value: string): string {
  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (URL_SCHEME_PATTERN.test(value)) {
    return value;
  }

  if (HOSTNAME_PATTERN.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function normalizeBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(coerceBaseUrlCandidate(trimmed));
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getStripeSecretKey(): string | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return secretKey || null;
}

export function getStripeWebhookSecret(): string | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  return webhookSecret || null;
}

export function getStripePublishableKey(): string | null {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return publishableKey || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

export function resolveStripeAppBaseUrl(requestUrl?: string): string | null {
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
