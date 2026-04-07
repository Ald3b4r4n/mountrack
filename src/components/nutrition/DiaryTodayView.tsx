import { useState } from "react";
import { CheckCircle2, Droplets, GlassWater } from "lucide-react";
import type {
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { MealSectionHeader } from "./MealSectionHeader";
import { DiaryItemRow } from "./DiaryItemRow";
import { formatMilliliters } from "@/modules/nutrition/ui-helpers";

interface DiaryTodayViewProps {
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Record<string, number>;
  };
  waterRatio: number;
  isMobileLayout: boolean;
  handleAdjustWater: (amount: number) => void;
  isUpdatingWater: boolean;
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  onOpenCustomWater?: () => void;
  onOpenSearchForMeal?: (meal: MealType) => void;
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
  handleDeleteDiaryItem: (id: string) => Promise<void> | void;
  onEditDiaryItem?: (item: DiaryItemSnapshot) => void;
  onManageMeal?: (meal: MealDefinition) => void;
  recentlyLoggedFoodLabel?: string | null;
  showWater?: boolean;
}

export function DiaryTodayView({
  summary,
  waterRatio,
  isMobileLayout,
  handleAdjustWater,
  isUpdatingWater,
  mealDefinitions,
  activeDiaryMeal,
  onOpenCustomWater,
  onOpenSearchForMeal,
  groupedDiaryItems,
  handleDeleteDiaryItem,
  onEditDiaryItem,
  onManageMeal,
  recentlyLoggedFoodLabel,
  showWater = true,
}: DiaryTodayViewProps) {
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(
    () => new Set([activeDiaryMeal]),
  );
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [isDeletePending, setIsDeletePending] = useState(false);

  const toggleMeal = (mealKey: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealKey)) next.delete(mealKey);
      else next.add(mealKey);
      return next;
    });
  };

  const getMealCalories = (mealKey: string) =>
    (groupedDiaryItems[mealKey] ?? []).reduce(
      (sum, item) => sum + item.calories,
      0,
    );

  const deleteCandidateName = (() => {
    if (!deleteCandidateId) {
      return null;
    }

    for (const mealItems of Object.values(groupedDiaryItems)) {
      const matchedItem = mealItems.find((item) => item.id === deleteCandidateId);
      if (matchedItem) {
        return matchedItem.foodName;
      }
    }

    return null;
  })();

  const confirmDeleteDiaryItem = async () => {
    if (!deleteCandidateId) {
      return;
    }

    setIsDeletePending(true);
    try {
      await Promise.resolve(handleDeleteDiaryItem(deleteCandidateId));
      setDeleteCandidateId(null);
    } finally {
      setIsDeletePending(false);
    }
  };

  const remainingWaterMl = Math.max(
    summary.targetWaterMl - summary.waterIntakeMl,
    0,
  );

  return (
    <div className="grid gap-[0.85rem]">
      {showWater ? (
        <div className="glass-panel static-panel bg-[#040f20]/70 p-[0.95rem]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Água
                </span>
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
              <span className="badge badge-success">
                {Math.round(waterRatio)}%
              </span>
              <span className="mt-1 block text-[0.78rem] text-[var(--text-secondary)]">
                {remainingWaterMl > 0
                  ? `Faltam ${formatMilliliters(remainingWaterMl)}`
                  : "Meta batida"}
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
              onClick={() => handleAdjustWater(250)}
              className="btn-outline min-h-[2.8rem] min-w-0 rounded-[0.95rem] px-1 text-[0.8rem] text-sky-300"
            >
              <GlassWater size={15} className="mr-1 inline-block" /> 250
            </button>
            <button
              onClick={() => handleAdjustWater(500)}
              className="btn-outline min-h-[2.8rem] min-w-0 rounded-[0.95rem] px-1 text-[0.8rem] text-sky-300"
            >
              <Droplets size={15} className="mr-1 inline-block" /> 500
            </button>
            <button
              onClick={onOpenCustomWater}
              className="btn-outline min-h-[2.8rem] min-w-0 overflow-hidden rounded-[0.95rem] px-1 text-[0.8rem] text-sky-300"
              style={{
                paddingInline: "0.35rem",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
              title="Personalizado"
            >
              Personalizado
            </button>
          </div>
        </div>
      ) : null}

      {/* Recently logged toast */}
      {recentlyLoggedFoodLabel ? (
        <div className="flex items-center gap-3 rounded-[0.9rem] border border-[#34d399]/18 bg-[#062032]/88 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#34d399]/12 text-[#86efac]">
            <CheckCircle2 size={15} />
          </span>
          <div className="min-w-0">
            <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[#86efac]">
              Registrado
            </span>
            <strong className="block truncate text-[0.88rem]">
              {recentlyLoggedFoodLabel}
            </strong>
          </div>
        </div>
      ) : null}

      {/* Meal accordion — shared by mobile and desktop */}
      <div className="grid gap-2">
        {mealDefinitions.map((meal) => {
          const items = groupedDiaryItems[meal.key] ?? [];
          const isExpanded = expandedMeals.has(meal.key);
          const mealTotal = getMealCalories(meal.key);
          const isCustomMeal =
            meal.isDefault === false && Boolean(onManageMeal);
          return (
            <div
              key={meal.key}
              className="glass-panel static-panel bg-[#040f20]/70 p-3"
            >
              <MealSectionHeader
                mealType={meal.key}
                label={meal.label}
                totalCalories={mealTotal}
                isExpanded={isExpanded}
                onToggle={() => toggleMeal(meal.key)}
                onAddItem={() => onOpenSearchForMeal?.(meal.key)}
              />
              {isExpanded ? (
                <div className="mt-2">
                  {items.length === 0 ? (
                    <p className="py-2 text-center text-[0.82rem] text-[var(--text-muted)]">
                      Sem itens nesta refeição.
                    </p>
                  ) : (
                    <div className="grid gap-0.5">
                      {items.map((item) => (
                        <DiaryItemRow
                          key={item.id}
                          item={item}
                          onEdit={onEditDiaryItem ?? (() => {})}
                          onDelete={(itemId) => {
                            setDeleteCandidateId(itemId);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {isCustomMeal ? (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => onManageMeal?.(meal)}
                        className="text-[0.78rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        Gerenciar refeição
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <ConfirmActionDialog
        open={Boolean(deleteCandidateId)}
        title="Excluir alimento"
        description="Tem certeza que deseja excluir este alimento?"
        itemName={deleteCandidateName}
        confirmLabel="Excluir"
        isPending={isDeletePending}
        onCancel={() => {
          if (!isDeletePending) {
            setDeleteCandidateId(null);
          }
        }}
        onConfirm={confirmDeleteDiaryItem}
      />
    </div>
  );
}
