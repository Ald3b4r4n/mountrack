import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import type {
  FoodItem,
  FoodSource,
  MealDefinition,
  MealType,
  NutritionTotals,
  NutritionUnit,
  RecentConsumedFood,
} from "@/modules/nutrition/domain/types";

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
  searchSuggestions: string[];
  resultsVisible: boolean;
  searchResults: FoodItem[];
  activeSource: "all" | FoodSource;
  onSourceChange: (source: "all" | FoodSource) => void;
  onSearchSuggestion: (value: string) => void;
  resultState: { title: string; text: string };
  barcodeMissCode?: string | null;
  onBarcodeMissAddManually?: () => void;
  onApplyFoodSelection: (
    food: FoodItem,
    options?: { openComposer?: boolean; hideResults?: boolean },
  ) => void;
  onCustomFoodOpen: () => void;
  onEditCustomFood?: (food: FoodItem) => void;
  onClearSearch: () => void;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  selectedFoodTotals: Pick<
    NutritionTotals,
    "calories" | "protein" | "carbs" | "fat"
  > | null;
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
  recentFoods?: RecentConsumedFood[];
  isLoadingRecentFoods?: boolean;
  onRegisterRecentFood?: (food: RecentConsumedFood) => void;
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
  searchSuggestions,
  resultsVisible,
  searchResults,
  activeSource,
  onSourceChange,
  onSearchSuggestion,
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
  recentFoods,
  isLoadingRecentFoods,
  onRegisterRecentFood,
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
      searchSuggestions={searchSuggestions}
      resultsVisible={resultsVisible}
      searchResults={searchResults}
      activeSource={activeSource}
      onSourceChange={onSourceChange}
      onSearchSuggestion={onSearchSuggestion}
      resultState={resultState}
      barcodeMissCode={barcodeMissCode}
      onBarcodeMissAddManually={onBarcodeMissAddManually}
      onApplyFoodSelection={onApplyFoodSelection}
      onCustomFoodOpen={onCustomFoodOpen}
      onEditCustomFood={onEditCustomFood}
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
      recentFoods={recentFoods}
      isLoadingRecentFoods={isLoadingRecentFoods}
      onRegisterRecentFood={onRegisterRecentFood}
    />
  );
}
