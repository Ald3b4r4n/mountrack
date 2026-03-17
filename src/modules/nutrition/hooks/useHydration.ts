import { useState } from "react";
import {
  buildNextHydrationDraft,
  buildNextWaterIntake,
  type HydrationInputMode,
} from "@/modules/nutrition/services/hydration-input";

export type { HydrationInputMode };
export { buildNextHydrationDraft, buildNextWaterIntake };

export function useHydration() {
  const [hydrationMode, setHydrationMode] =
    useState<HydrationInputMode>("absolute");
  const [waterDraft, setWaterDraft] = useState("");
  const [isUpdatingWater, setIsUpdatingWater] = useState(false);

  function handleSelectHydrationMode(
    nextMode: HydrationInputMode,
    currentIntake: number,
  ) {
    if (nextMode === hydrationMode) return;

    setHydrationMode(nextMode);
    setWaterDraft(
      nextMode === "absolute" ? String(Math.round(currentIntake)) : "",
    );
  }

  function handleAdjustWater(delta: number) {
    setHydrationMode("increment");
    setWaterDraft((currentValue) =>
      buildNextHydrationDraft(currentValue, delta),
    );
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
