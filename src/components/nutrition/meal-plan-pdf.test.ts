import {
  buildMealPlanPdfHtml,
  buildMealPlanPdfMarkup,
  MEAL_PLAN_PDF_STYLES,
  NUTRITION_COMPANY_SIGNATURE,
  NUTRITION_COMPANY_URL,
} from "@/components/nutrition/meal-plan-pdf";
import type { MealPlan } from "@/modules/nutrition/domain/types";

const mealPlan: MealPlan = {
  totalCalories: 1540,
  meals: [
    {
      mealType: "breakfast",
      name: "Cafe da manha",
      targetCalories: 400,
      totalCalories: 410,
      items: [
        {
          foodId: "banana",
          name: "Banana prata",
          quantity: 100,
          unit: "g",
          calories: 89,
          protein: 1,
          carbs: 23,
          fat: 0,
          fiber: 2,
          sodium: 1,
        },
      ],
    },
  ],
};

describe("meal plan pdf html", () => {
  it("renders standalone printable markup without browser UI helpers", () => {
    const markup = buildMealPlanPdfMarkup({
      plan: mealPlan,
      targetCalories: 1500,
      objective: "maintain",
      dateLabel: "7 de marco de 2026",
      totals: {
        calories: 1540,
        protein: 120,
        carbs: 140,
        fat: 45,
      },
    });
    const html = buildMealPlanPdfHtml({
      plan: mealPlan,
      targetCalories: 1500,
      objective: "maintain",
      dateLabel: "7 de marco de 2026",
      totals: {
        calories: 1540,
        protein: 120,
        carbs: 140,
        fat: 45,
      },
    });

    expect(MEAL_PLAN_PDF_STYLES).toContain(".page");
    expect(markup).toContain('data-pdf-root="meal-plan"');
    expect(markup).toContain("Cardapio diario");
    expect(markup).toContain("Banana prata");
    expect(markup).toContain(NUTRITION_COMPANY_SIGNATURE.replace("&", "&amp;"));
    expect(markup).toContain(NUTRITION_COMPANY_URL);
    expect(html).toContain("<style>");
    expect(html).not.toContain("window.print()");
  });
});
