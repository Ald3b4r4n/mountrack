import type {
  MealPlan,
  MealPlanItem,
  MealType,
  NutritionTotals,
} from "@/modules/nutrition/domain/types";
import type { NutritionSearchSource } from "@/modules/nutrition/hooks/useNutritionSearch";

export function roundValue(value: number): number {
  return Number(value.toFixed(2));
}

export function parseInputNumber(value: string): number | null {
  const parsedValue = Number(value.replace(",", "."));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function parseNonNegativeInputNumber(value: string): number | null {
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

export function normalizeMealPlan(plan: MealPlan): MealPlan {
  const meals = plan.meals.map((meal) => ({
    ...meal,
    totalCalories: roundValue(
      meal.items.reduce((total, item) => total + item.calories, 0),
    ),
  }));

  return {
    totalCalories: roundValue(
      meals.reduce((total, meal) => total + meal.totalCalories, 0),
    ),
    meals,
  };
}

export function summarizeMealPlan(
  plan: MealPlan,
): Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat"> {
  return plan.meals.reduce(
    (totals, meal) => {
      for (const item of meal.items) {
        totals.calories += item.calories;
        totals.protein += item.protein;
        totals.carbs += item.carbs;
        totals.fat += item.fat;
      }

      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function scaleMealPlanItem(
  item: MealPlanItem,
  ratio: number,
  quantity: number,
): MealPlanItem {
  return {
    ...item,
    quantity,
    calories: roundValue(item.calories * ratio),
    protein: roundValue(item.protein * ratio),
    carbs: roundValue(item.carbs * ratio),
    fat: roundValue(item.fat * ratio),
    fiber: roundValue(item.fiber * ratio),
    sodium: roundValue(item.sodium * ratio),
  };
}

export function formatSearchSourceLabel(
  source: NutritionSearchSource,
): string | null {
  switch (source) {
    case "catalog":
      return "Catálogo do app";
    case "custom":
      return "Meus alimentos";
    case "external":
      return "Novas referências";
    case "fallback":
      return "Sugestoes do app";
    case "openfoodfacts":
      return "Catálogo aberto";
    case "fatsecret":
      return "FatSecret";
    case "none":
      return "Sem resultado";
    default:
      return null;
  }
}

export function getMealFocusForHour(hour: number): MealType {
  if (hour >= 12 && hour < 14) {
    return "lunch";
  }

  if (hour >= 14 && hour < 18) {
    return "snack";
  }

  if (hour >= 18 && hour <= 23) {
    return "dinner";
  }

  return "breakfast";
}

export function getDefaultFocusedMeal(now: Date = new Date()): MealType {
  return getMealFocusForHour(now.getHours());
}
