import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { generateMealPlan } from "@/modules/nutrition/services/meal-plan.service";

describe("meal plan service", () => {
  it("generates a meal plan within a tight tolerance of the requested calories", () => {
    const mealPlan = generateMealPlan(
      {
        targetCalories: 1500,
        mealsPerDay: 4,
        objective: "maintain",
        preferredFoods: ["Frango grelhado", "Arroz cozido", "Banana prata"],
      },
      INTERNAL_FOODS,
    );

    expect(mealPlan.meals).toHaveLength(4);
    expect(Math.abs(mealPlan.totalCalories - 1500)).toBeLessThanOrEqual(15);
  });

  it("honors excluded foods when generating meals", () => {
    const mealPlan = generateMealPlan(
      {
        targetCalories: 1800,
        mealsPerDay: 4,
        objective: "lose",
        excludedFoods: ["Pão francês"],
      },
      INTERNAL_FOODS,
    );

    const allItems = mealPlan.meals.flatMap((meal) => meal.items.map((item) => item.name));

    expect(allItems).not.toContain("Pão francês");
  });
});
