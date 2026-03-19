import {
  getMercadoPagoAccessToken,
  getMercadoPagoTestPayerEmail,
  isMercadoPagoSandboxToken,
} from "@/modules/billing/config/mercado-pago";
import { fetchMercadoPagoCollectorProfile } from "@/modules/billing/providers/mercado-pago";

function normalizeEmail(value?: string | null): string {
  return value?.trim() ?? "";
}

function isMercadoPagoTestEmail(value?: string | null): boolean {
  return normalizeEmail(value).toLowerCase().endsWith("@testuser.com");
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
    if (testPayerEmail) {
      return testPayerEmail;
    }

    throw new Error("MERCADO_PAGO_TEST_PAYER_EMAIL_REQUIRED");
  }

  const collectorProfile = await fetchMercadoPagoCollectorProfile();
  if (collectorProfile.isTestUser) {
    if (testPayerEmail) {
      return testPayerEmail;
    }

    throw new Error("MERCADO_PAGO_TEST_PAYER_EMAIL_REQUIRED");
  }

  return normalizedAccountEmail || undefined;
}
