import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import type { FoodItem, MealDefinition } from "@/modules/nutrition/domain/types";

const mealOptions: MealDefinition[] = [
  { key: "breakfast", label: "Cafe da manha", isDefault: true },
  { key: "lunch", label: "Almoco", isDefault: true },
];

const selectedFood: FoodItem = {
  id: "barcode-food",
  source: "internal",
  name: "Barra de Proteina Trufa",
  displayName: "Barra de Proteina - Sabor Trufa",
  brand: "BOLD Snacks",
  barcode: "7893596226205",
  baseUnit: "g",
  caloriesPer100: 360,
  proteinPer100: 33.33,
  carbsPer100: 31.67,
  fatPer100: 15,
  confidenceScore: 1,
  mealCategories: ["snack"],
};

function renderPanel() {
  return render(
    <FoodSearchPanel
      storageMode="database"
      isMobileLayout
      searchQuery=""
      onSearchQueryChange={jest.fn()}
      onSearch={jest.fn()}
      isSearching={false}
      isEnrichingExternal={false}
      barcodeQuery="7893596226205"
      onBarcodeQueryChange={jest.fn()}
      onBarcodeLookup={jest.fn()}
      onOpenScanner={jest.fn()}
      searchSourceLabel="Catalogo do app"
      searchFeedback="Item encontrado"
      resultsVisible={false}
      searchResults={[selectedFood]}
      resultState={{ title: "Selecao pronta", text: "Item pronto para registro." }}
      onApplyFoodSelection={jest.fn()}
      onCustomFoodOpen={jest.fn()}
      onClearSearch={jest.fn()}
      selectedFood={selectedFood}
      selectedFoodTotals={{ protein: 33.33, carbs: 31.67, fat: 15 }}
      onReopenSearchResults={jest.fn()}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={jest.fn()}
      searchCatalogBadge="Catalogo sincronizado"
    />,
  );
}

describe("FoodSearchPanel", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it("renders the mobile composer as a full dialog for the selected food", () => {
    renderPanel();

    expect(screen.getByRole("dialog", { name: /Registrar no diario/i })).toBeInTheDocument();
    expect(screen.getByText(/Barra de Proteina - Sabor Trufa/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar ao diario/i })).toBeInTheDocument();
    expect(screen.queryByText(/Pronto para registrar/i)).not.toBeInTheDocument();
  });

  it("falls back to the ready card after closing the mobile composer", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /^Fechar$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Registrar no diario/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar/i })).toBeInTheDocument();
  });
});
