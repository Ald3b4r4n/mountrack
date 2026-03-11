import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import type { FoodItem, MealDefinition, MealType, NutritionUnit } from "@/modules/nutrition/domain/types";

interface NutritionSearchWorkspaceProps {
  storageMode: string;
  isMobileLayout: boolean;
  mealDefinitions: MealDefinition[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  isEnrichingExternal: boolean;
  barcodeQuery: string;
  onBarcodeQueryChange: (value: string) => void;
  onBarcodeLookup: (value: string) => void;
  onOpenScanner: () => void;
  searchSourceLabel: string | null;
  searchFeedback: string | null;
  resultsVisible: boolean;
  searchResults: FoodItem[];
  resultState: { title: string; text: string };
  onApplyFoodSelection: (food: FoodItem, options?: { openComposer?: boolean; hideResults?: boolean }) => void;
  onCustomFoodOpen: () => void;
  onClearSearch: () => void;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  selectedFoodTotals: { protein: number; carbs: number; fat: number } | null;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onReopenSearchResults: () => void;
  onSwapFoodSelection: () => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  unit: NutritionUnit;
  onUnitChange: (value: NutritionUnit) => void;
  mealType: MealType;
  onMealTypeChange: (value: MealType) => void;
  onAddDiaryItem: () => void;
  searchCatalogBadge: string;
}

export function NutritionSearchWorkspace({
  storageMode,
  isMobileLayout,
  mealDefinitions,
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
  onApplyFoodSelection,
  onCustomFoodOpen,
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
}: NutritionSearchWorkspaceProps) {
  return (
    <FoodSearchPanel
      storageMode={storageMode}
      isMobileLayout={isMobileLayout}
      embedded={!isMobileLayout}
      mealOptions={mealDefinitions}
      searchQuery={searchQuery}
      onSearchQueryChange={onSearchQueryChange}
      onSearch={onSearch}
      isSearching={isSearching}
      isEnrichingExternal={isEnrichingExternal}
      barcodeQuery={barcodeQuery}
      onBarcodeQueryChange={onBarcodeQueryChange}
      onBarcodeLookup={onBarcodeLookup}
      onOpenScanner={onOpenScanner}
      searchSourceLabel={searchSourceLabel}
      searchFeedback={searchFeedback}
      resultsVisible={resultsVisible}
      searchResults={searchResults}
      resultState={resultState}
      onApplyFoodSelection={onApplyFoodSelection}
      onCustomFoodOpen={onCustomFoodOpen}
      onClearSearch={onClearSearch}
      selectedFood={selectedFood}
      isComposerOpen={isComposerOpen}
      selectedFoodTotals={selectedFoodTotals}
      onOpenComposer={onOpenComposer}
      onCloseComposer={onCloseComposer}
      onReopenSearchResults={onReopenSearchResults}
      onSwapFoodSelection={onSwapFoodSelection}
      quantity={quantity}
      onQuantityChange={onQuantityChange}
      unit={unit}
      onUnitChange={onUnitChange}
      mealType={mealType}
      onMealTypeChange={onMealTypeChange}
      onAddDiaryItem={onAddDiaryItem}
      searchCatalogBadge={searchCatalogBadge}
    />
  );
}
