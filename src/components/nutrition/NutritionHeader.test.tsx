import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import type {
  DailySummary,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";

const summary: DailySummary = {
  date: "2026-03-10",
  targetCalories: 2000,
  targetWaterMl: 2200,
  consumedCalories: 518,
  remainingCalories: 1482,
  waterIntakeMl: 0,
  meals: {
    breakfast: 185,
    lunch: 333,
    snack: 0,
    dinner: 0,
  },
  calories: 518,
  protein: 54.8,
  carbs: 47.72,
  fat: 11.94,
  fiber: 0,
  sodium: 0,
};

const goal: NutritionGoal = {
  userId: "test-user",
  targetCalories: 2000,
  targetWaterMl: 2200,
  targetProtein: 140,
  targetCarbs: 180,
  targetFat: 65,
  objective: "maintain",
};

describe("NutritionHeader", () => {
  it("lets the mobile consumed card open the meal summary shortcut", async () => {
    const user = userEvent.setup();
    const onOpenConsumedSummary = jest.fn();

    render(
      <NutritionHeader
        isMobileLayout
        isPreview={false}
        summary={summary}
        goal={goal}
        waterRatio={0}
        consumedRatio={26}
        mealDefinitions={[
          { key: "breakfast", label: "Café da manhã", isDefault: true },
          { key: "lunch", label: "Almoço", isDefault: true },
          { key: "snack", label: "Lanche", isDefault: true },
          { key: "dinner", label: "Jantar", isDefault: true },
        ]}
        mealCalories={summary.meals}
        activeMeal="breakfast"
        activeMealLabel="Café da manhã"
        activeMealCalories={185}
        recentlyLoggedFoodLabel="Iogurte natural"
        onOpenConsumedSummary={onOpenConsumedSummary}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /^Hoje$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Painel/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Controle de refeições, água e metas./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Consumido/i }));

    expect(onOpenConsumedSummary).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/^26%$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Livre$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Água e metas$/i)).toBeInTheDocument();
    expect(screen.getByText(/Café da manhã em foco/i)).toBeInTheDocument();
    expect(screen.getByText(/Água 0%/i)).toBeInTheDocument();
    expect(screen.getByText(/Meta 140 g/i)).toBeInTheDocument();
  });
});
