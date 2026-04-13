export type FoodSource =
  | "fatsecret"
  | "openfoodfacts"
  | "usda"
  | "tbca"
  | "internal"
  | "custom";
export type FoodBaseUnit = "g" | "ml" | "unit";
export type NutritionUnit = "g" | "ml" | "serving" | "unit";
export type DefaultMealType = "breakfast" | "lunch" | "dinner" | "snack";
export type CustomMealType = `custom:${string}`;
export type MealType = DefaultMealType | CustomMealType;
export type NutritionObjective = "lose" | "maintain" | "gain";
export type FoodCategory =
  | "protein"
  | "carb"
  | "fruit"
  | "vegetable"
  | "dairy"
  | "fat"
  | "snack"
  | "beverage";

export interface MealDefinition {
  key: MealType;
  label: string;
  isDefault?: boolean;
}

export interface FoodItem {
  id: string;
  source: FoodSource;
  sourceId?: string;
  name: string;
  displayName?: string;
  brand?: string;
  barcode?: string;
  baseUnit: FoodBaseUnit;
  servingDescription?: string;
  servingGrams?: number;
  unitGrams?: number;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fiberPer100?: number;
  sodiumPer100?: number;
  imageUrl?: string;
  confidenceScore: number;
  completenessScore?: number;
  locale?: string;
  countryCode?: string;
  isBranded?: boolean;
  externalUpdatedAt?: string;
  mealCategories: DefaultMealType[];
  category?: FoodCategory;
  tags?: string[];
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export interface DiaryItemSnapshot extends NutritionTotals {
  id: string;
  diaryId: string;
  foodId: string;
  foodName: string;
  mealType: MealType;
  mealLabel?: string;
  quantity: number;
  unit: NutritionUnit;
  consumedAt: string;
}

export interface DiaryItemCopyRequest {
  targetDate: string;
  targetMealType: MealType;
  targetMealLabel?: string;
  consumedAt?: string;
}

export interface RecentConsumedFood {
  sourceItemId: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: NutritionUnit;
  calories: number;
  lastConsumedAt: string;
  lastMealType: MealType;
  lastMealLabel?: string;
}

export interface DailySummary extends NutritionTotals {
  date: string;
  targetCalories: number;
  targetWaterMl: number;
  consumedCalories: number;
  remainingCalories: number;
  waterIntakeMl: number;
  meals: Record<string, number>;
}

export interface NutritionGoal {
  userId: string;
  targetCalories: number;
  targetWaterMl?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  objective: NutritionObjective;
}

export interface MealPlanRequest {
  targetCalories: number;
  mealsPerDay: number;
  objective: NutritionObjective;
  restrictions?: string[];
  preferredFoods?: string[];
  excludedFoods?: string[];
}

export interface MealPlanItem extends NutritionTotals {
  foodId: string;
  name: string;
  quantity: number;
  unit: NutritionUnit;
}

export interface MealPlanMeal {
  name: string;
  mealType: MealType;
  targetCalories: number;
  items: MealPlanItem[];
  totalCalories: number;
}

export interface MealPlan {
  totalCalories: number;
  meals: MealPlanMeal[];
}

export interface DiaryHistoryEntry {
  date: string;
  itemCount: number;
  summary: DailySummary;
}
