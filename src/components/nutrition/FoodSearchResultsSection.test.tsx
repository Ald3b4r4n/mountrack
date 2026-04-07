import { render, screen } from "@testing-library/react";
import { FoodSearchResultsSection } from "@/components/nutrition/FoodSearchResultsSection";
import type { FoodItem, NutritionGoal } from "@/modules/nutrition/domain/types";

const food: FoodItem = {
  id: "f1",
  source: "fatsecret",
  name: "Pão Francês",
  baseUnit: "g",
  caloriesPer100: 274,
  servingDescription: "1 unidade",
  servingGrams: 50,
  confidenceScore: 1,
  mealCategories: [],
};

const baseProps = {
  isMobileLayout: false,
  hasSearchSession: true,
  selectedFood: null,
  isComposerOpen: false,
  activeMealLabel: "Café da Manhã",
  onOpenComposer: jest.fn(),
  onSwapFoodSelection: jest.fn(),
  resultsPanelRef: { current: null },
  hasVisibleResults: true,
  searchResults: [food],
  resultEmptyState: { title: "Sem resultados", text: "Nenhum resultado encontrado." },
  isEnrichingExternal: false,
  searchSourceLabel: null,
  onCustomFoodOpen: jest.fn(),
  onClearSearch: jest.fn(),
  onSelectFood: jest.fn(),
  onReopenSearchResults: jest.fn(),
  composerContent: null,
};

const nutritionGoal: NutritionGoal = {
  userId: "user-1",
  targetCalories: 2000,
  targetWaterMl: 2200,
  objective: "maintain",
};

describe("FoodSearchResultsSection", () => {
  // T021a — IDR% shown when goal is set
  it("renders IDR% for a result when nutritionGoal is provided", () => {
    render(
      <FoodSearchResultsSection
        {...baseProps}
        nutritionGoal={nutritionGoal}
      />,
    );

    expect(screen.getByText(/IDR|%/)).toBeInTheDocument();
  });

  // T021b — IDR% hidden when no goal
  it("does not render IDR% when nutritionGoal is null", () => {
    render(
      <FoodSearchResultsSection
        {...baseProps}
        nutritionGoal={null}
      />,
    );

    expect(screen.queryByText(/IDR/)).not.toBeInTheDocument();
  });
});
