import { useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Check, Pencil } from "lucide-react";
import type { FoodItem, NutritionGoal } from "@/modules/nutrition/domain/types";
import { formatCalories, formatFoodSourceLabel, getFoodLabel } from "@/modules/nutrition/ui-helpers";
import { SourceFilterChips, type FoodSourceFilter } from "@/components/nutrition/SourceFilterChips";

interface FoodSearchResultsSectionProps {
  isMobileLayout: boolean;
  hasSearchSession: boolean;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  activeMealLabel: string;
  onOpenComposer: () => void;
  onSwapFoodSelection: () => void;
  resultsPanelRef: RefObject<HTMLDivElement | null>;
  hasVisibleResults: boolean;
  searchResults: FoodItem[];
  resultEmptyState: { title: string; text: string };
  isEnrichingExternal: boolean;
  searchSourceLabel: string | null;
  nutritionGoal?: NutritionGoal | null;
  onCustomFoodOpen: () => void;
  onEditCustomFood?: (food: FoodItem) => void;
  onClearSearch: () => void;
  onSelectFood: (food: FoodItem) => void;
  onReopenSearchResults: () => void;
  composerContent: ReactNode;
}

export function FoodSearchResultsSection({
  isMobileLayout,
  hasSearchSession,
  selectedFood,
  isComposerOpen,
  activeMealLabel,
  onOpenComposer,
  onSwapFoodSelection,
  resultsPanelRef,
  hasVisibleResults,
  searchResults,
  resultEmptyState,
  isEnrichingExternal,
  nutritionGoal,
  onCustomFoodOpen,
  onEditCustomFood,
  onClearSearch,
  onSelectFood,
  onReopenSearchResults,
  composerContent,
}: FoodSearchResultsSectionProps) {
  const [activeSource, setActiveSource] = useState<FoodSourceFilter>("all");

  const availableSources: FoodSourceFilter[] = ["all", ...Array.from(
    new Set(searchResults.map((food) => food.source)),
  )];

  const visibleResults =
    activeSource === "all"
      ? searchResults
      : searchResults.filter((food) => food.source === activeSource);

  if (!hasSearchSession) {
    return null;
  }

  return (
    <>
      {/* Mobile ready card - shown when food selected but composer closed */}
      {isMobileLayout && selectedFood && !isComposerOpen ? (
        <div className="rounded-2xl border border-[#34d399]/20 bg-[#34d399]/[0.06] p-4">
          <span className="text-[0.72rem] font-medium uppercase tracking-wider text-[#34d399]">
            Pronto para registrar
          </span>
          <strong className="mt-1.5 block text-[0.95rem]">{getFoodLabel(selectedFood)}</strong>
          {selectedFood.brand ? (
            <span className="mt-0.5 block text-[0.82rem] text-[var(--text-secondary)]">
              {selectedFood.brand}
            </span>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onOpenComposer} className="btn-primary px-4 py-2 text-[0.88rem]">
              Registrar em {activeMealLabel}
            </button>
            <button
              type="button"
              onClick={onSwapFoodSelection}
              className="rounded-lg border border-[var(--border-glass)] px-3 py-2 text-[0.84rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Trocar
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={resultsPanelRef}
        className={`grid gap-4 ${
          isMobileLayout ? "grid-cols-1" : "grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        }`}
      >
        {/* Results list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.78rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {hasVisibleResults ? `${visibleResults.length} resultado${visibleResults.length !== 1 ? "s" : ""}` : "Resultados"}
            </span>
            <div className="flex gap-2">
              {isEnrichingExternal ? (
                <span className="text-[0.75rem] text-[var(--accent-primary)] animate-pulse">Complementando</span>
              ) : null}
              {(searchResults.length > 0 || selectedFood) ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="text-[0.78rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          {hasVisibleResults ? (
            <SourceFilterChips
              activeSource={activeSource}
              onChange={setActiveSource}
              availableSources={availableSources}
            />
          ) : null}

          <div className="grid max-h-[min(52vh,480px)] gap-1 overflow-y-auto">
            {hasVisibleResults ? (
              visibleResults.map((food) => {
                const kcal = food.caloriesPer100;
                const kcalLabel = kcal == null ? "--" : `${kcal.toFixed(0)} kcal`;
                const idrPercent =
                  nutritionGoal && kcal != null && food.servingGrams
                    ? Math.round((kcal * food.servingGrams) / nutritionGoal.targetCalories)
                    : null;
                const isSelected = selectedFood?.id === food.id;
                const isCustom = food.source === "custom";

                return (
                  <div key={food.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectFood(food)}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-[#34d399]/10"
                          : "hover:bg-[#ffffff]/[0.03]"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-[#34d399] bg-[#34d399] text-white"
                            : "border-[var(--text-muted)]/40"
                        }`}
                      >
                        {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                      </div>

                      {/* Food info */}
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[0.9rem] leading-tight">
                          {getFoodLabel(food)}
                        </strong>
                        <div className="mt-0.5 flex items-center gap-x-2 text-[0.78rem]">
                          <span className="min-w-0 flex-1 truncate text-[#34d399]">
                            {food.servingDescription
                              ? food.servingDescription
                              : `${formatFoodSourceLabel(food.source, { compact: true })}`}
                          </span>
                          {idrPercent != null ? (
                            <span className="shrink-0 text-[var(--text-muted)]">IDR {idrPercent}%</span>
                          ) : null}
                          <span className="shrink-0 font-medium text-[var(--text-secondary)]">
                            {kcalLabel}
                          </span>
                        </div>
                      </div>
                    </button>

                    {isCustom && onEditCustomFood ? (
                      <button
                        type="button"
                        onClick={() => onEditCustomFood(food)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[#ffffff]/[0.06] hover:text-[var(--text-primary)]"
                        title="Editar alimento"
                      >
                        <Pencil size={13} />
                      </button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <p className="text-[0.88rem] text-[var(--text-secondary)]">{resultEmptyState.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop composer side panel */}
        {!isMobileLayout ? (
          <div className="glass-panel static-panel bg-[#06162d]/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-[0.92rem]">Registro</strong>
              {selectedFood ? (
                <button
                  type="button"
                  onClick={onReopenSearchResults}
                  className="text-[0.78rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Trocar alimento
                </button>
              ) : null}
            </div>
            {composerContent}
          </div>
        ) : null}
      </div>
    </>
  );
}
