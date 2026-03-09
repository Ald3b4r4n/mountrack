import type {
  DailySummary,
  DiaryItemSnapshot,
  FoodItem,
  MealDefinition,
  MealPlan,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import { getDefaultMealDefinitions } from "@/modules/nutrition/meal-helpers";
import type { MissingFoodLookupRecord } from "@/modules/nutrition/repositories/missing-food-lookup";

export interface DiaryRecord {
  id: string;
  userId: string;
  date: string;
  targetCalories: number;
  targetWaterMl: number;
  waterIntakeMl: number;
  mealDefinitions: MealDefinition[];
  items: DiaryItemSnapshot[];
}

interface NutritionMemoryStore {
  cachedFoods: Map<string, FoodItem>;
  userCustomFoods: Map<string, FoodItem>;
  missingFoodLookups: Map<string, MissingFoodLookupRecord>;
  goals: Map<string, NutritionGoal>;
  diaries: Map<string, DiaryRecord>;
  mealPlans: Map<string, MealPlan>;
}

const globalStore = globalThis as typeof globalThis & {
  __nutritionStore__?: NutritionMemoryStore;
};

export function getNutritionMemoryStore(): NutritionMemoryStore {
  if (!globalStore.__nutritionStore__) {
    globalStore.__nutritionStore__ = {
      cachedFoods: new Map<string, FoodItem>(),
      userCustomFoods: new Map<string, FoodItem>(),
      missingFoodLookups: new Map<string, MissingFoodLookupRecord>(),
      goals: new Map<string, NutritionGoal>(),
      diaries: new Map<string, DiaryRecord>(),
      mealPlans: new Map<string, MealPlan>(),
    };
  }

  // Hot reload can preserve an older global object that predates new maps.
  globalStore.__nutritionStore__.cachedFoods ??= new Map<string, FoodItem>();
  globalStore.__nutritionStore__.userCustomFoods ??= new Map<string, FoodItem>();
  globalStore.__nutritionStore__.missingFoodLookups ??= new Map<string, MissingFoodLookupRecord>();
  globalStore.__nutritionStore__.goals ??= new Map<string, NutritionGoal>();
  globalStore.__nutritionStore__.diaries ??= new Map<string, DiaryRecord>();
  globalStore.__nutritionStore__.mealPlans ??= new Map<string, MealPlan>();

  return globalStore.__nutritionStore__;
}

export function diaryKey(userId: string, date: string): string {
  return `${userId}:${date}`;
}

export function mealPlanKey(userId: string): string {
  return `meal-plan:${userId}`;
}

export function customFoodKey(userId: string, foodId: string): string {
  return `custom-food:${userId}:${foodId}`;
}

export function cloneDiarySummary(
  date: string,
  targetCalories: number,
  targetWaterMl: number,
  waterIntakeMl: number,
  items: DiaryItemSnapshot[],
): DailySummary {
  const meals = Object.fromEntries(
    getDefaultMealDefinitions().map((definition) => [definition.key, 0]),
  ) as Record<string, number>;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sodium = 0;

  for (const item of items) {
    calories += item.calories;
    protein += item.protein;
    carbs += item.carbs;
    fat += item.fat;
    fiber += item.fiber;
    sodium += item.sodium;
    meals[item.mealType] = (meals[item.mealType] ?? 0) + item.calories;
  }

  return {
    date,
    targetCalories,
    targetWaterMl,
    consumedCalories: Number(calories.toFixed(2)),
    remainingCalories: Number((targetCalories - calories).toFixed(2)),
    waterIntakeMl: Number(waterIntakeMl.toFixed(2)),
    calories: Number(calories.toFixed(2)),
    protein: Number(protein.toFixed(2)),
    carbs: Number(carbs.toFixed(2)),
    fat: Number(fat.toFixed(2)),
    fiber: Number(fiber.toFixed(2)),
    sodium: Number(sodium.toFixed(2)),
    meals: Object.fromEntries(
      Object.entries(meals).map(([mealKey, value]) => [mealKey, Number(value.toFixed(2))]),
    ),
  };
}
