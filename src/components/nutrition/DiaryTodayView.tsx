import { CheckCircle2 } from "lucide-react";
import type { DiaryItemSnapshot, MealDefinition, MealType } from "@/modules/nutrition/domain/types";
import { EmptyState, Field, PaginationControls, SegmentButton } from "./CommonUI";
import { MobilePaginationControls, MobileStatusCard } from "./DiaryPanelShared";
import { formatCalories, formatMilliliters } from "@/modules/nutrition/ui-helpers";

interface DiaryTodayViewProps {
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Record<string, number>;
  };
  waterRatio: number;
  hydrationMode: "increment" | "absolute";
  handleSelectHydrationMode: (mode: "increment" | "absolute", currentWater: number) => void;
  isMobileLayout: boolean;
  handleAdjustWater: (amount: number) => void;
  waterDraft: string;
  setWaterDraft: (val: string) => void;
  handleSaveWater: () => void;
  isUpdatingWater: boolean;
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  setActiveDiaryMeal: (meal: MealType) => void;
  setDiaryPage: (page: number) => void;
  onOpenSearchForMeal?: (meal: MealType) => void;
  onOpenMealChooser?: () => void;
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
  activeDiaryItems: DiaryItemSnapshot[];
  diaryPage: number;
  diaryTotalPages: number;
  isLoading: boolean;
  pagedDiaryItems: DiaryItemSnapshot[];
  handleDeleteDiaryItem: (id: string) => void;
  onManageMeal?: (meal: MealDefinition) => void;
  recentlyLoggedFoodLabel?: string | null;
}

