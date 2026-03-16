export const NUTRITION_BARCODE_REGEX = /^\d{8,14}$/;

const GS1_AIM_PREFIX_REGEX = /^\][A-Za-z]\d/;
const GS1_GTIN_CAPTURE_REGEX = /01(\d{14})/;

export function normalizeNutritionBarcode(value: string): string | null {
  const scannerPayload = value.trim().replace(GS1_AIM_PREFIX_REGEX, "");
  let digitsOnly = scannerPayload.replace(/\D/g, "");

  // GS1 Application Identifier 01 prefixes GTIN payloads in CODE-128 scans.
  if (digitsOnly.length === 16 && digitsOnly.startsWith("01")) {
    digitsOnly = digitsOnly.slice(2);
  }

  // Handle GS1 payloads that include AI(01) GTIN plus additional AIs.
  if (!NUTRITION_BARCODE_REGEX.test(digitsOnly) && digitsOnly.length > 16) {
    const gs1Match = digitsOnly.match(GS1_GTIN_CAPTURE_REGEX);
    if (gs1Match?.[1]) {
      digitsOnly = gs1Match[1];
    }
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

  const candidates = new Set<string>([normalized]);

  if (normalized.length === 14) {
    if (normalized.startsWith("0")) {
      candidates.add(normalized.slice(1));
    }
    if (normalized.startsWith("00")) {
      candidates.add(normalized.slice(2));
    }
  }

  if (normalized.length === 13) {
    candidates.add(`0${normalized}`);
    if (normalized.startsWith("0")) {
      candidates.add(normalized.slice(1));
    }
  }

  if (normalized.length === 12) {
    candidates.add(`0${normalized}`);
    candidates.add(`00${normalized}`);
  }

  return [...candidates];
}
