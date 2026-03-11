import type { FoodItem, NutritionGoal } from "@/modules/nutrition/domain/types";
import {
  clearNutritionMealPlanFromBrowser,
  hasNutritionBrowserSnapshot,
  loadNutritionDashboardFromBrowser,
  loadNutritionHistoryFromBrowser,
  saveNutritionDiaryItemToBrowser,
  saveNutritionGoalToBrowser,
  saveNutritionMealPlanToBrowser,
  saveNutritionWaterToBrowser,
} from "@/modules/nutrition/client-storage";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";

const userId = "nutrition-user";
const date = "2026-03-07";

const defaultGoal: NutritionGoal = {
  userId,
  targetCalories: 2000,
  targetWaterMl: 2200,
  targetProtein: 140,
  targetCarbs: 180,
  targetFat: 65,
  objective: "maintain",
};

const wheyFood: FoodItem = {
  id: "food-whey-growth",
  source: "internal",
  name: "Whey Protein Concentrado",
  displayName: "Whey Protein Growth Concentrado",
  brand: "Growth",
  baseUnit: "g",
  servingDescription: "1 scoop",
  servingGrams: 30,
  caloriesPer100: 406,
  proteinPer100: 78,
  carbsPer100: 10,
  fatPer100: 6.5,
  confidenceScore: 0.96,
  mealCategories: ["breakfast", "snack"],
  category: "protein",
  tags: ["growth", "whey", "protein"],
};

describe("nutrition client storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists hydration updates across reload-like reads", () => {
    saveNutritionWaterToBrowser(userId, date, defaultGoal, 750);

    const dashboard = loadNutritionDashboardFromBrowser(userId, date, defaultGoal);

    expect(hasNutritionBrowserSnapshot(userId)).toBe(true);
    expect(dashboard.summary.waterIntakeMl).toBe(750);
    expect(dashboard.summary.targetWaterMl).toBe(2200);
  });

  it("keeps diary entries and meal plans in browser storage", () => {
    const item = createDiaryItemSnapshot({
      diaryId: `${userId}:${date}`,
      food: wheyFood,
      quantity: 1,
      unit: "serving",
      mealType: "breakfast",
      consumedAt: "2026-03-07T08:30:00.000Z",
    });

    saveNutritionDiaryItemToBrowser(userId, date, defaultGoal, item);
    saveNutritionMealPlanToBrowser(userId, {
      totalCalories: 1502,
      meals: [
        {
          name: "Café da manhã",
          mealType: "breakfast",
          targetCalories: 400,
          totalCalories: 406,
          items: [
            {
              foodId: item.foodId,
              name: item.foodName,
              quantity: 1,
              unit: "serving",
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber,
              sodium: item.sodium,
            },
          ],
        },
      ],
    });

    const dashboard = loadNutritionDashboardFromBrowser(userId, date, defaultGoal);
    const history = loadNutritionHistoryFromBrowser(userId, defaultGoal, 1, 6);

    expect(dashboard.diary.items).toHaveLength(1);
    expect(dashboard.mealPlan?.totalCalories).toBe(1502);
    expect(history.entries[0]?.itemCount).toBe(1);

    clearNutritionMealPlanFromBrowser(userId);

    expect(loadNutritionDashboardFromBrowser(userId, date, defaultGoal).mealPlan).toBeNull();
  });

  it("updates existing diary targets when goal changes", () => {
    saveNutritionWaterToBrowser(userId, date, defaultGoal, 500);
    saveNutritionGoalToBrowser(userId, {
      ...defaultGoal,
      targetCalories: 1850,
      targetWaterMl: 2600,
      objective: "lose",
    });

    const dashboard = loadNutritionDashboardFromBrowser(userId, date, defaultGoal);

    expect(dashboard.goal.targetCalories).toBe(1850);
    expect(dashboard.summary.targetCalories).toBe(1850);
    expect(dashboard.summary.targetWaterMl).toBe(2600);
  });
});
