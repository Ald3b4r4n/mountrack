import {
  buildDailySummary,
  createDiaryItemSnapshot,
} from "@/modules/nutrition/services/daily-calories.service";
import type { FoodItem } from "@/modules/nutrition/domain/types";

const yogurt: FoodItem = {
  id: "food-yogurt",
  source: "internal",
  name: "Iogurte natural",
  baseUnit: "g",
  servingDescription: "1 pote",
  servingGrams: 170,
  caloriesPer100: 61,
  proteinPer100: 3.5,
  carbsPer100: 4.7,
  fatPer100: 3.3,
  confidenceScore: 0.96,
  mealCategories: ["breakfast", "snack"],
};

describe("daily calories service", () => {
  it("creates an item snapshot with computed nutrients", () => {
    const snapshot = createDiaryItemSnapshot({
      diaryId: "diary-1",
      food: yogurt,
      quantity: 1,
      unit: "serving",
      mealType: "breakfast",
      consumedAt: "2026-03-07T08:30:00.000Z",
    });

    expect(snapshot.calories).toBeCloseTo(103.7, 1);
    expect(snapshot.foodName).toBe("Iogurte natural");
  });

  it("builds summary totals, hydration and remaining calories", () => {
    const snapshot = createDiaryItemSnapshot({
      diaryId: "diary-1",
      food: yogurt,
      quantity: 1,
      unit: "serving",
      mealType: "breakfast",
      consumedAt: "2026-03-07T08:30:00.000Z",
    });

    const summary = buildDailySummary({
      date: "2026-03-07",
      targetCalories: 1800,
      targetWaterMl: 2200,
      waterIntakeMl: 1250,
      items: [snapshot],
    });

    expect(summary.consumedCalories).toBeCloseTo(103.7, 1);
    expect(summary.remainingCalories).toBeCloseTo(1696.3, 1);
    expect(summary.meals.breakfast).toBeCloseTo(103.7, 1);
    expect(summary.targetWaterMl).toBe(2200);
    expect(summary.waterIntakeMl).toBe(1250);
  });
});
