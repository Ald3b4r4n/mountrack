import { useEffect, useRef, useState } from "react";
import type {
  FoodItem,
  MealDefinition,
  MealType,
  NutritionTotals,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import {
  EmptyState,
} from "./CommonUI";
import {
  formatCalories,
  formatFoodSourceLabel,
  formatGrams,
  getFoodLabel,
} from "@/modules/nutrition/ui-helpers";
import { FoodSearchMobileComposerDialog } from "./FoodSearchMobileComposerDialog";
import { FoodSearchResultsSection } from "./FoodSearchResultsSection";
import { FoodSearchSetupPanel } from "./FoodSearchSetupPanel";

type SearchMode = "name" | "barcode" | "custom";
type FoodSelectionOptions = {
  openComposer?: boolean;
  hideResults?: boolean;
};
type SelectedFoodTotals = Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat">;

interface FoodSearchPanelProps {
  storageMode: string;
  isMobileLayout: boolean;
  embedded?: boolean;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  isEnrichingExternal: boolean;
  barcodeQuery: string;
  onBarcodeQueryChange: (val: string) => void;
  onBarcodeLookup: (val: string) => void;
  onOpenScanner: () => void;
  searchSourceLabel: string | null;
  searchFeedback: string | null;
  resultsVisible: boolean;
  searchResults: FoodItem[];
  resultState: { title: string; text: string };
  onApplyFoodSelection: (food: FoodItem, options?: FoodSelectionOptions) => void;
  barcodeMissCode?: string | null;
  onBarcodeMissAddManually?: () => void;
  onCustomFoodOpen: () => void;
  onEditCustomFood?: (food: FoodItem) => void;
  onClearSearch: () => void;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  selectedFoodTotals: SelectedFoodTotals | null;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onReopenSearchResults: () => void;
  onSwapFoodSelection: () => void;
  quantity: string;
  onQuantityChange: (val: string) => void;
  unit: NutritionUnit;
  onUnitChange: (val: NutritionUnit) => void;
  mealOptions: MealDefinition[];
  mealType: MealType;
  onMealTypeChange: (val: MealType) => void;
  onAddDiaryItem: () => void;
  searchCatalogBadge: string;
}

function ComposerBody({
  selectedFood,
  selectedFoodTotals,
  quantity,
  onQuantityChange,
  unit,
  onUnitChange,
  mealOptions,
  mealType,
  onMealTypeChange,
  onAddDiaryItem,
  showActionButton = true,
}: {
  selectedFood: FoodItem | null;
  selectedFoodTotals: SelectedFoodTotals | null;
  quantity: string;
  onQuantityChange: (val: string) => void;
  unit: NutritionUnit;
  onUnitChange: (val: NutritionUnit) => void;
  mealOptions: MealDefinition[];
  mealType: MealType;
  onMealTypeChange: (val: MealType) => void;
  onAddDiaryItem: () => void;
  showActionButton?: boolean;
}) {
  if (!selectedFood) {
    return (
      <EmptyState
        title="Nenhum alimento selecionado"
        text="Escolha um resultado para ajustar a porção e registrar no diário."
        compact
      />
    );
  }

  return (
    <div className="grid gap-4">
      {/* Food identity */}
      <div>
        <strong className="block text-[1rem]">{getFoodLabel(selectedFood)}</strong>
        <span className="mt-0.5 block text-[0.82rem] text-[var(--text-secondary)]">
          {selectedFood.brand ? `${selectedFood.brand} · ` : ""}
          {formatFoodSourceLabel(selectedFood.source)}
          {selectedFood.caloriesPer100 != null
            ? ` · ${formatCalories(selectedFood.caloriesPer100)} / 100${selectedFood.baseUnit}`
            : ""}
        </span>
      </div>

      {/* Quantity + Unit + Meal row */}
      <div className="grid grid-cols-3 gap-2.5">
        <label className="grid gap-1">
          <span className="text-[0.75rem] font-medium text-[var(--text-muted)]">Quantidade</span>
          <input
            className="input-field text-center"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.75rem] font-medium text-[var(--text-muted)]">Unidade</span>
          <select
            className="input-field"
            value={unit}
            onChange={(event) => onUnitChange(event.target.value as NutritionUnit)}
          >
            <option value="g">Gramas</option>
            <option value="ml">Mililitros</option>
            <option value="serving">Porção</option>
            <option value="unit">Unidade</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[0.75rem] font-medium text-[var(--text-muted)]">Refeição</span>
          <select
            className="input-field"
            value={mealType}
            onChange={(event) => onMealTypeChange(event.target.value as MealType)}
          >
            {mealOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Nutrition table - FatSecret style */}
      {selectedFoodTotals ? (
        <div className="rounded-xl border border-[var(--border-glass)] bg-[#020b1c]/50">
          <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-2.5">
            <span className="text-[0.82rem] font-medium text-[var(--text-primary)]">Calorias</span>
            <span className="text-[0.95rem] font-semibold text-[#34d399]">
              {selectedFoodTotals.calories.toFixed(0)} kcal
            </span>
          </div>
          {selectedFoodTotals ? (
            <span className="block border-b border-[var(--border-glass)] px-4 py-1.5 text-[0.72rem] text-[var(--text-muted)]">
              Porção atual {formatCalories(selectedFoodTotals.calories)}
            </span>
          ) : null}
          <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-2.5">
            <span className="text-[0.82rem] text-[var(--text-secondary)]">Proteína</span>
            <span className="text-[0.88rem] font-medium text-[#34d399]">
              {formatGrams(selectedFoodTotals.protein)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-2.5">
            <span className="text-[0.82rem] text-[var(--text-secondary)]">Carboidratos</span>
            <span className="text-[0.88rem] font-medium text-[#22d3ee]">
              {formatGrams(selectedFoodTotals.carbs)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[0.82rem] text-[var(--text-secondary)]">Gorduras</span>
            <span className="text-[0.88rem] font-medium text-[#fb7185]">
              {formatGrams(selectedFoodTotals.fat)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[0.82rem] text-[var(--text-secondary)]">
          Ajuste a quantidade para calcular os macros desta porção.
        </p>
      )}

      {/* CTA */}
      {showActionButton ? (
        <button type="button" onClick={onAddDiaryItem} className="btn-primary w-full">
          Adicionar ao diário
        </button>
      ) : null}
    </div>
  );
}

export function FoodSearchPanel({
  storageMode,
  isMobileLayout,
  embedded = false,
  mealOptions,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  isEnrichingExternal,
  barcodeQuery,
  onBarcodeQueryChange,
  onBarcodeLookup,
  onOpenScanner,
  searchSourceLabel,
  searchFeedback,
  resultsVisible,
  searchResults,
  resultState,
  barcodeMissCode,
  onBarcodeMissAddManually,
  onApplyFoodSelection,
  onCustomFoodOpen,
  onEditCustomFood,
  onClearSearch,
  selectedFood,
  isComposerOpen,
  selectedFoodTotals,
  onOpenComposer,
  onCloseComposer,
  onReopenSearchResults,
  onSwapFoodSelection,
  quantity,
  onQuantityChange,
  unit,
  onUnitChange,
  mealType,
  onMealTypeChange,
  onAddDiaryItem,
  searchCatalogBadge,
}: FoodSearchPanelProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const composerScrollRef = useRef<HTMLDivElement | null>(null);
  const resultsPanelRef = useRef<HTMLDivElement | null>(null);
  const skipScrollRestoreRef = useRef(false);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!isMobileLayout || !isComposerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousLeft = document.body.style.left;
    const previousRight = document.body.style.right;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.left = previousLeft;
      document.body.style.right = previousRight;
      document.body.style.width = previousWidth;
      if (!skipScrollRestoreRef.current) {
        try {
          window.scrollTo(0, scrollY);
        } catch {
          // jsdom and some embedded browsers do not implement scroll restoration.
        }
      }
      skipScrollRestoreRef.current = false;
    };
  }, [isMobileLayout, isComposerOpen]);

  useEffect(() => {
    if (!isMobileLayout || !isComposerOpen || !selectedFood) return;

    const scrollFrame = window.requestAnimationFrame(() => {
      if (composerScrollRef.current) {
        composerScrollRef.current.scrollTop = 0;
      }
    });

    return () => {
      window.cancelAnimationFrame(scrollFrame);
    };
  }, [isMobileLayout, isComposerOpen, selectedFood, selectedFood?.id]);

  const storageSummary =
    storageMode === "database"
      ? "Pesquise no catálogo salvo enquanto novas referências são buscadas em segundo plano."
      : storageMode === "checking"
        ? "Preparando o catálogo e as referências de apoio."
        : "Os registros desta área ficam apenas neste aparelho enquanto a sincronização não estiver disponível.";
  const searchActivitySummary = isSearching
    ? "Buscando no catálogo do app."
    : isEnrichingExternal
      ? "Buscando referências extras em segundo plano."
      : null;

  const hasVisibleResults = resultsVisible && searchResults.length > 0;
  const activeMealLabel = mealOptions.find((option) => option.key === mealType)?.label ?? String(mealType);
  const hasSearchSession =
    isSearching ||
    searchSourceLabel !== null ||
    searchFeedback !== null ||
    searchResults.length > 0 ||
    selectedFood !== null;
  const resultEmptyState =
    selectedFood && !resultsVisible
      ? {
          title: "Alimento selecionado",
          text: isMobileLayout
            ? "Abra o registro para ajustar a quantidade, escolher a refeição ou trocar o alimento."
            : "Use o painel ao lado para concluir o registro.",
        }
      : resultState;

  const composerContent = (
    <ComposerBody
      selectedFood={selectedFood}
      selectedFoodTotals={selectedFoodTotals}
      quantity={quantity}
      onQuantityChange={onQuantityChange}
      unit={unit}
      onUnitChange={onUnitChange}
      mealOptions={mealOptions}
      mealType={mealType}
      onMealTypeChange={onMealTypeChange}
      onAddDiaryItem={onAddDiaryItem}
    />
  );

  function handleSelectFood(food: FoodItem) {
    onApplyFoodSelection(
      food,
      isMobileLayout
        ? {
            openComposer: true,
            hideResults: true,
          }
        : undefined,
    );
  }

  function handleMobileComposerSubmit() {
    skipScrollRestoreRef.current = true;
    onAddDiaryItem();
  }

  function handleSwapFoodSelection() {
    onSwapFoodSelection();
    if (!isMobileLayout) return;

    window.requestAnimationFrame(() => {
      const node = resultsPanelRef.current;
      if (!node || typeof node.scrollIntoView !== "function") {
        return;
      }

      try {
        node.scrollIntoView({ block: "start", behavior: "smooth" });
      } catch {
        node.scrollIntoView();
      }
    });
  }

  return (
    <>
      <section className="grid gap-4">
        <FoodSearchSetupPanel
          storageSummary={storageSummary}
          searchActivitySummary={searchActivitySummary}
          embedded={embedded}
          isMobileLayout={isMobileLayout}
          activeMealLabel={activeMealLabel}
          searchCatalogBadge={searchCatalogBadge}
          isEnrichingExternal={isEnrichingExternal}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onSearch={onSearch}
          isSearching={isSearching}
          barcodeQuery={barcodeQuery}
          onBarcodeQueryChange={onBarcodeQueryChange}
          onBarcodeLookup={onBarcodeLookup}
          onOpenScanner={onOpenScanner}
          onCustomFoodOpen={onCustomFoodOpen}
        />

        {barcodeMissCode && onBarcodeMissAddManually ? (
          <div className="rounded-xl border border-[var(--border-glass)] bg-[var(--bg-surface)] px-4 py-3">
            <p className="mb-2 text-[0.84rem] text-[var(--text-secondary)]">
              Código <span className="font-medium text-[var(--text-primary)]">{barcodeMissCode}</span> não encontrado no catálogo.
            </p>
            <button
              type="button"
              onClick={onBarcodeMissAddManually}
              className="btn-primary px-4 py-2 text-[0.84rem]"
            >
              Adicionar Manualmente
            </button>
          </div>
        ) : null}

        <FoodSearchResultsSection
          isMobileLayout={isMobileLayout}
          hasSearchSession={hasSearchSession}
          selectedFood={selectedFood}
          isComposerOpen={isComposerOpen}
          activeMealLabel={activeMealLabel}
          onOpenComposer={onOpenComposer}
          onSwapFoodSelection={handleSwapFoodSelection}
          resultsPanelRef={resultsPanelRef}
          hasVisibleResults={hasVisibleResults}
          searchResults={searchResults}
          resultEmptyState={resultEmptyState}
          isEnrichingExternal={isEnrichingExternal}
          searchSourceLabel={searchSourceLabel}
          onCustomFoodOpen={onCustomFoodOpen}
          onEditCustomFood={onEditCustomFood}
          onClearSearch={onClearSearch}
          onSelectFood={handleSelectFood}
          onReopenSearchResults={onReopenSearchResults}
          composerContent={composerContent}
        />
      </section>

      <FoodSearchMobileComposerDialog
        portalTarget={portalTarget}
        isVisible={isMobileLayout && isComposerOpen}
        selectedFood={selectedFood}
        activeMealLabel={activeMealLabel}
        composerScrollRef={composerScrollRef}
        onCloseComposer={onCloseComposer}
        onSwapFoodSelection={handleSwapFoodSelection}
        onSubmit={handleMobileComposerSubmit}
      >
        <ComposerBody
          selectedFood={selectedFood}
          selectedFoodTotals={selectedFoodTotals}
          quantity={quantity}
          onQuantityChange={onQuantityChange}
          unit={unit}
          onUnitChange={onUnitChange}
          mealOptions={mealOptions}
          mealType={mealType}
          onMealTypeChange={onMealTypeChange}
          onAddDiaryItem={handleMobileComposerSubmit}
          showActionButton={false}
        />
      </FoodSearchMobileComposerDialog>
    </>
  );
}
