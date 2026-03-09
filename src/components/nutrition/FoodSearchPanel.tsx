import React from "react";
import { FoodItem, NutritionUnit, MealType } from "@/modules/nutrition/domain/types";
import { MEAL_ORDER, MEAL_LABELS } from "@/modules/nutrition/constants";
import { PanelHeader, Field, EmptyState, MacroValue } from "./CommonUI";
import { formatCalories, formatGrams, getFoodLabel } from "@/modules/nutrition/ui-helpers";

interface FoodSearchPanelProps {
  storageMode: string;
  isMobileLayout: boolean;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  
  barcodeQuery: string;
  onBarcodeQueryChange: (val: string) => void;
  onBarcodeLookup: (val: string) => void;
  onOpenScanner: () => void;
  
  searchSourceLabel: string | null;
  resultsVisible: boolean;
  searchResults: FoodItem[];
  resultState: { title: string; text: string };
  onApplyFoodSelection: (food: FoodItem) => void;
  onCustomFoodOpen: () => void;
  onClearSearch: () => void;
  
  selectedFood: FoodItem | null;
  selectedFoodTotals: { protein: number; carbs: number; fat: number } | null;
  onReopenSearchResults: () => void;
  
  quantity: string;
  onQuantityChange: (val: string) => void;
  unit: NutritionUnit;
  onUnitChange: (val: NutritionUnit) => void;
  mealType: MealType;
  onMealTypeChange: (val: MealType) => void;
  
  onAddDiaryItem: () => void;
  searchCatalogBadge: string;
}

