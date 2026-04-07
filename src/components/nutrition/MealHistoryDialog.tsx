"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { ConfirmActionDialog } from "@/components/nutrition/ConfirmActionDialog";
import { parseInputNumber } from "@/components/nutrition/nutrition-screen-helpers";
import type {
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";
import { formatCalories } from "@/modules/nutrition/ui-helpers";

interface MealHistoryDialogProps {
  open: boolean;
  meal: MealDefinition | null;
  calories: number;
  items: DiaryItemSnapshot[];
  initialEditingItemId?: string | null;
  mealDefinitions: MealDefinition[];
  onClose: () => void;
  onOpenSearchForMeal?: (meal: MealType) => void;
  onUpdateDiaryItem?: (input: {
    itemId: string;
    quantity: number;
    mealType: MealType;
  }) => Promise<boolean | void> | boolean | void;
  onDeleteDiaryItem?: (itemId: string) => Promise<void> | void;
  onEditSaved?: () => void;
}

function formatConsumedAt(consumedAt: string): string {
  const date = new Date(consumedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MealHistoryDialog({
  open,
  meal,
  calories,
  items,
  initialEditingItemId,
  mealDefinitions,
  onClose,
  onOpenSearchForMeal,
  onUpdateDiaryItem,
  onDeleteDiaryItem,
  onEditSaved,
}: MealHistoryDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [mealTypeDraft, setMealTypeDraft] = useState<MealType>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEditingItemId(null);
      setQuantityDraft("");
      setError(null);
      setPendingItemId(null);
      setDeleteCandidateId(null);
      setToastMessage(null);
      return;
    }

    const frame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useLayoutEffect(() => {
    if (!open || !meal) {
      return;
    }

    const initialItem = initialEditingItemId
      ? (items.find((item) => item.id === initialEditingItemId) ?? null)
      : null;

    if (initialItem) {
      setEditingItemId(initialItem.id);
      setQuantityDraft(String(initialItem.quantity));
      setMealTypeDraft(initialItem.mealType);
    } else {
      setEditingItemId(null);
      setQuantityDraft("");
      setMealTypeDraft(meal.key);
    }

    setError(null);
  }, [initialEditingItemId, items, meal, open]);

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

  if (!open || !meal) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const deleteCandidateName = deleteCandidateId
    ? (items.find((item) => item.id === deleteCandidateId)?.foodName ?? null)
    : null;

  function handleStartEditing(item: DiaryItemSnapshot) {
    setEditingItemId(item.id);
    setQuantityDraft(String(item.quantity));
    setMealTypeDraft(item.mealType);
    setError(null);
  }

  async function handleSaveEdit(item: DiaryItemSnapshot) {
    if (!onUpdateDiaryItem) {
      return;
    }

    const nextQuantity = parseInputNumber(quantityDraft);
    if (nextQuantity == null) {
      setError("Informe uma quantidade valida antes de salvar.");
      return;
    }

    setPendingItemId(item.id);
    setError(null);

    let saved = false;
    try {
      const updateResult = await onUpdateDiaryItem({
        itemId: item.id,
        quantity: nextQuantity,
        mealType: mealTypeDraft,
      });

      if (updateResult === false) {
        setError("Nao foi possivel atualizar esse item agora.");
        return;
      }

      saved = true;
    } catch {
      setError("Nao foi possivel atualizar esse item agora.");
    } finally {
      setPendingItemId(null);
    }

    if (saved) {
      setEditingItemId(null);
      setQuantityDraft("");
      onEditSaved?.();
      onClose();
    }
  }

  function handleDelete(itemId: string) {
    if (!onDeleteDiaryItem || pendingItemId) {
      return;
    }

    setDeleteCandidateId(itemId);
  }

  async function confirmDelete() {
    if (!onDeleteDiaryItem || !deleteCandidateId) {
      return;
    }

    setPendingItemId(deleteCandidateId);
    setError(null);
    try {
      await onDeleteDiaryItem(deleteCandidateId);
      setToastMessage("Alimento removido do diário.");
      if (editingItemId === deleteCandidateId) {
        setEditingItemId(null);
        setQuantityDraft("");
      }
    } finally {
      setPendingItemId(null);
      setDeleteCandidateId(null);
    }
  }

  const dialogContent = (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget && !pendingItemId) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-[rgba(8,14,26,0.82)] p-4 backdrop-blur-[14px] sm:items-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel w-full max-w-[42rem] max-h-[min(88vh,44rem)] overflow-y-auto p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="font-['Outfit',sans-serif] text-[1.15rem] text-[var(--text-primary)]"
            >
              {meal.label}
            </h3>
            <p
              id={descriptionId}
              className="mt-1 text-[0.88rem] leading-6 text-[var(--text-secondary)]"
            >
              {items.length} item(ns) registrados nesta refeicao hoje. Total
              atual: {formatCalories(calories)}.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="btn-outline min-w-auto px-3 py-2"
            aria-label={`Fechar detalhes de ${meal.label}`}
            disabled={Boolean(pendingItemId)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onOpenSearchForMeal ? (
            <button
              type="button"
              onClick={() => {
                onOpenSearchForMeal(meal.key);
                onClose();
              }}
              className="btn-primary"
            >
              Adicionar alimento
            </button>
          ) : null}
          <span className="badge badge-success">
            {formatCalories(calories)}
          </span>
        </div>

        {error ? (
          <p className="mt-3 text-[0.88rem] text-[#fca5a5]">{error}</p>
        ) : null}

        <div className="mt-4 grid max-h-[min(65vh,34rem)] gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="glass-panel static-panel border-dashed border-white/10 bg-[#020b1c]/60 p-4">
              <strong className="block text-[var(--text-primary)]">
                Nenhum alimento nesta refeicao.
              </strong>
              <p className="mt-1 text-[0.88rem] text-[var(--text-secondary)]">
                Abra esta refeicao e adicione o primeiro item quando precisar.
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const isEditing = editingItemId === item.id;
              const isPending = pendingItemId === item.id;

              return (
                <div key={item.id} className="grid gap-3">
                  {index > 0 ? (
                    <div
                      className="h-px w-full bg-white/12"
                      aria-hidden="true"
                    />
                  ) : null}

                  <article className="glass-panel static-panel rounded-[1rem] bg-[#051120]/82 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block break-words text-[var(--text-primary)]">
                          {item.foodName}
                        </strong>
                        <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                          {item.quantity} {item.unit} ·{" "}
                          {formatCalories(item.calories)}
                          {formatConsumedAt(item.consumedAt)
                            ? ` · ${formatConsumedAt(item.consumedAt)}`
                            : ""}
                        </span>
                      </div>
                      {!isEditing ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {onUpdateDiaryItem ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditing(item)}
                              className="btn-outline min-w-auto px-3 py-2 text-[0.78rem]"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Pencil size={14} />
                                Editar
                              </span>
                            </button>
                          ) : null}
                          {onDeleteDiaryItem ? (
                            <button
                              type="button"
                              onClick={() => void handleDelete(item.id)}
                              className="btn-outline min-w-auto px-3 py-2 text-[0.78rem]"
                              disabled={isPending}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Trash2 size={14} />
                                Remover
                              </span>
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1.5">
                          <span className="label">Quantidade</span>
                          <input
                            className="input-field"
                            inputMode="decimal"
                            type="number"
                            min="0.1"
                            step={
                              item.unit === "serving" || item.unit === "unit"
                                ? "0.1"
                                : "1"
                            }
                            value={quantityDraft}
                            onChange={(event) =>
                              setQuantityDraft(event.target.value)
                            }
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="label">Refeicao</span>
                          <select
                            className="input-field"
                            value={mealTypeDraft}
                            onChange={(event) =>
                              setMealTypeDraft(event.target.value as MealType)
                            }
                          >
                            {mealDefinitions.map((definition) => (
                              <option
                                key={definition.key}
                                value={definition.key}
                              >
                                {definition.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(null);
                              setQuantityDraft("");
                              setError(null);
                            }}
                            className="btn-outline min-w-auto px-3 py-2 text-[0.78rem]"
                            disabled={isPending}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(item)}
                            className="btn-primary min-w-auto px-3 py-2 text-[0.78rem]"
                            disabled={isPending}
                          >
                            {isPending ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                </div>
              );
            })
          )}
        </div>
      </div>

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

      <ConfirmActionDialog
        open={Boolean(deleteCandidateId)}
        title="Excluir alimento"
        description="Tem certeza que deseja excluir este alimento?"
        itemName={deleteCandidateName}
        confirmLabel="Excluir"
        isPending={pendingItemId === deleteCandidateId}
        onCancel={() => {
          if (!pendingItemId) {
            setDeleteCandidateId(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );

  return createPortal(dialogContent, document.body);
}
