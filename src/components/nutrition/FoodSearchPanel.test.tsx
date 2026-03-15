import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/dom";
import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import type { FoodItem, MealDefinition } from "@/modules/nutrition/domain/types";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";

const mealOptions: MealDefinition[] = [
  { key: "breakfast", label: "Café da manhã", isDefault: true },
  { key: "lunch", label: "Almoço", isDefault: true },
];

const selectedFood: FoodItem = {
  id: "barcode-food",
  source: "internal",
  name: "Barra de Proteína Trufa",
  displayName: "Barra de Proteína - Sabor Trufa",
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
  name: "Pão de Forma Artesano Integral",
  displayName: "Pão de Forma Artesano Integral - Pullman",
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
      searchSourceLabel="Catálogo do app"
      searchFeedback="Item encontrado"
      resultsVisible={false}
      searchResults={[selectedFood]}
      resultState={{ title: "Selecao pronta", text: "Item pronto para registro." }}
      onApplyFoodSelection={jest.fn()}
      onCustomFoodOpen={jest.fn()}
      onClearSearch={jest.fn()}
      selectedFood={selectedFood}
      isComposerOpen={composerOpen}
      selectedFoodTotals={{ calories: 360, protein: 33.33, carbs: 31.67, fat: 15 }}
      onOpenComposer={() => setComposerOpen(true)}
      onCloseComposer={() => setComposerOpen(false)}
      onReopenSearchResults={jest.fn()}
      onSwapFoodSelection={jest.fn()}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={onAddDiaryItem}
      searchCatalogBadge="Catálogo sincronizado"
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
      searchSourceLabel="Catálogo do app"
      searchFeedback="Item encontrado"
      resultsVisible={false}
      searchResults={[selectedFood]}
      resultState={{ title: "Selecao pronta", text: "Item pronto para registro." }}
      onApplyFoodSelection={jest.fn()}
      onCustomFoodOpen={jest.fn()}
      onClearSearch={jest.fn()}
      selectedFood={selectedFood}
      isComposerOpen={composerOpen}
      selectedFoodTotals={{ calories: 360, protein: 33.33, carbs: 31.67, fat: 15 }}
      onOpenComposer={() => setComposerOpen(true)}
      onCloseComposer={() => setComposerOpen(false)}
      onReopenSearchResults={jest.fn()}
      onSwapFoodSelection={jest.fn()}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={onAddDiaryItem}
      searchCatalogBadge="Catálogo sincronizado"
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
        searchSourceLabel="Catálogo do app"
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
          calories: food.caloriesPer100 ?? 0,
          protein: food.proteinPer100 ?? 0,
          carbs: food.carbsPer100 ?? 0,
          fat: food.fatPer100 ?? 0,
        }}
        onOpenComposer={jest.fn()}
        onCloseComposer={jest.fn()}
        onReopenSearchResults={jest.fn()}
        onSwapFoodSelection={jest.fn()}
        quantity="39"
        onQuantityChange={jest.fn()}
        unit="g"
        onUnitChange={jest.fn()}
        mealOptions={mealOptions}
        mealType="breakfast"
        onMealTypeChange={jest.fn()}
        onAddDiaryItem={jest.fn()}
        searchCatalogBadge="Catálogo sincronizado"
      />
    </>
  );
}

