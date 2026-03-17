import { CheckCircle2 } from "lucide-react";
import type { DiaryItemSnapshot, MealDefinition, MealType } from "@/modules/nutrition/domain/types";
import { EmptyState, PaginationControls, SegmentButton } from "./CommonUI";
import { MobilePaginationControls, MobileStatusCard } from "./DiaryPanelShared";
import { formatCalories, formatMilliliters } from "@/modules/nutrition/ui-helpers";

interface DiaryTodayViewProps {
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Record<string, number>;
  };
  waterRatio: number;
  isMobileLayout: boolean;
  handleAdjustWater: (amount: number) => void;
  handleSaveWater: () => void;
  isUpdatingWater: boolean;
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  setActiveDiaryMeal: (meal: MealType) => void;
  setDiaryPage: (page: number) => void;
  onOpenCustomWater?: () => void;
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
  isMobileLayout,
  handleAdjustWater,
  handleSaveWater,
  isUpdatingWater,
  mealDefinitions,
  activeDiaryMeal,
  setActiveDiaryMeal,
  setDiaryPage,
  onOpenCustomWater,
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
            <div className="flex items-center gap-2">
              <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Água</span>
              {isUpdatingWater && (
                <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-sky-400">
                  <span className="h-1 w-1 animate-ping rounded-full bg-current" />
                  Sincronizando...
                </span>
              )}
            </div>
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
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              handleAdjustWater(250);
              setTimeout(() => handleSaveWater?.(), 0);
            }}
            className="btn-outline min-h-[2.8rem] rounded-[0.95rem] text-sky-300"
          >
            <span className="mr-1">🥛</span> 250
          </button>
          <button
            onClick={() => {
              handleAdjustWater(500);
              setTimeout(() => handleSaveWater?.(), 0);
            }}
            className="btn-outline min-h-[2.8rem] rounded-[0.95rem] text-sky-300"
          >
            <span className="mr-1">🏺</span> 500
          </button>
          <button
            onClick={onOpenCustomWater}
            className="btn-outline min-h-[2.8rem] rounded-[0.95rem] text-[var(--text-muted)]"
          >
            Personalizado
          </button>
        </div>
      </div>

      {isMobileLayout ? (
        <div className="glass-panel static-panel bg-[#050f1d]/80 p-4 border-white/5 shadow-xl rounded-[1.25rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
                REFEIÇÃO EM FOCO
              </span>
              <strong className="mt-1 block text-[1.2rem] font-black tracking-tight text-[var(--text-primary)]">{activeMealLabel}</strong>
              <p className="mt-1 text-[0.8rem] font-medium text-[var(--text-secondary)] opacity-70">
                {activeDiaryItems.length} item(ns) registrados agora.
              </p>
            </div>
            <span className="badge badge-success px-3 py-1.5 font-black ring-1 ring-white/10">{formatCalories(activeMealCalories)}</span>
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
          <MobileStatusCard eyebrow="Sincronizando" title="Atualizando registros" text="Os itens desta refeição aparecem aqui em instantes." />
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
