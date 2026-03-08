const MAX_WATER_INTAKE_ML = 12000;
export type HydrationInputMode = "increment" | "absolute";

function parseNonNegativeNumber(value: string): number | null {
  const normalizedValue = value.replace(",", ".").trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function parsePositiveNumber(value: string): number | null {
  const parsedValue = parseNonNegativeNumber(value);
  if (parsedValue == null || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildNextHydrationDraft(currentDraft: string, delta: number): string {
  const baseValue = parseNonNegativeNumber(currentDraft) ?? 0;
  return String(Math.round(clampValue(baseValue + delta, 0, MAX_WATER_INTAKE_ML)));
}

export function buildNextWaterIntake(
  currentWaterIntakeMl: number,
  draftValue: string,
  mode: HydrationInputMode = "increment",
): number | null {
  if (mode === "absolute") {
    const correctedTotal = parseNonNegativeNumber(draftValue);
    if (correctedTotal == null) {
      return null;
    }

    return clampValue(correctedTotal, 0, MAX_WATER_INTAKE_ML);
  }

  const increment = parsePositiveNumber(draftValue);
  if (increment == null) {
    return null;
  }

  return clampValue(currentWaterIntakeMl + increment, 0, MAX_WATER_INTAKE_ML);
}
