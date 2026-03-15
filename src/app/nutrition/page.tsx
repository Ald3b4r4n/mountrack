import { Suspense } from "react";
import { NutritionScreen } from "@/components/nutrition/NutritionScreen";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";

export default async function NutritionPage() {
  await requireServerAppAccess();

  return (
    <Suspense fallback={null}>
      <NutritionScreen />
    </Suspense>
  );
}
