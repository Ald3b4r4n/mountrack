import {
  getMercadoPagoAccessToken,
  getMercadoPagoTestPayerEmail,
  isMercadoPagoSandboxToken,
} from "@/modules/billing/config/mercado-pago";
import { fetchMercadoPagoCollectorProfile } from "@/modules/billing/providers/mercado-pago";

function normalizeEmail(value?: string | null): string {
  return value?.trim() ?? "";
}

function isValidEmail(value?: string | null): boolean {
  const normalized = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isMercadoPagoTestEmail(value?: string | null): boolean {
  return normalizeEmail(value).toLowerCase().endsWith("@testuser.com");
}

function requireValidMercadoPagoTestPayerEmail(testPayerEmail: string | null): string {
  if (!testPayerEmail) {
    throw new Error("MERCADO_PAGO_TEST_PAYER_EMAIL_REQUIRED");
  }

  if (!isValidEmail(testPayerEmail)) {
    throw new Error("MERCADO_PAGO_TEST_PAYER_EMAIL_INVALID");
  }

  return testPayerEmail;
}

export async function resolveMercadoPagoCheckoutPayerEmail(
  accountEmail?: string | null,
): Promise<string | undefined> {
  const normalizedAccountEmail = normalizeEmail(accountEmail);
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    return normalizedAccountEmail || undefined;
  }

  if (isMercadoPagoTestEmail(normalizedAccountEmail)) {
    return normalizedAccountEmail;
  }

  const testPayerEmail = getMercadoPagoTestPayerEmail();
  if (isMercadoPagoSandboxToken(accessToken)) {
    return requireValidMercadoPagoTestPayerEmail(testPayerEmail);
  }

  const collectorProfile = await fetchMercadoPagoCollectorProfile();
  if (collectorProfile.isTestUser) {
    return requireValidMercadoPagoTestPayerEmail(testPayerEmail);
  }

  return normalizedAccountEmail || undefined;
}
