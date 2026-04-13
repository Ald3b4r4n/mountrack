import { useEffect, useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Check, Pencil } from "lucide-react";
import type {
  FoodItem,
  NutritionGoal,
  RecentConsumedFood,
} from "@/modules/nutrition/domain/types";
import {
  formatCalories,
  formatFoodSourceLabel,
  getFoodLabel,
} from "@/modules/nutrition/ui-helpers";
import {
  SourceFilterChips,
  type FoodSourceFilter,
} from "@/components/nutrition/SourceFilterChips";

interface FoodSearchResultsSectionProps {
  isMobileLayout: boolean;
  hasSearchSession: boolean;
  activeSource?: FoodSourceFilter;
  onSourceChange?: (source: FoodSourceFilter) => void;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  activeMealLabel: string;
  onOpenComposer: () => void;
  onSwapFoodSelection: () => void;
  resultsPanelRef: RefObject<HTMLDivElement | null>;
  hasVisibleResults: boolean;
  searchResults: FoodItem[];
  searchQuery?: string;
  searchSuggestions: string[];
  resultEmptyState: { title: string; text: string };
  isEnrichingExternal: boolean;
  searchSourceLabel: string | null;
  recentFoods?: RecentConsumedFood[];
  isLoadingRecentFoods?: boolean;
  onRegisterRecentFood?: (food: RecentConsumedFood) => void;
  onSearchSuggestion?: (value: string) => void;
  nutritionGoal?: NutritionGoal | null;
  onCustomFoodOpen: () => void;
  onEditCustomFood?: (food: FoodItem) => void;
  onClearSearch: () => void;
  onSelectFood: (food: FoodItem) => void;
  onReopenSearchResults: () => void;
  composerContent: ReactNode;
}

function resolveFoodQualityBadge(food: FoodItem): {
  label: string;
  toneClass: string;
} {
  const completeness = food.completenessScore ?? null;
  const confidence = food.confidenceScore;

  if ((completeness != null && completeness >= 0.85) || confidence >= 1.6) {
    return {
      label: "Completo",
      toneClass: "text-[#34d399]",
    };
  }

  if ((completeness != null && completeness >= 0.6) || confidence >= 1.0) {
    return {
      label: "Bom",
      toneClass: "text-[#22d3ee]",
    };
  }

  return {
    label: "Estimado",
    toneClass: "text-[var(--text-muted)]",
  };
}

