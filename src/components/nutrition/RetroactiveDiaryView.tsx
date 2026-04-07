"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  authorizedNutritionFetch,
  getNutritionErrorMessage,
} from "@/modules/nutrition/client";
import type {
  DiaryItemSnapshot,
  MealType,
} from "@/modules/nutrition/domain/types";
import { getDefaultMealDefinitions } from "@/modules/nutrition/meal-helpers";
import { MealSectionHeader } from "./MealSectionHeader";
import { DiaryItemRow } from "./DiaryItemRow";
import { MealHistoryDialog } from "./MealHistoryDialog";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { formatHistoryDate } from "@/modules/nutrition/ui-helpers";

interface RetroactiveDiaryViewProps {
  authUser: Parameters<typeof authorizedNutritionFetch>[0] | null;
  targetDate: string; // YYYY-MM-DD
  onClose: () => void;
  onMutated?: () => void;
  onOpenSearchForMeal?: (targetDate: string, meal: MealType) => void;
}

interface DiaryResponse {
  date: string;
  waterIntakeMl: number;
  items: DiaryItemSnapshot[];
}

interface DiaryLookupResponse {
  diary?: Partial<DiaryResponse>;
  date?: string;
  waterIntakeMl?: number;
  items?: DiaryItemSnapshot[];
}