export function FoodSearchPanel({
  storageMode,
  isMobileLayout,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  barcodeQuery,
  onBarcodeQueryChange,
  onBarcodeLookup,
  onOpenScanner,
  searchSourceLabel,
  resultsVisible,
  searchResults,
  resultState,
  onApplyFoodSelection,
  onCustomFoodOpen,
  onClearSearch,
  selectedFood,
  selectedFoodTotals,
  onReopenSearchResults,
  quantity,
  onQuantityChange,
  unit,
  onUnitChange,
  mealType,
  onMealTypeChange,
  onAddDiaryItem,
  searchCatalogBadge
}: FoodSearchPanelProps) {
  return (
    <section className="glass-panel static-panel p-4 relative">
      <div className="flex justify-between gap-4 flex-wrap mb-4">
        <PanelHeader title="Busca rapida" subtitle="Pesquise por nome ou codigo de barras e registre o alimento em poucos passos." />
        <span className="badge badge-success self-start">{searchCatalogBadge}</span>
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-4">
        {storageMode === "database"
          ? "Busca com catalogo persistido e reforco por fontes externas quando necessario."
          : storageMode === "checking"
            ? "Conectando ao banco de dados e APIs de alimentos..."
            : "Servicos externos de alimentos ativados."}
      </p>

      <div className="grid gap-3 mb-4">
        <Field label="Nome do alimento">
          <div className="flex gap-2.5 flex-wrap">
            <input className="input-field flex-1 min-w-[14rem]" value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSearch(); } }} placeholder="Ex.: banana prata, arroz cozido, iogurte" />
            <button onClick={onSearch} className="btn-primary" disabled={isSearching}>{isSearching ? "Buscando..." : "Buscar"}</button>
          </div>
        </Field>

        <Field label="Codigo de barras">
          <div className="flex gap-2.5 flex-wrap">
            <input className="input-field flex-1 min-w-[12rem]" value={barcodeQuery} onChange={(event) => onBarcodeQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onBarcodeLookup(barcodeQuery); } }} placeholder="EAN / GTIN" />
            <button onClick={() => onBarcodeLookup(barcodeQuery)} className="btn-outline">Consultar</button>
            {!isMobileLayout && (
              <button onClick={onOpenScanner} className="btn-outline border-dashed text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10">
                📷 Escanear
              </button>
            )}
          </div>
        </Field>
      </div>

      <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2">
        <div>
          <div className="flex justify-between gap-3 mb-3 flex-wrap">
            <strong className="font-['Outfit',sans-serif]">Resultados</strong>
            <div className="flex gap-2 flex-wrap justify-end">
              {searchSourceLabel ? <span className="badge badge-success">{searchSourceLabel}</span> : null}
              {resultsVisible && searchResults.length ? <span className="badge badge-success">{searchResults.length} itens</span> : null}
              <button onClick={onCustomFoodOpen} className="btn-outline min-w-auto px-3 py-1.5">Cadastrar Alimento</button>
              {searchResults.length || selectedFood ? <button onClick={onClearSearch} className="btn-outline min-w-auto px-3 py-1.5">Limpar</button> : null}
            </div>
          </div>
          <div className="grid gap-2.5 max-h-[min(40vh,320px)] overflow-y-auto pr-1">
            {resultsVisible && searchResults.length ? searchResults.map((food) => {
              const caloriesLabel = food.caloriesPer100 == null ? "--" : `${formatCalories(food.caloriesPer100)} / 100${food.baseUnit}`;
              const isSelected = selectedFood?.id === food.id;
              
              return (
                <button 
                  key={food.id} 
                  onClick={() => onApplyFoodSelection(food)} 
                  className={`glass-panel static-panel p-3.5 text-left cursor-pointer transition-all ${
                    isSelected ? "border-[rgba(52,211,153,0.3)] bg-[#34d399]/10" : "bg-[#051227]/60"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block mb-0.5">{getFoodLabel(food)}</strong>
                      <span className="text-[var(--text-secondary)] text-[0.82rem] block">
                        {food.brand ? `${food.brand} · ` : ""}{caloriesLabel}
                      </span>
                    </div>
                    <span className="text-[var(--text-muted)] text-xs whitespace-nowrap uppercase">{food.source}</span>
                  </div>
                </button>
              );
            }) : <EmptyState title={resultState.title} text={resultState.text} compact />}
          </div>
        </div>

        <div className="glass-panel static-panel p-4 bg-[#06162d]/60">
          <div className="flex justify-between gap-3 mb-3 flex-wrap">
            <div>
              <strong className="block">Compositor</strong>
              <span className="text-[var(--text-secondary)] text-[0.84rem]">Selecione o alimento, ajuste unidade e registre.</span>
            </div>
            {selectedFood ? <button onClick={onReopenSearchResults} className="btn-outline min-w-auto px-3 py-1.5">Trocar alimento</button> : null}
          </div>

          {selectedFood ? (
            <div className="grid gap-3.5">
              <div className="glass-panel static-panel p-3.5 bg-[#040f20]/70">
                <div className="flex justify-between gap-3 flex-wrap mb-2.5">
                  <div>
                    <strong className="block">{getFoodLabel(selectedFood)}</strong>
                    <span className="text-[var(--text-secondary)] text-[0.82rem] block">
                      {selectedFood.brand ? `${selectedFood.brand} · ` : ""}{selectedFood.source.toUpperCase()}
                    </span>
                  </div>
                  <span className="badge badge-success self-start">
                    {selectedFood.caloriesPer100 != null ? `${formatCalories(selectedFood.caloriesPer100)} / 100${selectedFood.baseUnit}` : "Sem kcal base"}
                  </span>
                </div>
                {selectedFoodTotals ? (
                  <div className="grid gap-2 grid-cols-3">
                    <MacroValue label="Proteina" value={formatGrams(selectedFoodTotals.protein)} accent="#34d399" compact />
                    <MacroValue label="Carbo" value={formatGrams(selectedFoodTotals.carbs)} accent="#22d3ee" compact />
                    <MacroValue label="Gordura" value={formatGrams(selectedFoodTotals.fat)} accent="#fb7185" compact />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Field label="Quantidade">
                  <input className="input-field" value={quantity} onChange={(event) => onQuantityChange(event.target.value)} inputMode="decimal" />
                </Field>
                <Field label="Unidade">
                  <select className="input-field" value={unit} onChange={(event) => onUnitChange(event.target.value as NutritionUnit)}>
                    <option value="g">Gramas</option>
                    <option value="ml">Mililitros</option>
                    <option value="serving">Porcao</option>
                    <option value="unit">Unidade</option>
                  </select>
                </Field>
                <Field label="Refeicao">
                  <select className="input-field" value={mealType} onChange={(event) => onMealTypeChange(event.target.value as MealType)}>
                    {MEAL_ORDER.map((value) => <option key={value} value={value}>{MEAL_LABELS[value]}</option>)}
                  </select>
                </Field>
              </div>

              <button onClick={onAddDiaryItem} className="btn-primary w-full">Adicionar ao diário</button>
            </div>
          ) : <EmptyState title="Nenhum alimento selecionado" text="Escolha um resultado da busca para liberar o lançamento no diário." compact />}
        </div>
      </div>

      {isMobileLayout && (
        <button 
          onClick={onOpenScanner}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[var(--accent-primary)] text-[#0f172a] shadow-lg shadow-[var(--accent-primary)]/20 flex items-center justify-center z-40 transition-transform active:scale-95"
          aria-label="Abrir leitor de código de barras"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M7 10h10v4H7z" />
            <path d="M12 10v4" />
          </svg>
        </button>
      )}
    </section>
  );
}
