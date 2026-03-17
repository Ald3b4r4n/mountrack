import { useState } from "react";

export type HydrationInputMode = "absolute" | "increment";

export function buildNextHydrationDraft(currentDraft: string, delta: number): string {
  const currentVal = Number(currentDraft);
  if (Number.isNaN(currentVal)) {
    return String(Math.max(0, delta));
  }
  return String(Math.max(0, currentVal + delta));
}

export function buildNextWaterIntake(
  currentIntake: number,
  draft: string,
  mode: HydrationInputMode,
): number | null {
  const parsed = Number(draft.replace(",", "."));
  if (Number.isNaN(parsed)) return null;

  if (mode === "absolute") {
    if (parsed < 0 || parsed > 15000) return null;
    return parsed;
  }

  // Allow negative adjustments, but limit the range of a single entry to something reasonable
  if (Math.abs(parsed) > 5000) return null;
  return Math.max(0, Math.min(15000, currentIntake + parsed));
}

export function useHydration() {
  const [hydrationMode, setHydrationMode] = useState<HydrationInputMode>("absolute");
  const [waterDraft, setWaterDraft] = useState("");
  const [isUpdatingWater, setIsUpdatingWater] = useState(false);

  function handleSelectHydrationMode(nextMode: HydrationInputMode, currentIntake: number) {
    if (nextMode === hydrationMode) return;

    setHydrationMode(nextMode);
    setWaterDraft(nextMode === "absolute" ? String(Math.round(currentIntake)) : "");
  }

  function handleAdjustWater(delta: number) {
    setHydrationMode("increment");
    setWaterDraft((currentValue) => buildNextHydrationDraft(currentValue, delta));
  }

  return {
    state: {
      hydrationMode,
      waterDraft,
      isUpdatingWater,
    },
    setters: {
      setHydrationMode,
      setWaterDraft,
      setIsUpdatingWater,
    },
    actions: {
      handleSelectHydrationMode,
      handleAdjustWater,
    },
  };
}
