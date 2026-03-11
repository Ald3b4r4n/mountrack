import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { TACO_FOODS } from "@/modules/nutrition/data/taco-foods";
import { generateMealPlan } from "@/modules/nutrition/services/meal-plan.service";
import { getGoal, getNutritionStorageHeaders, listAccessibleFoods, saveMealPlan } from "@/modules/nutrition/repositories/nutrition-store";
import { mealPlanRequestSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const incoming = await request.json();
    const goal = await getGoal(user.uid, defaultGoal);
    const payload = mealPlanRequestSchema.parse({
      targetCalories: incoming.targetCalories ?? goal.targetCalories,
      mealsPerDay: incoming.mealsPerDay ?? 4,
      objective: incoming.objective ?? goal.objective,
      restrictions: incoming.restrictions ?? [],
      preferredFoods: incoming.preferredFoods ?? [],
      excludedFoods: incoming.excludedFoods ?? [],
    });

    const catalogFoods = await listAccessibleFoods(user.uid, { includeInternal: false });
    const foods = catalogFoods.length >= 12 ? [...catalogFoods, ...INTERNAL_FOODS, ...TACO_FOODS] : [...catalogFoods, ...INTERNAL_FOODS, ...TACO_FOODS];
    const mealPlan = generateMealPlan(payload, foods);
    const hasItems = mealPlan.meals.some((meal) => meal.items.length > 0);

    if (!hasItems) {
      return NextResponse.json(
        { error: "Não foi possível montar um cardápio com as escolhas atuais." },
        { status: 422, headers: getNutritionStorageHeaders() },
      );
    }

    await saveMealPlan(user.uid, mealPlan);

    return NextResponse.json({ plan: mealPlan, mealPlan }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to generate meal plan",
      unexpectedStatus: 500,
    });
  }
}
