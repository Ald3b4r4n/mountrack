import type {
  DailySummary,
  DiaryItemSnapshot,
  FoodItem,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import type { MealType } from "@/modules/nutrition/domain/types";
import { getDefaultMealDefinitions } from "@/modules/nutrition/meal-helpers";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";

interface CreateDiaryItemSnapshotInput {
  diaryId: string;
  food: FoodItem;
  quantity: number;
  unit: NutritionUnit;
  mealType: MealType;
  mealLabel?: string;
  consumedAt: string;
}

interface BuildDailySummaryInput {
  date: string;
  targetCalories: number;
  targetWaterMl: number;
  waterIntakeMl: number;
  items: DiaryItemSnapshot[];
}

export function createDiaryItemSnapshot({
  diaryId,
  food,
  quantity,
  unit,
  mealType,
  mealLabel,
  consumedAt,
}: CreateDiaryItemSnapshotInput): DiaryItemSnapshot {
  const totals = calculateNutritionForQuantity({ food, quantity, unit });

  return {
    id: crypto.randomUUID(),
    diaryId,
    foodId: food.id,
    foodName: food.displayName ?? food.name,
    mealType,
    mealLabel,
    quantity,
    unit,
    consumedAt,
    ...totals,
  };
}

export function buildDailySummary({
  date,
  targetCalories,
  targetWaterMl,
  waterIntakeMl,
  items,
}: BuildDailySummaryInput): DailySummary {
  const baseMeals = Object.fromEntries(
    getDefaultMealDefinitions().map((definition) => [definition.key, 0]),
  ) as Record<string, number>;

  const consumedProtein = items.reduce((total, item) => total + item.protein, 0);
  const consumedCarbs = items.reduce((total, item) => total + item.carbs, 0);
  const consumedFat = items.reduce((total, item) => total + item.fat, 0);
  const consumedFiber = items.reduce((total, item) => total + item.fiber, 0);
  const consumedSodium = items.reduce((total, item) => total + item.sodium, 0);
  const consumedCalories = items.reduce((total, item) => total + item.calories, 0);

  for (const item of items) {
    baseMeals[item.mealType] = (baseMeals[item.mealType] ?? 0) + item.calories;
  }

  return {
    date,
    targetCalories,
    targetWaterMl,
    consumedCalories: Number(consumedCalories.toFixed(2)),
    remainingCalories: Number((targetCalories - consumedCalories).toFixed(2)),
    waterIntakeMl: Number(waterIntakeMl.toFixed(2)),
    protein: Number(consumedProtein.toFixed(2)),
    carbs: Number(consumedCarbs.toFixed(2)),
    fat: Number(consumedFat.toFixed(2)),
    fiber: Number(consumedFiber.toFixed(2)),
    sodium: Number(consumedSodium.toFixed(2)),
    calories: Number(consumedCalories.toFixed(2)),
    meals: Object.fromEntries(
      Object.entries(baseMeals).map(([mealKey, value]) => [mealKey, Number(value.toFixed(2))]),
    ),
  };
}
