export const NUTRITION_BARCODE_REGEX = /^\d{8,14}$/;

export function normalizeNutritionBarcode(value: string): string | null {
  let digitsOnly = value.replace(/\D/g, "");

  // GS1 Application Identifier 01 prefixes GTIN payloads in CODE-128 scans.
  if (digitsOnly.length === 16 && digitsOnly.startsWith("01")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (!NUTRITION_BARCODE_REGEX.test(digitsOnly)) {
    return null;
  }

  return digitsOnly;
}

export function buildNutritionBarcodeCandidates(value: string): string[] {
  const normalized = normalizeNutritionBarcode(value);

  if (!normalized) {
    return [];
  }

  if (normalized.length === 14 && normalized.startsWith("0")) {
    return [normalized, normalized.slice(1)];
  }

  return [normalized];
}
