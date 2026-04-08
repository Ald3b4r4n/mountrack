import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  searchSuggestions: [],
  resultEmptyState: {
    title: "Sem resultados",
    text: "Nenhum resultado encontrado.",
  },
  isEnrichingExternal: false,
  searchSourceLabel: null,
  onSearchSuggestion: jest.fn(),
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
      <FoodSearchResultsSection {...baseProps} nutritionGoal={nutritionGoal} />,
    );

    expect(screen.getByText(/IDR|%/)).toBeInTheDocument();
  });

  // T021b — IDR% hidden when no goal
  it("does not render IDR% when nutritionGoal is null", () => {
    render(<FoodSearchResultsSection {...baseProps} nutritionGoal={null} />);

    expect(screen.queryByText(/IDR/)).not.toBeInTheDocument();
  });

  it("resets the source filter to all when the selected source is not present in new results", async () => {
    const user = userEvent.setup();

    const fatSecretResult: FoodItem = {
      ...food,
      id: "fatsecret-1",
      source: "fatsecret",
      name: "Feijao preto cozido",
      displayName: "Feijao preto cozido",
    };

    const tbcaResult: FoodItem = {
      ...food,
      id: "tbca-1",
      source: "tbca",
      name: "Feijao carioca, cru",
      displayName: "Feijao carioca, cru",
    };

    const { rerender } = render(
      <FoodSearchResultsSection
        {...baseProps}
        searchResults={[fatSecretResult, tbcaResult]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /TBCA/i }));
    expect(screen.queryByText(/Feijao preto cozido/i)).not.toBeInTheDocument();

    rerender(
      <FoodSearchResultsSection
        {...baseProps}
        searchResults={[fatSecretResult]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Feijao preto cozido/i)).toBeInTheDocument();
    });

    const allChip = screen.getByRole("button", { name: /Todos/i });
    expect(allChip).toHaveAttribute("aria-pressed", "true");
  });

  it("offers a quick 'see more from this source' action", async () => {
    const user = userEvent.setup();
    const onSourceChange = jest.fn();

    const results: FoodItem[] = [
      {
        ...food,
        id: "fatsecret-1",
        source: "fatsecret",
        name: "Feijao preto cozido",
      },
      {
        ...food,
        id: "fatsecret-2",
        source: "fatsecret",
        name: "Feijao carioca cozido",
      },
      {
        ...food,
        id: "tbca-1",
        source: "tbca",
        name: "Feijao, carioca, cru",
      },
    ];

    render(
      <FoodSearchResultsSection
        {...baseProps}
        activeSource="all"
        onSourceChange={onSourceChange}
        searchResults={results}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Ver mais da fonte FatSecret/i }),
    );

    expect(onSourceChange).toHaveBeenCalledWith("fatsecret");
  });

  it("shows a quality badge for estimated results", () => {
    const lowConfidenceResult: FoodItem = {
      ...food,
      id: "off-low-confidence",
      source: "openfoodfacts",
      confidenceScore: 0.45,
      completenessScore: 0.35,
      name: "Produto estimado",
      displayName: "Produto estimado",
    };

    render(
      <FoodSearchResultsSection
        {...baseProps}
        searchResults={[lowConfidenceResult]}
      />,
    );

    expect(screen.getByText("Estimado")).toBeInTheDocument();
  });

  it("triggers search again when a did-you-mean suggestion is clicked", async () => {
    const user = userEvent.setup();
    const onSearchSuggestion = jest.fn();

    render(
      <FoodSearchResultsSection
        {...baseProps}
        hasVisibleResults={false}
        searchResults={[]}
        searchSuggestions={["Feijao carioca cozido", "Feijao preto cozido"]}
        onSearchSuggestion={onSearchSuggestion}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Feijao carioca/i }));

    expect(onSearchSuggestion).toHaveBeenCalledWith("Feijao carioca cozido");
  });
});
