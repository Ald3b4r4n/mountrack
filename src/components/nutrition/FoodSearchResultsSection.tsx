import type { ReactNode, RefObject } from "react";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import { EmptyState } from "./CommonUI";
import { formatCalories, formatFoodSourceLabel, getFoodLabel } from "@/modules/nutrition/ui-helpers";

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
  onCustomFoodOpen: () => void;
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
  searchSourceLabel,
  onCustomFoodOpen,
  onClearSearch,
  onSelectFood,
  onReopenSearchResults,
  composerContent,
}: FoodSearchResultsSectionProps) {
  if (!hasSearchSession) {
    return null;
  }

  return (
    <>
      {isMobileLayout && selectedFood && !isComposerOpen ? (
        <div className="glass-panel static-panel border-[#34d399]/18 bg-[#06162d]/72 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Pronto para registrar
              </span>
              <strong className="mt-1 block">{getFoodLabel(selectedFood)}</strong>
              <p className="mt-1 text-[0.84rem] text-[var(--text-secondary)]">
                Abra o registro para definir quantidade e confirmar {activeMealLabel.toLowerCase()}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenComposer} className="btn-primary min-w-auto px-3 py-2">
                Registrar em {activeMealLabel}
              </button>
              <button
                type="button"
                onClick={onSwapFoodSelection}
                className="btn-outline min-w-auto px-3 py-2"
              >
                Trocar alimento
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={resultsPanelRef}
        className={`grid gap-4 ${
          isMobileLayout ? "grid-cols-1" : "grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        }`}
      >
        <div className="glass-panel static-panel p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <strong className="block font-['Outfit',sans-serif]">Resultados</strong>
              <span className="text-[0.84rem] text-[var(--text-secondary)]">Selecione um item para abrir o registro.</span>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {isEnrichingExternal ? <span className="badge badge-success">Complementando</span> : null}
              {searchSourceLabel ? <span className="badge badge-success">{searchSourceLabel}</span> : null}
              {hasVisibleResults ? <span className="badge badge-success">{searchResults.length} itens</span> : null}
              <button type="button" onClick={onCustomFoodOpen} className="btn-outline min-w-auto px-3 py-1.5">
                Criar alimento
              </button>
              {searchResults.length || selectedFood ? (
                <button type="button" onClick={onClearSearch} className="btn-outline min-w-auto px-3 py-1.5">
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid max-h-[min(48vh,420px)] gap-2.5 overflow-y-auto pr-1">
            {hasVisibleResults ? (
              searchResults.map((food) => {
                const caloriesLabel =
                  food.caloriesPer100 == null ? "--" : `${formatCalories(food.caloriesPer100)} / 100${food.baseUnit}`;
                const isSelected = selectedFood?.id === food.id;

                return (
                  <button
                    type="button"
                    key={food.id}
                    onClick={() => onSelectFood(food)}
                    className={`glass-panel static-panel cursor-pointer p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-[rgba(52,211,153,0.3)] bg-[#34d399]/10"
                        : "bg-[#051227]/60 hover:border-[#34d399]/16 hover:bg-[#081b35]/72"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="mb-0.5 block">{getFoodLabel(food)}</strong>
                        <span className="block text-[0.82rem] text-[var(--text-secondary)]">
                          {food.brand ? `${food.brand} - ` : ""}
                          {caloriesLabel}
                        </span>
                      </div>
                      <span className="whitespace-nowrap text-xs uppercase text-[var(--text-muted)]">
                        {formatFoodSourceLabel(food.source, { compact: true })}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState title={resultEmptyState.title} text={resultEmptyState.text} compact />
            )}
          </div>
        </div>

        {!isMobileLayout ? (
          <div className="glass-panel static-panel bg-[#06162d]/60 p-4">
            <div className="mb-3 flex flex-wrap justify-between gap-3">
              <div>
                <strong className="block">Registro</strong>
                <span className="text-[0.84rem] text-[var(--text-secondary)]">
                  Selecione, ajuste e registre sem sair da busca.
                </span>
              </div>
              {selectedFood ? (
                <button
                  type="button"
                  onClick={onReopenSearchResults}
                  className="btn-outline min-w-auto px-3 py-1.5"
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
