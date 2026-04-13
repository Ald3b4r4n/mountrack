import { useId } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Settings2 } from "lucide-react";
import type {
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";
import { formatCalories } from "@/modules/nutrition/ui-helpers";

interface MealSwitchDialogProps {
  open: boolean;
  onClose: () => void;
  activeMeal: MealType;
  mealDefinitions: MealDefinition[];
  mealCalories: Record<string, number>;
  mealItemsCount: Record<string, number>;
  onSelectMeal: (meal: MealType) => void;
  onCreateMeal: () => void;
  onManageMeal: (meal: MealDefinition) => void;
  title?: string;
  description?: string;
  selectLabel?: string;
  showMealManagement?: boolean;
}

export function MealSwitchDialog({
  open,
  onClose,
  activeMeal,
  mealDefinitions,
  mealCalories,
  mealItemsCount,
  onSelectMeal,
  onCreateMeal,
  onManageMeal,
  title = "Trocar refeição em foco",
  description,
  selectLabel = "Selecionar",
  showMealManagement = true,
}: MealSwitchDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const activeMealDefinition = mealDefinitions.find(
    (meal) => meal.key === activeMeal,
  ) ?? {
    key: activeMeal,
    label: String(activeMeal),
    isDefault: true,
  };

  const switchableMeals = mealDefinitions.filter(
    (meal) => meal.key !== activeMeal,
  );
  const customMeals = mealDefinitions.filter(
    (meal) => meal.isDefault === false,
  );

  return createPortal(
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 26, 0.82)",
        backdropFilter: "blur(14px)",
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel"
        style={{ width: "100%", maxWidth: "31rem", padding: "1.1rem" }}
      >
        <div className="mb-3">
          <h3 id={titleId} style={{ fontSize: "1.08rem", fontWeight: 700 }}>
            {title}
          </h3>
          <p
            id={descriptionId}
            style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}
          >
            {description ??
              `Refeição atual: ${activeMealDefinition.label}. Escolha outra refeição para continuar registrando.`}
          </p>
        </div>

        <div className="grid gap-2">
          {switchableMeals.length > 0 ? (
            switchableMeals.map((meal) => (
              <button
                key={meal.key}
                type="button"
                onClick={() => onSelectMeal(meal.key)}
                className="btn-outline w-full justify-between rounded-[0.85rem] px-3 py-2 text-left"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span className="min-w-0">
                  <strong className="block truncate text-[0.92rem] text-[var(--text-primary)]">
                    {meal.label}
                  </strong>
                  <span className="block text-[0.76rem] text-[var(--text-secondary)]">
                    {mealItemsCount[meal.key] ?? 0} item(ns) -{" "}
                    {formatCalories(mealCalories[meal.key] ?? 0)}
                  </span>
                </span>
                <span className="badge badge-success">{selectLabel}</span>
              </button>
            ))
          ) : (
            <div className="rounded-[0.85rem] border border-white/10 bg-white/5 px-3 py-2 text-[0.84rem] text-[var(--text-secondary)]">
              Nenhuma outra refeição disponivel para troca agora.
            </div>
          )}
        </div>

        {showMealManagement ? (
          <div className="mt-3 grid gap-2 rounded-[0.9rem] border border-white/10 bg-[#061326]/65 p-3">
            <button
              type="button"
              onClick={onCreateMeal}
              className="btn-outline w-full justify-center gap-2"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <PlusCircle size={16} />
              Criar refeição
            </button>
            {customMeals.length > 0 ? (
              customMeals.map((meal) => (
                <button
                  key={`manage-${meal.key}`}
                  type="button"
                  onClick={() => onManageMeal(meal)}
                  className="btn-outline w-full justify-center gap-2"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Settings2 size={16} />
                  Gerenciar {meal.label}
                </button>
              ))
            ) : (
              <p className="text-[0.78rem] text-[var(--text-secondary)]">
                Crie uma refeição extra para habilitar exclusao/edicao.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="btn-outline">
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