function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function FoodSearchResultsSection({
  isMobileLayout,
  hasSearchSession,
  activeSource: controlledActiveSource,
  onSourceChange,
  selectedFood,
  isComposerOpen,
  activeMealLabel,
  onOpenComposer,
  onSwapFoodSelection,
  resultsPanelRef,
  hasVisibleResults,
  searchResults,
  searchQuery = "",
  searchSuggestions,
  resultEmptyState,
  isEnrichingExternal,
  recentFoods = [],
  isLoadingRecentFoods = false,
  onRegisterRecentFood,
  onSearchSuggestion,
  nutritionGoal,
  onEditCustomFood,
  onClearSearch,
  onSelectFood,
  onReopenSearchResults,
  composerContent,
}: FoodSearchResultsSectionProps) {
  const [localActiveSource, setLocalActiveSource] =
    useState<FoodSourceFilter>("all");
  const activeSource = controlledActiveSource ?? localActiveSource;
  const handleSourceChange = onSourceChange ?? setLocalActiveSource;
  const hasRecentFoods = recentFoods.length > 0;

  const availableSources = useMemo<FoodSourceFilter[]>(
    () => [
      "all",
      ...(hasRecentFoods ? (["recent"] as const) : []),
      ...Array.from(new Set(searchResults.map((food) => food.source))),
    ],
    [hasRecentFoods, searchResults],
  );

  useEffect(() => {
    if (activeSource === "all") {
      return;
    }

    if (!availableSources.includes(activeSource)) {
      handleSourceChange("all");
    }
  }, [activeSource, availableSources, handleSourceChange]);

  const visibleResults =
    activeSource === "all"
      ? searchResults
      : activeSource === "recent"
        ? []
      : searchResults.filter((food) => food.source === activeSource);
  const normalizedRecentQuery = normalizeSearchTerm(searchQuery);
  const visibleRecentFoods =
    activeSource === "recent" && normalizedRecentQuery
      ? recentFoods.filter((food) =>
          normalizeSearchTerm(food.foodName).includes(normalizedRecentQuery),
        )
      : recentFoods;
  const expandableSourceEntries = useMemo(
    () =>
      availableSources
        .filter(
          (source): source is Exclude<FoodSourceFilter, "all" | "recent"> =>
            source !== "all" && source !== "recent",
        )
        .map((source) => ({
          source,
          count: searchResults.filter((food) => food.source === source).length,
        }))
        .sort((left, right) => right.count - left.count),
    [availableSources, searchResults],
  );
  const sourceExploreTarget =
    activeSource === "all" ? expandableSourceEntries[0] : null;
  const resultCountLabel =
    activeSource === "recent"
      ? isLoadingRecentFoods
        ? "Recentes"
        : `${visibleRecentFoods.length} recente${visibleRecentFoods.length !== 1 ? "s" : ""}`
      : hasVisibleResults
        ? `${visibleResults.length} resultado${visibleResults.length !== 1 ? "s" : ""}`
        : "Resultados";
  const shouldShowSourceFilters =
    (hasVisibleResults || hasRecentFoods) && availableSources.length > 1;

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
          <strong className="mt-1.5 block text-[0.95rem]">
            {getFoodLabel(selectedFood)}
          </strong>
          {selectedFood.brand ? (
            <span className="mt-0.5 block text-[0.82rem] text-[var(--text-secondary)]">
              {selectedFood.brand}
            </span>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onOpenComposer}
              className="btn-primary px-4 py-2 text-[0.88rem]"
            >
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
          isMobileLayout
            ? "grid-cols-1"
            : "grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        }`}
      >
        {/* Results list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.78rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {resultCountLabel}
            </span>
            <div className="flex gap-2">
              {isEnrichingExternal ? (
                <span className="text-[0.75rem] text-[var(--accent-primary)] animate-pulse">
                  Complementando
                </span>
              ) : null}
              {searchResults.length > 0 || selectedFood || hasRecentFoods ? (
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

          {shouldShowSourceFilters ? (
            <SourceFilterChips
              activeSource={activeSource}
              onChange={handleSourceChange}
              availableSources={availableSources}
            />
          ) : null}

          {sourceExploreTarget ? (
            <button
              type="button"
              onClick={() => handleSourceChange(sourceExploreTarget.source)}
              className="mb-2 text-[0.78rem] text-[var(--accent-primary)] transition-colors hover:text-[#34d399]"
            >
              Ver mais da fonte{" "}
              {formatFoodSourceLabel(sourceExploreTarget.source, {
                compact: true,
              })}
            </button>
          ) : null}

          {searchSuggestions.length > 0 && onSearchSuggestion ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[0.75rem] text-[var(--text-muted)]">
                Você quis dizer:
              </span>
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSearchSuggestion(suggestion)}
                  className="rounded-full border border-[var(--border-glass)] px-2.5 py-1 text-[0.74rem] text-[var(--text-secondary)] transition-colors hover:border-[#34d399]/40 hover:text-[#34d399]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid max-h-[min(52vh,480px)] gap-1 overflow-y-auto">
            {activeSource === "recent" ? (
              isLoadingRecentFoods ? (
                <div className="py-8 text-center">
                  <p className="text-[0.88rem] text-[var(--text-secondary)]">
                    Carregando recentes...
                  </p>
                </div>
              ) : visibleRecentFoods.length > 0 ? (
                visibleRecentFoods.map((food) => (
                  <article
                    key={food.sourceItemId}
                    className="min-w-0 rounded-xl px-3 py-3 transition-colors hover:bg-[#ffffff]/[0.03]"
                  >
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <strong className="block truncate text-[0.9rem] leading-tight">
                          {food.foodName}
                        </strong>
                        <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--text-secondary)]">
                          {food.quantity} {food.unit} ·{" "}
                          {formatCalories(food.calories)}
                          {food.lastMealLabel
                            ? ` · ${food.lastMealLabel}`
                            : ""}
                        </span>
                      </div>
                      {onRegisterRecentFood ? (
                        <button
                          type="button"
                          onClick={() => onRegisterRecentFood(food)}
                          aria-label={`Registrar ${food.foodName}`}
                          className="btn-outline w-full shrink-0 justify-center rounded-[0.75rem] px-3 py-1.5 text-[0.78rem] sm:w-auto"
                        >
                          Registrar
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[0.88rem] text-[var(--text-secondary)]">
                    Nenhum recente para esta busca.
                  </p>
                </div>
              )
            ) : hasVisibleResults ? (
              visibleResults.map((food) => {
                const kcal = food.caloriesPer100;
                const kcalLabel =
                  kcal == null ? "--" : `${kcal.toFixed(0)} kcal`;
                const qualityBadge = resolveFoodQualityBadge(food);
                const idrPercent =
                  nutritionGoal && kcal != null && food.servingGrams
                    ? Math.round(
                        (kcal * food.servingGrams) /
                          nutritionGoal.targetCalories,
                      )
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
                        {isSelected ? (
                          <Check size={14} strokeWidth={3} />
                        ) : null}
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
                            <span className="shrink-0 text-[var(--text-muted)]">
                              IDR {idrPercent}%
                            </span>
                          ) : null}
                          <span
                            className={`shrink-0 ${qualityBadge.toneClass}`}
                          >
                            {qualityBadge.label}
                          </span>
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
                <p className="text-[0.88rem] text-[var(--text-secondary)]">
                  {resultEmptyState.text}
                </p>
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
