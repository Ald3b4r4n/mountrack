import type {
  DefaultMealType,
  FoodItem,
  MealPlan,
  MealPlanItem,
  MealPlanMeal,
  MealPlanRequest,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";

const DISTRIBUTIONS: Record<number, Array<{ mealType: DefaultMealType; label: string; share: number }>> = {
  3: [
    { mealType: "breakfast", label: "Café da manhã", share: 0.25 },
    { mealType: "lunch", label: "Almoço", share: 0.4 },
    { mealType: "dinner", label: "Jantar", share: 0.35 },
  ],
  4: [
    { mealType: "breakfast", label: "Café da manhã", share: 0.2 },
    { mealType: "lunch", label: "Almoço", share: 0.35 },
    { mealType: "snack", label: "Lanche", share: 0.15 },
    { mealType: "dinner", label: "Jantar", share: 0.3 },
  ],
  5: [
    { mealType: "breakfast", label: "Café da manhã", share: 0.2 },
    { mealType: "snack", label: "Lanche da manhã", share: 0.1 },
    { mealType: "lunch", label: "Almoço", share: 0.3 },
    { mealType: "snack", label: "Lanche da tarde", share: 0.1 },
    { mealType: "dinner", label: "Jantar", share: 0.3 },
  ],
};

const CATEGORY_TEMPLATES: Record<DefaultMealType, Array<FoodItem["category"]>> = {
  breakfast: ["carb", "protein", "fruit"],
  lunch: ["protein", "carb", "vegetable"],
  dinner: ["protein", "carb", "vegetable"],
  snack: ["fruit", "dairy", "fat"],
};

const CATEGORY_WEIGHTS: Record<NonNullable<FoodItem["category"]>, number> = {
  protein: 0.34,
  carb: 0.36,
  fruit: 0.2,
  vegetable: 0.12,
  dairy: 0.3,
  fat: 0.18,
  snack: 0.28,
  beverage: 0.1,
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function roundQuantity(value: number, unit: NutritionUnit): number {
  if (unit === "serving" || unit === "unit") {
    return Number(value.toFixed(1));
  }

  return Number(value.toFixed(0));
}

function clampQuantity(value: number, unit: NutritionUnit): number {
  if (unit === "serving") return Math.min(4, Math.max(0.5, value));
  if (unit === "unit") return Math.min(6, Math.max(0.5, value));
  return Math.min(420, Math.max(20, value));
}

function resolvePlanningUnit(food: FoodItem): NutritionUnit {
  if (food.baseUnit === "unit" && food.unitGrams) {
    return "unit";
  }

  if (food.servingGrams && /whey|protein/i.test(food.name)) {
    return "serving";
  }

  return food.baseUnit === "ml" ? "ml" : "g";
}

function getCaloriesPerUnit(food: FoodItem, unit: NutritionUnit): number {
  const caloriesPer100 = food.caloriesPer100 ?? 0;
  if (unit === "serving") {
    return caloriesPer100 * ((food.servingGrams ?? 100) / 100);
  }
  if (unit === "unit") {
    return caloriesPer100 * ((food.unitGrams ?? 100) / 100);
  }

  return caloriesPer100 / 100;
}

function getPreferredBoost(name: string, preferredFoods: string[] = []): number {
  return preferredFoods.some((preferred) => normalize(preferred) === normalize(name)) ? 50 : 0;
}

function filterFoods(request: MealPlanRequest, foods: FoodItem[]): FoodItem[] {
  const excluded = new Set((request.excludedFoods ?? []).map(normalize));
  const restrictions = (request.restrictions ?? []).map(normalize);

  return foods.filter((food) => {
    if (excluded.has(normalize(food.name))) return false;
    if (!food.caloriesPer100 || !food.category) return false;
    if (restrictions.includes("sem lactose") && food.category === "dairy") return false;
    if (restrictions.includes("vegetariano") && /(frango|salm[aã]o|atum|carne)/i.test(food.name)) return false;
    if (restrictions.includes("low carb") && food.category === "carb") return false;
    return true;
  });
}

function pickBestFood(
  candidates: FoodItem[],
  category: FoodItem["category"],
  mealType: DefaultMealType,
  preferredFoods: string[] = [],
  usedIds: Set<string>,
): FoodItem | undefined {
  const scored = candidates
    .filter((food) => food.category === category && food.mealCategories.includes(mealType) && !usedIds.has(food.id))
    .map((food) => {
      const score = food.confidenceScore * 100 + getPreferredBoost(food.name, preferredFoods) + (food.completenessScore ?? 0) * 20;
      return { food, score };
    })
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) return undefined;

  const topCandidates = scored.slice(0, 4); // Picks randomly among the top 4 candidates for variety
  const randomIndex = Math.floor(Math.random() * topCandidates.length);
  return topCandidates[randomIndex].food;
}

function buildPlanItem(food: FoodItem, targetCaloriesForItem: number): MealPlanItem {
  const unit = resolvePlanningUnit(food);
  const caloriesPerUnit = getCaloriesPerUnit(food, unit) || 1;
  const rawQuantity = clampQuantity(targetCaloriesForItem / caloriesPerUnit, unit);
  const quantity = roundQuantity(rawQuantity, unit);
  const totals = calculateNutritionForQuantity({ food, quantity, unit });

  return {
    foodId: food.id,
    name: food.displayName ?? food.name,
    quantity,
    unit,
    ...totals,
  };
}

function recalculateItem(food: FoodItem, item: MealPlanItem, nextQuantity: number): MealPlanItem {
  const quantity = roundQuantity(clampQuantity(nextQuantity, item.unit), item.unit);
  const totals = calculateNutritionForQuantity({ food, quantity, unit: item.unit });

  return {
    ...item,
    quantity,
    ...totals,
  };
}

function sumMealCalories(items: MealPlanItem[]): number {
  return Number(items.reduce((total, item) => total + item.calories, 0).toFixed(2));
}

function rebalanceMealToTarget(items: MealPlanItem[], sourceFoods: FoodItem[], targetCalories: number): MealPlanItem[] {
  const nextItems = [...items];

  for (let iteration = 0; iteration < 15; iteration += 1) {
    const currentTotal = sumMealCalories(nextItems);
    const diff = Number((targetCalories - currentTotal).toFixed(2));
    if (Math.abs(diff) <= 1) {
      break;
    }

    const adjustableIndex = nextItems
      .map((item, index) => ({ item, index, sourceFood: sourceFoods[index] }))
      .sort((left, right) => right.item.calories - left.item.calories)[0]?.index;

    if (adjustableIndex == null) {
      break;
    }

    const currentItem = nextItems[adjustableIndex];
    const sourceFood = sourceFoods[adjustableIndex];
    const caloriesPerUnit = getCaloriesPerUnit(sourceFood, currentItem.unit) || 1;
    const nextQuantity = currentItem.quantity + diff / caloriesPerUnit;
    nextItems[adjustableIndex] = recalculateItem(sourceFood, currentItem, nextQuantity);
  }

  return nextItems;
}

function getMealTargetCalories(targetCalories: number, share: number, index: number, mealsCount: number): number {
  if (index < mealsCount - 1) {
    return Math.round(targetCalories * share);
  }

  const allocatedBefore = Object.values(DISTRIBUTIONS[mealsCount] ?? DISTRIBUTIONS[4])
    .slice(0, mealsCount - 1)
    .reduce((total, meal) => total + Math.round(targetCalories * meal.share), 0);

  return targetCalories - allocatedBefore;
}

export function generateMealPlan(request: MealPlanRequest, foods: FoodItem[]): MealPlan {
  const candidateMeals = DISTRIBUTIONS[request.mealsPerDay] ?? DISTRIBUTIONS[4];
  const filteredFoods = filterFoods(request, foods);

  const meals: MealPlanMeal[] = candidateMeals.map(({ mealType, label, share }, mealIndex) => {
    const targetCalories = getMealTargetCalories(request.targetCalories, share, mealIndex, candidateMeals.length);
    const categories = CATEGORY_TEMPLATES[mealType];
    const usedIds = new Set<string>();
    const selectedFoods = categories
      .map((category) => {
        const food = pickBestFood(filteredFoods, category, mealType, request.preferredFoods, usedIds);
        if (food) {
          usedIds.add(food.id);
        }
        return food;
      })
      .filter((food): food is FoodItem => Boolean(food));

    const uniqueFoods = Array.from(new Map(selectedFoods.map((food) => [food.id, food])).values());

    if (!uniqueFoods.length) {
      return {
        name: label,
        mealType,
        targetCalories,
        items: [],
        totalCalories: 0,
      };
    }

    const totalWeight = uniqueFoods.reduce((sum, food) => sum + CATEGORY_WEIGHTS[food.category ?? "snack"], 0) || uniqueFoods.length;
    const baseItems = uniqueFoods.map((food) => {
      const weight = CATEGORY_WEIGHTS[food.category ?? "snack"] / totalWeight;
      return buildPlanItem(food, Math.max(60, targetCalories * weight));
    });
    const rebalancedItems = rebalanceMealToTarget(baseItems, uniqueFoods, targetCalories);

    return {
      name: label,
      mealType,
      targetCalories,
      items: rebalancedItems,
      totalCalories: sumMealCalories(rebalancedItems),
    };
  });

  const currentTotal = Number(meals.reduce((total, meal) => total + meal.totalCalories, 0).toFixed(2));
  const totalDiff = Number((request.targetCalories - currentTotal).toFixed(2));

  if (Math.abs(totalDiff) > 1) {
    const lastMealWithItems = [...meals].reverse().find((meal) => meal.items.length > 0);
    if (lastMealWithItems) {
      const mealIndex = meals.findIndex((meal) => meal === lastMealWithItems);
      const itemIndex = lastMealWithItems.items.length - 1;
      const meal = meals[mealIndex];
      const item = meal.items[itemIndex];
      const sourceFood = filteredFoods.find((food) => food.id === item.foodId);

      if (sourceFood) {
        const caloriesPerUnit = getCaloriesPerUnit(sourceFood, item.unit) || 1;
        const nextQuantity = item.quantity + totalDiff / caloriesPerUnit;
        meal.items[itemIndex] = recalculateItem(sourceFood, item, nextQuantity);
        meal.totalCalories = sumMealCalories(meal.items);
      }
    }
  }

  return {
    totalCalories: Number(meals.reduce((total, meal) => total + meal.totalCalories, 0).toFixed(2)),
    meals,
  };
}
