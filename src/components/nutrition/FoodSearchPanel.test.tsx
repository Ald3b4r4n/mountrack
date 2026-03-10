import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/dom";
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

const nextScannedFood: FoodItem = {
  ...selectedFood,
  id: "barcode-food-2",
  name: "Pao de Forma Artesano Integral",
  displayName: "Pao de Forma Artesano Integral - Pullman",
  brand: "Pullman",
  barcode: "7896002303460",
  caloriesPer100: 256,
  proteinPer100: 4.12,
  carbsPer100: 18.74,
  fatPer100: 1.08,
};

function ClosedComposerPanel({ onAddDiaryItem = jest.fn() }: { onAddDiaryItem?: () => void } = {}) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
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
      isComposerOpen={composerOpen}
      selectedFoodTotals={{ protein: 33.33, carbs: 31.67, fat: 15 }}
      onOpenComposer={() => setComposerOpen(true)}
      onCloseComposer={() => setComposerOpen(false)}
      onReopenSearchResults={jest.fn()}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={onAddDiaryItem}
      searchCatalogBadge="Catalogo sincronizado"
    />
  );
}

function OpenComposerPanel({ onAddDiaryItem = jest.fn() }: { onAddDiaryItem?: () => void } = {}) {
  const [composerOpen, setComposerOpen] = useState(true);

  return (
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
      isComposerOpen={composerOpen}
      selectedFoodTotals={{ protein: 33.33, carbs: 31.67, fat: 15 }}
      onOpenComposer={() => setComposerOpen(true)}
      onCloseComposer={() => setComposerOpen(false)}
      onReopenSearchResults={jest.fn()}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={onAddDiaryItem}
      searchCatalogBadge="Catalogo sincronizado"
    />
  );
}

function OpenComposerWithFoodSwap() {
  const [food, setFood] = useState(selectedFood);

  return (
    <>
      <button type="button" onClick={() => setFood(nextScannedFood)}>
        Simular novo escaneamento
      </button>
      <FoodSearchPanel
        storageMode="database"
        isMobileLayout
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onSearch={jest.fn()}
        isSearching={false}
        isEnrichingExternal={false}
        barcodeQuery={food.barcode ?? ""}
        onBarcodeQueryChange={jest.fn()}
        onBarcodeLookup={jest.fn()}
        onOpenScanner={jest.fn()}
        searchSourceLabel="Catalogo do app"
        searchFeedback="Item encontrado"
        resultsVisible={false}
        searchResults={[food]}
        resultState={{ title: "Selecao pronta", text: "Item pronto para registro." }}
        onApplyFoodSelection={jest.fn()}
        onCustomFoodOpen={jest.fn()}
        onClearSearch={jest.fn()}
        selectedFood={food}
        isComposerOpen
        selectedFoodTotals={{
          protein: food.proteinPer100 ?? 0,
          carbs: food.carbsPer100 ?? 0,
          fat: food.fatPer100 ?? 0,
        }}
        onOpenComposer={jest.fn()}
        onCloseComposer={jest.fn()}
        onReopenSearchResults={jest.fn()}
        quantity="39"
        onQuantityChange={jest.fn()}
        unit="g"
        onUnitChange={jest.fn()}
        mealOptions={mealOptions}
        mealType="breakfast"
        onMealTypeChange={jest.fn()}
        onAddDiaryItem={jest.fn()}
        searchCatalogBadge="Catalogo sincronizado"
      />
    </>
  );
}

describe("FoodSearchPanel", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it("renders the mobile composer as a full dialog for the selected food", () => {
    const { container } = render(<OpenComposerPanel />);

    expect(screen.getByRole("dialog", { name: /Registrar no diario/i })).toBeInTheDocument();
    expect(screen.getByText(/Barra de Proteina - Sabor Trufa/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar ao diario/i })).toBeInTheDocument();
    expect(screen.queryByText(/Pronto para registrar/i)).not.toBeInTheDocument();
    expect(within(container).queryByRole("dialog", { name: /Registrar no diario/i })).not.toBeInTheDocument();
  });

  it("keeps the selected item as a ready card until the user opens the composer", async () => {
    const user = userEvent.setup();
    render(<ClosedComposerPanel />);

    expect(screen.queryByRole("dialog", { name: /Registrar no diario/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Registrar/i }));

    expect(screen.getByRole("dialog", { name: /Registrar no diario/i })).toBeInTheDocument();
  });

  it("falls back to the ready card after closing the mobile composer", async () => {
    const user = userEvent.setup();
    render(<OpenComposerPanel />);

    await user.click(screen.getByRole("button", { name: /^Voltar$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Registrar no diario/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar/i })).toBeInTheDocument();
  });

  it("wires the mobile composer CTA to the add handler", async () => {
    const user = userEvent.setup();
    const onAddDiaryItem = jest.fn();
    render(<OpenComposerPanel onAddDiaryItem={onAddDiaryItem} />);

    await user.click(screen.getByRole("button", { name: /Adicionar ao diario/i }));

    expect(onAddDiaryItem).toHaveBeenCalledTimes(1);
  });

  it("resets the composer scroll when a new scanned food replaces the current one", async () => {
    const user = userEvent.setup();
    render(<OpenComposerWithFoodSwap />);

    const scrollArea = screen.getByTestId("mobile-composer-scroll-area");
    scrollArea.scrollTop = 180;

    await user.click(screen.getByRole("button", { name: /Simular novo escaneamento/i }));

    await waitFor(() => {
      expect(scrollArea.scrollTop).toBe(0);
    });

    expect(screen.getByText(/Pao de Forma Artesano Integral - Pullman/i)).toBeInTheDocument();
  });
});