export function DiaryTodayView({
  summary,
  waterRatio,
  hydrationMode,
  handleSelectHydrationMode,
  isMobileLayout,
  handleAdjustWater,
  waterDraft,
  setWaterDraft,
  handleSaveWater,
  isUpdatingWater,
  mealDefinitions,
  activeDiaryMeal,
  setActiveDiaryMeal,
  setDiaryPage,
  onOpenSearchForMeal,
  onOpenMealChooser,
  groupedDiaryItems,
  activeDiaryItems,
  diaryPage,
  diaryTotalPages,
  isLoading,
  pagedDiaryItems,
  handleDeleteDiaryItem,
  onManageMeal,
  recentlyLoggedFoodLabel,
}: DiaryTodayViewProps) {
  const activeMealDefinition =
    mealDefinitions.find((meal) => meal.key === activeDiaryMeal) ?? { key: activeDiaryMeal, label: String(activeDiaryMeal) };
  const activeMealLabel = activeMealDefinition.label;
  const canManageActiveMeal = activeMealDefinition.isDefault === false && Boolean(onManageMeal);
  const activeMealCalories = summary.meals[activeDiaryMeal] ?? 0;
  const remainingWaterMl = Math.max(summary.targetWaterMl - summary.waterIntakeMl, 0);

  return (
    <div className="grid gap-[0.85rem]">
      <div className="glass-panel static-panel bg-[#040f20]/70 p-[0.95rem]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Água</span>
            <strong className="mt-1 block text-[1.08rem] text-[var(--text-primary)]">
              {formatMilliliters(summary.waterIntakeMl)}
            </strong>
            <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
              de {formatMilliliters(summary.targetWaterMl)} hoje
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="badge badge-success">{Math.round(waterRatio)}%</span>
            <span className="mt-1 block text-[0.78rem] text-[var(--text-secondary)]">
              {remainingWaterMl > 0 ? `Faltam ${formatMilliliters(remainingWaterMl)}` : "Meta batida"}
            </span>
          </div>
        </div>
        <div className="progress-track mb-3">
          <div
            className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]"
            style={{ width: `${waterRatio}%` }}
          />
        </div>
        {isMobileLayout ? (
          <div className="grid gap-3">
            <div className="rounded-[0.95rem] border border-white/7 bg-[#071223]/72 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <SegmentButton
                  active={hydrationMode === "increment"}
                  label="Somar"
                  onClick={() => handleSelectHydrationMode("increment", summary.waterIntakeMl)}
                />
                <SegmentButton
                  active={hydrationMode === "absolute"}
                  label="Corrigir total"
                  onClick={() => handleSelectHydrationMode("absolute", summary.waterIntakeMl)}
                />
              </div>
              <span className="mt-2 block text-[0.8rem] text-[var(--text-secondary)]">
                {hydrationMode === "absolute"
                  ? "Ajuste o total final do dia."
                  : "Use atalhos rápidos ou lance manualmente."}
              </span>
            </div>
            {hydrationMode === "increment" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAdjustWater(250)}
                  className="btn-outline min-h-[2.8rem] w-full rounded-[0.95rem]"
                >
                  +250 ml
                </button>
                <button
                  onClick={() => handleAdjustWater(500)}
                  className="btn-outline min-h-[2.8rem] w-full rounded-[0.95rem]"
                >
                  +500 ml
                </button>
              </div>
            ) : null}
            <div className="rounded-[0.95rem] border border-white/7 bg-[#071223]/58 p-2.5">
              <div className="grid gap-2">
                <Field label={hydrationMode === "absolute" ? "Total correto do dia (ml)" : "Adicionar (ml)"}>
                  <input
                    className="input-field"
                    value={waterDraft}
                    onChange={(event) => setWaterDraft(event.target.value)}
                    inputMode="decimal"
                    placeholder={hydrationMode === "absolute" ? "Ex.: 1800" : "Ex.: 250"}
                  />
                </Field>
                <button
                  onClick={() => void handleSaveWater()}
                  className="btn-primary min-h-[3rem] w-full rounded-[0.95rem]"
                  disabled={isUpdatingWater}
                >
                  {isUpdatingWater
                    ? "Salvando..."
                    : hydrationMode === "absolute"
                      ? "Salvar total"
                      : "Adicionar água"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-[0.7rem] flex flex-wrap gap-[0.55rem]">
              <SegmentButton
                active={hydrationMode === "increment"}
                label="Somar"
                onClick={() => handleSelectHydrationMode("increment", summary.waterIntakeMl)}
              />
              <SegmentButton
                active={hydrationMode === "absolute"}
                label="Corrigir total"
                onClick={() => handleSelectHydrationMode("absolute", summary.waterIntakeMl)}
              />
            </div>
            {hydrationMode === "absolute" ? (
              <p className="mb-[0.7rem] text-[0.8rem] text-[var(--text-secondary)]">
                Use este modo para corrigir o total do dia quando houver erro no lançamento.
              </p>
            ) : null}
            <div
              className={`grid items-end gap-[0.6rem] ${
                hydrationMode === "increment"
                  ? "grid-cols-4"
                  : "grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]"
              }`}
            >
              {hydrationMode === "increment" ? (
                <button onClick={() => handleAdjustWater(250)} className="btn-outline w-full">
                  +250 ml
                </button>
              ) : null}
              {hydrationMode === "increment" ? (
                <button onClick={() => handleAdjustWater(500)} className="btn-outline w-full">
                  +500 ml
                </button>
              ) : null}
              <div className="min-w-0">
                <Field label={hydrationMode === "absolute" ? "Total correto do dia (ml)" : "Adicionar (ml)"}>
                  <input
                    className="input-field"
                    value={waterDraft}
                    onChange={(event) => setWaterDraft(event.target.value)}
                    inputMode="decimal"
                    placeholder={hydrationMode === "absolute" ? "Ex.: 1800" : "Ex.: 250"}
                  />
                </Field>
              </div>
              <div className="grid">
                <button
                  onClick={() => void handleSaveWater()}
                  className="btn-primary min-h-[3rem] w-full"
                  disabled={isUpdatingWater}
                >
                  {isUpdatingWater
                    ? "Salvando..."
                    : hydrationMode === "absolute"
                      ? "Salvar total"
                      : "Adicionar água"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isMobileLayout ? (
        <div className="glass-panel static-panel bg-[#040f20]/74 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Refeição ativa
              </span>
              <strong className="mt-1 block text-[1rem] text-[var(--text-primary)]">{activeMealLabel}</strong>
              <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                {activeDiaryItems.length} item(ns) hoje.
              </span>
            </div>
            <span className="badge badge-success whitespace-nowrap">{formatCalories(activeMealCalories)}</span>
          </div>
          {recentlyLoggedFoodLabel ? (
            <div className="mt-3 flex items-center gap-3 rounded-[0.9rem] border border-[#34d399]/18 bg-[#062032]/88 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#34d399]/12 text-[#86efac]">
                <CheckCircle2 size={16} />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[#86efac]">Registrado agora</span>
                <strong className="mt-0.5 block truncate text-[0.9rem] text-[var(--text-primary)]">
                  {recentlyLoggedFoodLabel}
                </strong>
                <span className="mt-0.5 block text-[0.78rem] text-[var(--text-secondary)]">{activeMealLabel}</span>
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2">
            {onOpenSearchForMeal ? (
              <button
                onClick={() => onOpenSearchForMeal(activeDiaryMeal)}
                className="btn-primary min-h-[2.85rem] w-full"
                aria-label={`Adicionar à refeição ${activeMealLabel}`}
              >
                {recentlyLoggedFoodLabel ? "Adicionar mais" : "Adicionar"}
              </button>
            ) : null}
            {onOpenMealChooser || canManageActiveMeal ? (
              <div className={`grid gap-2 ${canManageActiveMeal ? "grid-cols-2" : "grid-cols-1"}`}>
                {onOpenMealChooser ? (
                  <button
                    onClick={onOpenMealChooser}
                    className="btn-outline min-h-[2.85rem] w-full"
                    aria-label="Trocar refeição"
                  >
                    Trocar
                  </button>
                ) : null}
                {canManageActiveMeal ? (
                  <button
                    onClick={() => onManageMeal?.(activeMealDefinition)}
                    className="btn-outline min-h-[2.85rem] w-full"
                    aria-label={`Gerenciar refeição ${activeMealLabel}`}
                  >
                    Gerenciar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-[0.55rem]">
            {mealDefinitions.map((meal) => (
              <SegmentButton
                key={meal.key}
                active={activeDiaryMeal === meal.key}
                label={meal.label}
                meta={groupedDiaryItems[meal.key]?.length ?? 0}
                onClick={() => {
                  setActiveDiaryMeal(meal.key);
                  setDiaryPage(1);
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong className="block">{activeMealLabel}</strong>
              <span className="text-[0.84rem] text-[var(--text-secondary)]">
                {activeDiaryItems.length} item(ns) - {formatCalories(activeMealCalories)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManageActiveMeal ? (
                <button onClick={() => onManageMeal?.(activeMealDefinition)} className="btn-outline px-3 py-2 text-[0.8rem]">
                  Gerenciar refeição
                </button>
              ) : null}
              <span className="badge badge-success">
                Pagina {diaryPage}/{diaryTotalPages}
              </span>
            </div>
          </div>
        </>
      )}

      {isLoading ? (
        isMobileLayout ? (
          <MobileStatusCard eyebrow="Sincronizando" title="Atualizando refeição" text="Seus itens aparecem aqui em instantes." />
        ) : (
          <p className="text-[var(--text-secondary)]">Carregando diário...</p>
        )
      ) : null}
      {!isLoading && activeDiaryItems.length === 0 ? (
        <EmptyState
          title={isMobileLayout ? "Nada nesta refeição ainda" : "Sem itens nesta refeição"}
          text={
            isMobileLayout
              ? "Toque em Adicionar para lançar o primeiro item desta refeição."
              : "Escolha um alimento na coluna ao lado e registre no horário desejado."
          }
          compact
        />
      ) : null}
      {!isLoading && pagedDiaryItems.length > 0 ? (
        <div className="grid max-h-[min(36vh,310px)] gap-[0.65rem] overflow-y-auto pr-1">
          {pagedDiaryItems.map((item) => (
            <div
              key={item.id}
              className={`glass-panel static-panel flex justify-between gap-[0.85rem] p-3 px-3.5 ${
                isMobileLayout ? "items-start rounded-[1rem] bg-[#051120]/82" : "items-center"
              }`}
            >
              <div className="min-w-0 flex-1">
                <strong className="mb-0.5 block">{item.foodName}</strong>
                {isMobileLayout ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[0.76rem] text-[var(--text-secondary)]">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="rounded-full border border-[#34d399]/16 bg-[#34d399]/10 px-2.5 py-1 text-[0.76rem] text-[#86efac]">
                      {formatCalories(item.calories)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[0.84rem] text-[var(--text-secondary)]">
                    {item.quantity} {item.unit} - {formatCalories(item.calories)}
                  </span>
                )}
              </div>
              <button
                onClick={() => void handleDeleteDiaryItem(item.id)}
                className={`btn-outline min-w-auto px-3 py-2 ${isMobileLayout ? "shrink-0 rounded-[0.9rem]" : ""}`}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {activeDiaryItems.length > 0 && diaryTotalPages > 1 ? (
        isMobileLayout ? (
          <MobilePaginationControls page={diaryPage} totalPages={diaryTotalPages} onPageChange={setDiaryPage} />
        ) : (
          <PaginationControls page={diaryPage} totalPages={diaryTotalPages} onPageChange={setDiaryPage} />
        )
      ) : null}
    </div>
  );
}