export function RetroactiveDiaryView({
  authUser,
  targetDate,
  onClose,
  onMutated,
  onOpenSearchForMeal,
}: RetroactiveDiaryViewProps) {
  // Normalize to YYYY-MM-DD — entry.date may arrive as a full ISO timestamp
  const dateKey = targetDate.slice(0, 10);

  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [inspectedMealKey, setInspectedMealKey] = useState<MealType | null>(
    null,
  );
  const [inspectedItemId, setInspectedItemId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mealDefinitions = getDefaultMealDefinitions();

  const fetchDiary = useCallback(async () => {
    if (!authUser) {
      setLoadError(
        "Sua sessão da nutrição não foi validada. Entre novamente e tente de novo.",
      );
      setDiary(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await authorizedNutritionFetch(
        authUser,
        `/api/nutrition/diaries/${dateKey}`,
      );

      if (!response.ok) {
        setLoadError(
          await getNutritionErrorMessage(
            response,
            "Não foi possível carregar este dia do diário.",
          ),
        );
        setDiary(null);
        return;
      }

      const payload = (await response.json()) as DiaryLookupResponse;
      const resolvedDiary = payload.diary ?? payload;

      if (!Array.isArray(resolvedDiary.items)) {
        setLoadError("Não foi possível carregar os itens deste dia.");
        setDiary(null);
        return;
      }

      setDiary({
        date:
          typeof resolvedDiary.date === "string"
            ? resolvedDiary.date.slice(0, 10)
            : dateKey,
        waterIntakeMl: Number(resolvedDiary.waterIntakeMl ?? 0),
        items: resolvedDiary.items,
      });
    } catch {
      setLoadError("Não foi possível carregar este dia do diário.");
      setDiary(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, dateKey]);

  useEffect(() => {
    void fetchDiary();

    setExpandedMeals(new Set());
    setInspectedMealKey(null);
    setInspectedItemId(null);
    setDeleteCandidateId(null);
    setIsDeletePending(false);
  }, [fetchDiary]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const groupedItems: Record<string, DiaryItemSnapshot[]> = useMemo(() => {
    const grouped: Record<string, DiaryItemSnapshot[]> = {};
    for (const item of diary?.items ?? []) {
      const key = item.mealType as string;
      (grouped[key] ??= []).push(item);
    }
    return grouped;
  }, [diary?.items]);

  const getMealCalories = useCallback(
    (mealKey: string) =>
      (groupedItems[mealKey] ?? []).reduce(
        (sum, item) => sum + item.calories,
        0,
      ),
    [groupedItems],
  );

  const inspectedMealDefinition =
    inspectedMealKey == null
      ? null
      : (mealDefinitions.find((meal) => meal.key === inspectedMealKey) ?? null);
  const inspectedMealAllItems =
    inspectedMealKey == null ? [] : (groupedItems[inspectedMealKey] ?? []);
  const inspectedMealItems =
    inspectedItemId == null
      ? inspectedMealAllItems
      : inspectedMealAllItems.filter((item) => item.id === inspectedItemId);
  const inspectedMealCalories = inspectedMealItems.reduce(
    (sum, item) => sum + item.calories,
    0,
  );
  const deleteCandidateName = deleteCandidateId
    ? (diary?.items.find((item) => item.id === deleteCandidateId)?.foodName ??
      null)
    : null;

  const openSearchForMeal = (meal: MealType) => {
    onOpenSearchForMeal?.(dateKey, meal);
    setInspectedMealKey(null);
    onClose();
  };

  const handleDeleteItem = async (itemId: string): Promise<boolean> => {
    if (!authUser) {
      setLoadError(
        "Sua sessão da nutrição não foi validada. Entre novamente e tente de novo.",
      );
      return false;
    }

    try {
      const response = await authorizedNutritionFetch(
        authUser,
        `/api/nutrition/diary-items/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        setLoadError(
          await getNutritionErrorMessage(
            response,
            "Não foi possível remover esse item do histórico.",
          ),
        );
        return false;
      }

      setDiary((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) }
          : prev,
      );
      onMutated?.();
      return true;
    } catch {
      setLoadError("Não foi possível remover esse item do histórico.");
      return false;
    }
  };

  const requestDeleteItem = (itemId: string) => {
    setDeleteCandidateId(itemId);
  };

  const confirmDeleteItem = async () => {
    if (!deleteCandidateId) {
      return;
    }

    setIsDeletePending(true);
    try {
      const deleted = await handleDeleteItem(deleteCandidateId);
      if (deleted) {
        setToastMessage("Alimento removido do diário.");
      }
      setDeleteCandidateId(null);
    } finally {
      setIsDeletePending(false);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeletePending) {
      return;
    }

    setDeleteCandidateId(null);
  };

  const requestDeleteFromHistoryDialog = async (itemId: string) => {
    const deleted = await handleDeleteItem(itemId);
    if (deleted) {
      setToastMessage("Alimento removido do diário.");
    }
  };

  const handleUpdateDiaryItem = async ({
    itemId,
    quantity,
    mealType,
  }: {
    itemId: string;
    quantity: number;
    mealType: MealType;
  }): Promise<boolean> => {
    if (!authUser || !diary) {
      return false;
    }

    const currentItem = diary.items.find((item) => item.id === itemId);
    if (!currentItem) {
      setLoadError("Item não encontrado para edição neste dia.");
      return false;
    }

    const mealLabel =
      mealDefinitions.find((meal) => meal.key === mealType)?.label ??
      currentItem.mealLabel ??
      mealType;

    try {
      const response = await authorizedNutritionFetch(
        authUser,
        `/api/nutrition/diary-items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            date: dateKey,
            foodId: currentItem.foodId,
            quantity,
            unit: currentItem.unit,
            mealType,
            mealLabel,
            consumedAt: currentItem.consumedAt,
          }),
        },
      );

      if (!response.ok) {
        setLoadError(
          await getNutritionErrorMessage(
            response,
            "Não foi possível atualizar esse item do histórico.",
          ),
        );
        return false;
      }

      await fetchDiary();
      onMutated?.();
      return true;
    } catch {
      setLoadError("Não foi possível atualizar esse item do histórico.");
      return false;
    }
  };

  const toggleMeal = (mealKey: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealKey)) next.delete(mealKey);
      else next.add(mealKey);
      return next;
    });
  };

  if (typeof document === "undefined") {
    return null;
  }

  const dialogContent = (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      <div
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="glass-panel relative w-full max-w-lg rounded-[1.5rem] border border-white/10 bg-[#050f1d] p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[0.95rem] font-bold">Diário retroativo</h3>
            <span className="text-[0.8rem] text-[var(--text-secondary)]">
              {formatHistoryDate(dateKey)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-3 py-1.5 text-[0.82rem]"
          >
            Fechar
          </button>
        </div>

        {loadError ? (
          <p className="mb-3 rounded-[0.75rem] border border-[#f87171]/25 bg-[#7f1d1d]/20 px-3 py-2 text-[0.82rem] text-[#fecaca]">
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-8 text-center text-[0.88rem] text-[var(--text-secondary)]">
            Carregando...
          </p>
        ) : (
          <div className="grid gap-2">
            {mealDefinitions.map((meal) => {
              const items = groupedItems[meal.key as MealType] ?? [];
              const isExpanded = expandedMeals.has(meal.key);
              return (
                <div
                  key={meal.key}
                  className="glass-panel static-panel bg-[#040f20]/70 p-3"
                >
                  <MealSectionHeader
                    mealType={meal.key}
                    label={meal.label}
                    totalCalories={getMealCalories(meal.key)}
                    isExpanded={isExpanded}
                    onToggle={() => toggleMeal(meal.key)}
                    onAddItem={() => openSearchForMeal(meal.key)}
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
                              onEdit={() => {
                                setInspectedMealKey(meal.key);
                                setInspectedItemId(item.id);
                              }}
                              onDelete={(itemId) => {
                                requestDeleteItem(itemId);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MealHistoryDialog
        open={Boolean(inspectedMealDefinition)}
        meal={inspectedMealDefinition}
        calories={inspectedMealCalories}
        items={inspectedMealItems}
        initialEditingItemId={inspectedItemId}
        mealDefinitions={mealDefinitions}
        onClose={() => {
          setInspectedMealKey(null);
          setInspectedItemId(null);
        }}
        onOpenSearchForMeal={(meal) => openSearchForMeal(meal)}
        onUpdateDiaryItem={(input) => handleUpdateDiaryItem(input)}
        onEditSaved={() => {
          setToastMessage("Item do historico atualizado.");
        }}
        onDeleteDiaryItem={async (itemId) => {
          await requestDeleteFromHistoryDialog(itemId);
        }}
      />

      <ConfirmActionDialog
        open={Boolean(deleteCandidateId)}
        title="Excluir alimento"
        description="Tem certeza que deseja excluir este alimento?"
        itemName={deleteCandidateName}
        confirmLabel="Excluir"
        isPending={isDeletePending}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteItem}
      />

      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex justify-center px-4"
        >
          <div className="rounded-full border border-[#34d399]/28 bg-[#041f1d]/95 px-4 py-2 text-[0.82rem] font-medium text-[#86efac] shadow-2xl">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(dialogContent, document.body);
}