function SearchResultSelectionPanel({
  isMobileLayout = true,
  onApplyFoodSelection = jest.fn(),
  onSwapFoodSelection = jest.fn(),
}: {
  isMobileLayout?: boolean;
  onApplyFoodSelection?: (food: FoodItem, options?: { openComposer?: boolean; hideResults?: boolean }) => void;
  onSwapFoodSelection?: () => void;
} = {}) {
  const [currentFood, setCurrentFood] = useState<FoodItem | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(true);

  function handleApplyFoodSelection(
    food: FoodItem,
    options?: { openComposer?: boolean; hideResults?: boolean },
  ) {
    onApplyFoodSelection(food, options);
    setCurrentFood(food);
    setComposerOpen(options?.openComposer ?? true);
    setResultsVisible(!(options?.hideResults ?? true));
  }

  function handleSwapFoodSelection() {
    onSwapFoodSelection();
    setCurrentFood(null);
    setComposerOpen(false);
    setResultsVisible(true);
  }

  return (
    <FoodSearchPanel
      storageMode="database"
      isMobileLayout={isMobileLayout}
      searchQuery="banana"
      onSearchQueryChange={jest.fn()}
      onSearch={jest.fn()}
      isSearching={false}
      isEnrichingExternal={false}
      barcodeQuery=""
      onBarcodeQueryChange={jest.fn()}
      onBarcodeLookup={jest.fn()}
      onOpenScanner={jest.fn()}
      searchSourceLabel="Catálogo do app"
      searchFeedback="Resultados prontos"
      resultsVisible={resultsVisible}
      searchResults={[selectedFood]}
      resultState={{ title: "Resultados", text: "Selecione um alimento." }}
      onApplyFoodSelection={handleApplyFoodSelection}
      onCustomFoodOpen={jest.fn()}
      onClearSearch={jest.fn()}
      selectedFood={currentFood}
      isComposerOpen={composerOpen}
      selectedFoodTotals={currentFood ? { calories: 360, protein: 33.33, carbs: 31.67, fat: 15 } : null}
      onOpenComposer={() => setComposerOpen(true)}
      onCloseComposer={() => setComposerOpen(false)}
      onReopenSearchResults={() => {
        setComposerOpen(false);
        setResultsVisible(true);
      }}
      onSwapFoodSelection={handleSwapFoodSelection}
      quantity="100"
      onQuantityChange={jest.fn()}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={jest.fn()}
      searchCatalogBadge="Catálogo sincronizado"
    />
  );
}

function DynamicCaloriesComposerPanel() {
  const [quantity, setQuantity] = useState("100");
  const selectedFoodTotals = calculateNutritionForQuantity({
    food: selectedFood,
    quantity: Number(quantity),
    unit: "g",
  });

  return (
    <FoodSearchPanel
      storageMode="database"
      isMobileLayout={false}
      searchQuery=""
      onSearchQueryChange={jest.fn()}
      onSearch={jest.fn()}
      isSearching={false}
      isEnrichingExternal={false}
      barcodeQuery=""
      onBarcodeQueryChange={jest.fn()}
      onBarcodeLookup={jest.fn()}
      onOpenScanner={jest.fn()}
      searchSourceLabel="CatÃ¡logo do app"
      searchFeedback="Item encontrado"
      resultsVisible={false}
      searchResults={[selectedFood]}
      resultState={{ title: "Selecao pronta", text: "Item pronto para registro." }}
      onApplyFoodSelection={jest.fn()}
      onCustomFoodOpen={jest.fn()}
      onClearSearch={jest.fn()}
      selectedFood={selectedFood}
      isComposerOpen
      selectedFoodTotals={selectedFoodTotals}
      onOpenComposer={jest.fn()}
      onCloseComposer={jest.fn()}
      onReopenSearchResults={jest.fn()}
      onSwapFoodSelection={jest.fn()}
      quantity={quantity}
      onQuantityChange={setQuantity}
      unit="g"
      onUnitChange={jest.fn()}
      mealOptions={mealOptions}
      mealType="breakfast"
      onMealTypeChange={jest.fn()}
      onAddDiaryItem={jest.fn()}
      searchCatalogBadge="CatÃ¡logo sincronizado"
    />
  );
}

