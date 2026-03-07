import {
  calculateNutritionForQuantity,
  roundNutrients,
} from "@/modules/nutrition/services/nutrition-calc.service";
import type { FoodItem } from "@/modules/nutrition/domain/types";

const rice: FoodItem = {
  id: "food-rice",
  source: "internal",
  name: "Arroz cozido",
  baseUnit: "g",
  caloriesPer100: 128,
  proteinPer100: 2.5,
  carbsPer100: 28.1,
  fatPer100: 0.3,
  confidenceScore: 0.98,
  mealCategories: ["lunch", "dinner"],
};

describe("nutrition calculation service", () => {
  it("calculates nutrition for grams", () => {
    const result = calculateNutritionForQuantity({
      food: rice,
      quantity: 150,
      unit: "g",
    });

    expect(result.calories).toBe(192);
    expect(result.carbs).toBe(42.15);
  });

  it("rounds nutrient values consistently", () => {
    expect(roundNutrients(42.156)).toBe(42.16);
  });
});

