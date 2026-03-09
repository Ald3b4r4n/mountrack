import { Suspense } from "react";
import { NutritionScreen } from "@/components/nutrition/NutritionScreen";

export default function NutritionPage() {
  return (
    <Suspense fallback={null}>
      <NutritionScreen />
    </Suspense>
  );
}