describe("FoodSearchPanel", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it("renders the mobile composer as a full dialog for the selected food", () => {
    const { container } = render(<OpenComposerPanel />);

    expect(screen.getByRole("dialog", { name: /Registrar no diário/i })).toBeInTheDocument();
    expect(screen.getByText(/Barra de Proteína - Sabor Trufa/i)).toBeInTheDocument();
    expect(screen.getByText(/Refeição Café da manhã/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar ao diário em Café da manhã/i })).toBeInTheDocument();
    expect(screen.queryByText(/Pronto para registrar/i)).not.toBeInTheDocument();
    expect(within(container).queryByRole("dialog", { name: /Registrar no diário/i })).not.toBeInTheDocument();
  });

  it("keeps the selected item as a ready card until the user opens the composer", async () => {
    const user = userEvent.setup();
    render(<ClosedComposerPanel />);

    expect(screen.queryByRole("dialog", { name: /Registrar no diário/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Refeição de destino/i)).toBeInTheDocument();
    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmar café da manhã/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Registrar em Café da manhã/i }));

    expect(screen.getByRole("dialog", { name: /Registrar no diário/i })).toBeInTheDocument();
  });

  it("falls back to the ready card after closing the mobile composer", async () => {
    const user = userEvent.setup();
    render(<OpenComposerPanel />);

    await user.click(screen.getByRole("button", { name: /^Voltar$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Registrar no diário/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar/i })).toBeInTheDocument();
  });

  it("wires the mobile composer CTA to the add handler", async () => {
    const user = userEvent.setup();
    const onAddDiaryItem = jest.fn();
    render(<OpenComposerPanel onAddDiaryItem={onAddDiaryItem} />);

    await user.click(screen.getByRole("button", { name: /Adicionar ao diário/i }));

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

    expect(screen.getByText(/Pão de Forma Artesano Integral - Pullman/i)).toBeInTheDocument();
  });

  it("keeps mobile result selection in the ready card flow until the user confirms registration", async () => {
    const user = userEvent.setup();
    const onApplyFoodSelection = jest.fn();
    render(<SearchResultSelectionPanel onApplyFoodSelection={onApplyFoodSelection} />);

    await user.click(screen.getByRole("button", { name: /Barra de Proteína - Sabor Trufa/i }));

    expect(onApplyFoodSelection).toHaveBeenCalledWith(selectedFood, {
      openComposer: false,
      hideResults: true,
    });
    expect(screen.queryByRole("dialog", { name: /Registrar no diário/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Registrar em Café da manhã/i }));

    expect(screen.getByRole("dialog", { name: /Registrar no diário/i })).toBeInTheDocument();
  });

  it("clears the mobile selection when the user chooses to swap foods", async () => {
    const user = userEvent.setup();
    const onSwapFoodSelection = jest.fn();
    render(<SearchResultSelectionPanel onSwapFoodSelection={onSwapFoodSelection} />);

    await user.click(screen.getByRole("button", { name: /Barra de Proteína - Sabor Trufa/i }));
    expect(screen.getByText(/Pronto para registrar/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Trocar alimento/i }));

    expect(onSwapFoodSelection).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Pronto para registrar/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Barra de Proteína - Sabor Trufa/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /Registrar no diário/i })).not.toBeInTheDocument();
  });

  it("keeps desktop result selection opening the composer directly", async () => {
    const user = userEvent.setup();
    const onApplyFoodSelection = jest.fn();
    render(<SearchResultSelectionPanel isMobileLayout={false} onApplyFoodSelection={onApplyFoodSelection} />);

    await user.click(screen.getByRole("button", { name: /Barra de Proteína - Sabor Trufa/i }));

    expect(onApplyFoodSelection).toHaveBeenCalledWith(selectedFood, undefined);
    expect(screen.getByText(/Use o painel ao lado para concluir o registro/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar ao diário/i })).toBeInTheDocument();
  });
  it("updates the portion calorie display as the quantity changes", async () => {
    const user = userEvent.setup();
    render(<DynamicCaloriesComposerPanel />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "SPAN" && element.textContent === "Porção atual 360 kcal",
      ),
    ).toBeInTheDocument();

    const quantityInput = screen.getByDisplayValue("100");
    await user.clear(quantityInput);
    await user.type(quantityInput, "50");

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "SPAN" && element.textContent === "Porção atual 180 kcal",
      ),
    ).toBeInTheDocument();
  });
});
