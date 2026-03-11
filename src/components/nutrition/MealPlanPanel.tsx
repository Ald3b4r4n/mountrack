import type { MealPlan, MealPlanItem, NutritionTotals } from "@/modules/nutrition/domain/types";
import { formatCalories, formatDeltaCalories, formatGrams } from "@/modules/nutrition/ui-helpers";
import { CollapsibleSection, EmptyState, Field, MiniValue } from "@/components/nutrition/CommonUI";

export interface MealPlanPanelProps {
  displayedMealPlan: MealPlan | null;
  planTotals: Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat"> | null;
  planCalories: string;
  requestedPlanCalories: number;
  planDelta: number;
  planRejectedFoods: string[];
  isGeneratingPlan: boolean;
  isExportingPdf: boolean;
  isMobileLayout: boolean;
  onPlanCaloriesChange: (value: string) => void;
  onGenerateMealPlan: () => void;
  onUseGoalCalories: () => void;
  onExportPdf: () => void;
  onDiscardMealPlan: () => void;
  onClearRejections: () => void;
  onChangeQuantity: (mealIndex: number, itemIndex: number, quantity: number) => void;
  onRejectItem: (mealIndex: number, itemIndex: number) => void;
}

function MealPlanEditorDisclosure({
  meal,
  mealIndex,
  defaultOpen = false,
  onChangeQuantity,
  onRejectItem,
}: {
  meal: MealPlan["meals"][number];
  mealIndex: number;
  defaultOpen?: boolean;
  onChangeQuantity: (mealIndex: number, itemIndex: number, quantity: number) => void;
  onRejectItem: (mealIndex: number, itemIndex: number) => void;
}) {
  return (
    <details open={defaultOpen} className="glass-panel static-panel bg-[#020b1c]/70 p-3.5 px-4">
      <summary className="cursor-pointer list-none rounded-[1rem] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.99]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="block">{meal.name}</strong>
            <span className="text-[0.84rem] text-[var(--text-secondary)]">
              {meal.items.length} itens - alvo {formatCalories(meal.targetCalories)}
            </span>
          </div>
          <span className="badge badge-success">{formatCalories(meal.totalCalories)}</span>
        </div>
      </summary>

      <div className="mt-3.5 grid gap-2.5">
        {meal.items.length ? (
          meal.items.map((item: MealPlanItem, itemIndex: number) => (
            <div
              key={`${meal.mealType}-${item.foodId}-${itemIndex}`}
              className="glass-panel static-panel bg-[#051227]/70 p-3 px-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="mb-0.5 block">{item.name}</strong>
                  <span className="text-[0.84rem] text-[var(--text-secondary)]">
                    {formatGrams(item.protein)} prot - {formatGrams(item.carbs)} carb - {formatGrams(item.fat)} gord
                  </span>
                </div>
                <span className="badge badge-success">{formatCalories(item.calories)}</span>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-end gap-2.5">
                <Field label={`Quantidade (${item.unit})`}>
                  <input
                    className="input-field"
                    type="number"
                    min={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"}
                    step={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"}
                    value={item.quantity}
                    onChange={(e) => onChangeQuantity(mealIndex, itemIndex, Number(e.target.value))}
                  />
                </Field>
                <button onClick={() => onRejectItem(mealIndex, itemIndex)} className="btn-outline min-h-[3rem] w-full">
                  Rejeitar item
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Sem itens restantes"
            text="Gere novamente para buscar outra combinação para essa refeição."
            compact
          />
        )}
      </div>
    </details>
  );
}

export function MealPlanPanel({
  displayedMealPlan,
  planTotals,
  planCalories,
  requestedPlanCalories,
  planDelta,
  planRejectedFoods,
  isGeneratingPlan,
  isExportingPdf,
  isMobileLayout,
  onPlanCaloriesChange,
  onGenerateMealPlan,
  onUseGoalCalories,
  onExportPdf,
  onDiscardMealPlan,
  onClearRejections,
  onChangeQuantity,
  onRejectItem,
}: MealPlanPanelProps) {
  return (
    <CollapsibleSection
      title="Cardápio diário"
      subtitle="Gere um cardápio base, ajuste as porções e exporte quando estiver pronto."
      badge={
        displayedMealPlan ? <span className="badge badge-success">{displayedMealPlan.meals.length} refeições</span> : undefined
      }
    >
      <div className={`grid gap-3 ${isMobileLayout ? "grid-cols-1" : "grid-cols-[minmax(0,170px)_minmax(0,1fr)]"}`}>
        <Field label="Calorias do cardápio">
          <input
            className="input-field"
            type="number"
            value={planCalories}
            onChange={(e) => onPlanCaloriesChange(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 items-stretch gap-2.5">
          <button onClick={onGenerateMealPlan} className="btn-primary min-h-[3rem] w-full" disabled={isGeneratingPlan}>
            {isGeneratingPlan ? "Gerando..." : "Gerar cardápio"}
          </button>

          <button onClick={onUseGoalCalories} className="btn-outline min-h-[3rem] w-full">
            Usar meta
          </button>

          <button
            onClick={onExportPdf}
            className="btn-outline min-h-[3rem] w-full"
            disabled={!displayedMealPlan || isExportingPdf}
          >
            {isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}
          </button>

          <button onClick={onDiscardMealPlan} className="btn-outline min-h-[3rem] w-full" disabled={!displayedMealPlan}>
            Descartar
          </button>
        </div>
      </div>

      {planRejectedFoods.length > 0 ? (
        <div className="mb-1 mt-3 flex flex-wrap justify-between gap-3">
          <span className="text-[0.88rem] text-[var(--text-secondary)]">
            Alimentos removidos: {planRejectedFoods.join(", ")}
          </span>
          <button onClick={onClearRejections} className="btn-outline min-w-auto px-3 py-1.5">
            Limpar lista
          </button>
        </div>
      ) : null}

      {displayedMealPlan && planTotals ? (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
            <MiniValue label="Alvo" value={formatCalories(requestedPlanCalories)} accent="var(--accent-secondary)" />
            <MiniValue label="Planejado" value={formatCalories(displayedMealPlan.totalCalories)} accent="var(--accent-primary)" />
            <MiniValue
              label="Delta"
              value={formatDeltaCalories(planDelta)}
              accent={Math.abs(planDelta) <= 10 ? "#34d399" : "#fb7185"}
            />
            <MiniValue label="Proteína" value={formatGrams(planTotals.protein)} accent="#34d399" />
            <MiniValue label="Carbo" value={formatGrams(planTotals.carbs)} accent="#22d3ee" />
            <MiniValue label="Gordura" value={formatGrams(planTotals.fat)} accent="#fb7185" />
          </div>

          <div className={`grid gap-3 ${isMobileLayout ? "max-h-none overflow-y-visible pr-0" : "max-h-[min(46vh,420px)] overflow-y-auto pr-1"}`}>
            {displayedMealPlan.meals.map((meal, index) => (
              <MealPlanEditorDisclosure
                key={`${meal.mealType}-${meal.name}`}
                meal={meal}
                mealIndex={index}
                defaultOpen={index === 0}
                onChangeQuantity={onChangeQuantity}
                onRejectItem={onRejectItem}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Nenhum cardápio gerado"
            text="Defina as calorias desejadas e gere um cardápio para editar ou exportar depois."
            compact
          />
        </div>
      )}
    </CollapsibleSection>
  );
}
