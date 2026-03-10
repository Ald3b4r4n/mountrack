import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ScanLine } from "lucide-react";
import type {
  FoodItem,
  MealDefinition,
  MealType,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import {
  EmptyState,
  Field,
  MacroValue,
  PanelHeader,
  SegmentButton,
} from "./CommonUI";
import {
  formatCalories,
  formatFoodSourceLabel,
  formatGrams,
  getFoodLabel,
} from "@/modules/nutrition/ui-helpers";

type SearchMode = "name" | "barcode" | "custom";

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
  onApplyFoodSelection: (food: FoodItem) => void;
  onCustomFoodOpen: () => void;
  onClearSearch: () => void;
  selectedFood: FoodItem | null;
  isComposerOpen: boolean;
  selectedFoodTotals: { protein: number; carbs: number; fat: number } | null;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onReopenSearchResults: () => void;
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
  selectedFoodTotals: { protein: number; carbs: number; fat: number } | null;
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
        text="Escolha um resultado para ajustar a porcao e registrar no diario."
        compact
      />
    );
  }

  return (
    <div className="grid gap-3.5">
      <div className="glass-panel static-panel bg-[#040f20]/70 p-3.5">
        <div className="mb-2.5 flex flex-wrap justify-between gap-3">
          <div>
            <strong className="block">{getFoodLabel(selectedFood)}</strong>
            <span className="block text-[0.82rem] text-[var(--text-secondary)]">
              {selectedFood.brand ? `${selectedFood.brand} - ` : ""}
              {formatFoodSourceLabel(selectedFood.source)}
            </span>
          </div>
          <span className="badge badge-success self-start">
            {selectedFood.caloriesPer100 != null
              ? `${formatCalories(selectedFood.caloriesPer100)} / 100${selectedFood.baseUnit}`
              : "Sem kcal base"}
          </span>
        </div>

        {selectedFoodTotals ? (
          <div className="grid grid-cols-3 gap-2">
            <MacroValue
              label="Proteina"
              value={formatGrams(selectedFoodTotals.protein)}
              accent="#34d399"
              compact
            />
            <MacroValue
              label="Carbo"
              value={formatGrams(selectedFoodTotals.carbs)}
              accent="#22d3ee"
              compact
            />
            <MacroValue
              label="Gordura"
              value={formatGrams(selectedFoodTotals.fat)}
              accent="#fb7185"
              compact
            />
          </div>
        ) : (
          <p className="text-[0.82rem] text-[var(--text-secondary)]">
            Ajuste a quantidade para calcular os macros desta porcao.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Quantidade">
          <input
            className="input-field"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Unidade">
          <select
            className="input-field"
            value={unit}
            onChange={(event) => onUnitChange(event.target.value as NutritionUnit)}
          >
            <option value="g">Gramas</option>
            <option value="ml">Mililitros</option>
            <option value="serving">Porcao</option>
            <option value="unit">Unidade</option>
          </select>
        </Field>
        <Field label="Refeicao">
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
        </Field>
      </div>

      {showActionButton ? (
        <button type="button" onClick={onAddDiaryItem} className="btn-primary w-full">
          Adicionar ao diario
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
  onApplyFoodSelection,
  onCustomFoodOpen,
  onClearSearch,
  selectedFood,
  isComposerOpen,
  selectedFoodTotals,
  onOpenComposer,
  onCloseComposer,
  onReopenSearchResults,
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
      ? "Busque no catalogo salvo e receba novas referencias sem travar a tela."
      : storageMode === "checking"
        ? "Preparando o catalogo e as referencias de apoio..."
        : "Os registros desta area estao ativos so neste aparelho enquanto a sincronizacao nao volta.";
  const searchActivitySummary = isSearching
    ? "Buscando no catalogo do app..."
    : isEnrichingExternal
      ? "Novas referencias serao adicionadas em segundo plano."
      : null;

  const hasVisibleResults = resultsVisible && searchResults.length > 0;
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
            ? "Abra o registro para ajustar quantidade e refeicao, ou troque o alimento."
            : "Use o compositor ao lado para finalizar o lancamento.",
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
    onApplyFoodSelection(food);
  }

  function handleMobileComposerSubmit() {
    skipScrollRestoreRef.current = true;
    onAddDiaryItem();
  }

  const mobileComposer =
    isMobileLayout && selectedFood && isComposerOpen && portalTarget
      ? createPortal(
          <div className="fixed inset-0 z-[80] pointer-events-none">
            <button
              type="button"
              className="pointer-events-auto absolute inset-0 z-0 bg-[#02060d]/84 backdrop-blur-[14px]"
              onClick={onCloseComposer}
              aria-label="Fechar registro do alimento"
            />

            <div
              className="relative z-10 flex h-full flex-col px-2.5"
              style={{
                paddingTop: "calc(0.55rem + env(safe-area-inset-top, 0px))",
                paddingBottom: "calc(0.55rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="nutrition-mobile-composer-title"
                className="pointer-events-auto relative isolate flex h-full flex-col overflow-hidden rounded-[1.9rem] bg-[radial-gradient(circle_at_top,rgba(8,29,48,0.98),rgba(3,17,31,0.985)_42%,rgba(2,13,25,0.995)_100%)] ring-1 ring-[#14324a]/82 shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
              >
                <div className="absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.15),transparent_62%)]" />
                <div className="relative px-4 pb-3 pt-4">
                  <div className="mb-4 flex justify-center">
                    <span className="h-1.5 w-14 rounded-full bg-white/8" aria-hidden="true" />
                  </div>

                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={onCloseComposer}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#081728]/92 px-3.5 text-[0.9rem] text-[var(--text-primary)] ring-1 ring-[#17344d]/78 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.96]"
                      aria-label="Voltar"
                    >
                      <ArrowLeft size={18} />
                      <span>Voltar</span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="badge badge-success">Registro rapido</span>
                      <strong
                        id="nutrition-mobile-composer-title"
                        className="mt-3 block text-[1.18rem] leading-tight text-[var(--text-primary)]"
                      >
                        Registrar no diario
                      </strong>
                      <p className="mt-1 text-[0.88rem] leading-relaxed text-[var(--text-secondary)]">
                        Ajuste a porcao, confirme a refeicao e volte para o resumo do dia logo depois do registro.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onReopenSearchResults();
                      }}
                      className="rounded-full bg-[#07182a]/92 px-3.5 py-2 text-[0.85rem] text-[var(--text-primary)] ring-1 ring-[#17344d]/78 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.985]"
                    >
                      Trocar alimento
                    </button>
                    <span className="badge badge-success max-w-full truncate">
                      {selectedFood.barcode ? `Codigo ${selectedFood.barcode}` : "Selecionado para registro"}
                    </span>
                  </div>
                </div>

                <div
                  ref={composerScrollRef}
                  data-testid="mobile-composer-scroll-area"
                  className="relative flex-1 overflow-y-auto px-4 pb-4 pt-1 [overscroll-behavior:contain]"
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
                </div>

                <div className="relative px-4 pb-3 pt-3">
                  <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(3,17,31,0),rgba(3,17,31,0.88))]" />
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={handleMobileComposerSubmit}
                      className="btn-primary min-h-[3.35rem] w-full shadow-[0_18px_40px_rgba(52,211,153,0.18)]"
                    >
                      Adicionar ao diario
                    </button>
                    <p className="text-center text-[0.78rem] text-[var(--text-muted)]">
                      Depois do registro, voce volta para o painel do dia com o consumo atualizado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <section className="grid gap-4">
        <div className="glass-panel static-panel relative overflow-hidden p-4">
          {!embedded ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <PanelHeader
                  title="Buscar e registrar"
                  subtitle="Encontre um alimento, revise o resultado e registre o consumo sem perder o contexto do dia."
                />
                <span className="badge badge-success self-start">{searchCatalogBadge}</span>
              </div>

              <div className="mb-4 grid gap-1.5">
                <p className="text-sm text-[var(--text-secondary)]">{storageSummary}</p>
                {searchActivitySummary ? (
                  <p className="text-[0.82rem] text-[var(--accent-primary)]">{searchActivitySummary}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1.5">
                <p className="max-w-[42rem] text-sm text-[var(--text-secondary)]">{storageSummary}</p>
                {searchActivitySummary ? (
                  <p className="text-[0.82rem] text-[var(--accent-primary)]">{searchActivitySummary}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {isEnrichingExternal ? (
                  <span className="badge badge-success self-start">Atualizacao em fila</span>
                ) : null}
                <span className="badge badge-success self-start">{searchCatalogBadge}</span>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <SegmentButton
              active={searchMode === "name"}
              label="Nome"
              onClick={() => setSearchMode("name")}
            />
            <SegmentButton
              active={searchMode === "barcode"}
              label="Codigo"
              onClick={() => setSearchMode("barcode")}
            />
            <SegmentButton
              active={searchMode === "custom"}
              label="Manual"
              onClick={() => setSearchMode("custom")}
            />
          </div>

          {searchMode === "name" ? (
            <Field label="Nome do alimento">
              <div className={isMobileLayout ? "grid gap-2.5" : "flex flex-wrap gap-2.5"}>
                <input
                  className="input-field min-w-[14rem] flex-1"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearch();
                    }
                  }}
                  placeholder="Ex.: banana prata, arroz cozido, iogurte"
                />
                <div className={`grid gap-2.5 ${isMobileLayout ? "grid-cols-2" : "grid-cols-[auto]"}`}>
                  <button type="button" onClick={onSearch} className="btn-primary" disabled={isSearching}>
                    {isSearching ? "Buscando..." : "Buscar"}
                  </button>
                  {isMobileLayout ? (
                    <button
                      type="button"
                      onClick={onOpenScanner}
                      className="btn-outline inline-flex items-center justify-center gap-2 border-dashed text-[var(--accent-primary)]"
                    >
                      <ScanLine size={16} />
                      Escanear
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
          ) : null}

          {searchMode === "barcode" ? (
            <Field label="Codigo de barras">
              <div className="grid gap-2.5">
                <p className="text-[0.84rem] text-[var(--text-secondary)]">
                  Digite o numero da embalagem ou use a camera para ler o codigo automaticamente.
                </p>
                <div className={isMobileLayout ? "grid gap-2.5" : "flex flex-wrap gap-2.5"}>
                  <input
                    className="input-field min-w-[12rem] flex-1"
                    value={barcodeQuery}
                  onChange={(event) => onBarcodeQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onBarcodeLookup(barcodeQuery);
                    }
                  }}
                  placeholder="Ex.: 7891234567890"
                />
                  <div className={`grid gap-2.5 ${isMobileLayout ? "grid-cols-2" : "grid-cols-[auto_auto]"}`}>
                    <button type="button" onClick={() => onBarcodeLookup(barcodeQuery)} className="btn-primary">
                      Buscar codigo
                    </button>
                    <button
                      type="button"
                      onClick={onOpenScanner}
                      className="btn-outline inline-flex items-center justify-center gap-2 border-dashed text-[var(--accent-primary)]"
                    >
                      <ScanLine size={16} />
                      Escanear
                    </button>
                  </div>
                </div>
              </div>
            </Field>
          ) : null}

          {searchMode === "custom" ? (
            <div className="glass-panel static-panel grid gap-3 bg-[#041225]/72 p-4">
              <div>
                <strong className="block">Criar alimento manualmente</strong>
                <p className="mt-1 text-[0.9rem] text-[var(--text-secondary)]">
                  Salve um alimento seu para reencontrar depois na busca e usar no diario sem depender do catalogo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button type="button" onClick={onCustomFoodOpen} className="btn-primary">
                  Criar alimento
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("name")}
                  className="btn-outline min-w-auto px-3 py-2"
                >
                  Voltar para busca
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {isMobileLayout && selectedFood && !isComposerOpen ? (
          <div className="glass-panel static-panel border-[#34d399]/18 bg-[#06162d]/72 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Pronto para registrar
                </span>
                <strong className="mt-1 block">{getFoodLabel(selectedFood)}</strong>
                <p className="mt-1 text-[0.84rem] text-[var(--text-secondary)]">
                  Abra o registro para definir quantidade, unidade e refeicao.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onOpenComposer} className="btn-primary min-w-auto px-3 py-2">
                  Registrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReopenSearchResults();
                  }}
                  className="btn-outline min-w-auto px-3 py-2"
                >
                  Trocar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {hasSearchSession ? (
          <div
            className={`grid gap-4 ${
              isMobileLayout ? "grid-cols-1" : "grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
            }`}
          >
            <div className="glass-panel static-panel p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block font-['Outfit',sans-serif]">Resultados</strong>
                  <span className="text-[0.84rem] text-[var(--text-secondary)]">
                    Selecione um item para abrir o registro.
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {isEnrichingExternal ? (
                    <span className="badge badge-success">Complementando</span>
                  ) : null}
                  {searchSourceLabel ? (
                    <span className="badge badge-success">{searchSourceLabel}</span>
                  ) : null}
                  {hasVisibleResults ? (
                    <span className="badge badge-success">{searchResults.length} itens</span>
                  ) : null}
                    <button type="button" onClick={onCustomFoodOpen} className="btn-outline min-w-auto px-3 py-1.5">
                      Criar alimento
                    </button>
                    {searchResults.length || selectedFood ? (
                      <button
                        type="button"
                        onClick={onClearSearch}
                        className="btn-outline min-w-auto px-3 py-1.5"
                      >
                      Limpar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid max-h-[min(48vh,420px)] gap-2.5 overflow-y-auto pr-1">
                {hasVisibleResults ? (
                  searchResults.map((food) => {
                    const caloriesLabel =
                      food.caloriesPer100 == null
                        ? "--"
                        : `${formatCalories(food.caloriesPer100)} / 100${food.baseUnit}`;
                    const isSelected = selectedFood?.id === food.id;

                    return (
                      <button
                        type="button"
                        key={food.id}
                        onClick={() => handleSelectFood(food)}
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
                    <strong className="block">Compositor</strong>
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
        ) : null}
      </section>

      {mobileComposer}
    </>
  );
}
