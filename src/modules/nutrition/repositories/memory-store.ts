import type {
  DailySummary,
  DiaryItemSnapshot,
  FoodItem,
  MealPlan,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";

export interface DiaryRecord {
  id: string;
  userId: string;
  date: string;
  targetCalories: number;
  targetWaterMl: number;
  waterIntakeMl: number;
  items: DiaryItemSnapshot[];
}

interface NutritionMemoryStore {
  cachedFoods: Map<string, FoodItem>;
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
      goals: new Map<string, NutritionGoal>(),
      diaries: new Map<string, DiaryRecord>(),
      mealPlans: new Map<string, MealPlan>(),
    };
  }

  return globalStore.__nutritionStore__;
}

export function diaryKey(userId: string, date: string): string {
  return `${userId}:${date}`;
}

export function mealPlanKey(userId: string): string {
  return `meal-plan:${userId}`;
}

export function cloneDiarySummary(
  date: string,
  targetCalories: number,
  targetWaterMl: number,
  waterIntakeMl: number,
  items: DiaryItemSnapshot[],
): DailySummary {
  const meals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
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
    meals[item.mealType] += item.calories;
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
    meals: {
      breakfast: Number(meals.breakfast.toFixed(2)),
      lunch: Number(meals.lunch.toFixed(2)),
      dinner: Number(meals.dinner.toFixed(2)),
      snack: Number(meals.snack.toFixed(2)),
    },
  };
}
