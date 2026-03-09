/**
 * @file MealPlanPanel.tsx
 * @description Painel do Cardápio Diário — geração, edição e exportação.
 *
 * Responsabilidades:
 * - Campo de entrada para definir as calorias do cardápio
 * - Botões de ação: gerar, usar meta, exportar PDF e descartar
 * - Lista de rejeições de alimentos ativas
 * - Sumário de macros do cardápio gerado (MiniValue)
 * - Lista de refeições expansíveis (MealPlanEditorDisclosure)
 *
 * O sub-componente `MealPlanEditorDisclosure` foi extraído do NutritionScreen
 * e colocado neste arquivo por ser exclusivamente usado aqui.
 */

import type { MealPlan, MealPlanItem, NutritionTotals } from "@/modules/nutrition/domain/types";
import {
  formatCalories,
  formatDeltaCalories,
  formatGrams,
} from "@/modules/nutrition/ui-helpers";
import { EmptyState, Field, MiniValue } from "@/components/nutrition/CommonUI";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface MealPlanPanelProps {
  /** Cardápio exibido atualmente (rascunho ou o salvo no servidor) */
  displayedMealPlan: MealPlan | null;
  /** Totais nutricionais somados de todo o cardápio */
  planTotals: Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat"> | null;
  /** Valor do input de calorias alvo para o cardápio (string para suportar edição) */
  planCalories: string;
  /** Calorias alvo interpretadas como número (fallback para meta do usuário) */
  requestedPlanCalories: number;
  /** Diferença entre o total planejado e as calorias solicitadas */
  planDelta: number;
  /** Lista de nomes de alimentos rejeitados pelo usuário */
  planRejectedFoods: string[];
  /** Indica se a geração de cardápio está em andamento */
  isGeneratingPlan: boolean;
  /** Indica se o PDF está sendo exportado */
  isExportingPdf: boolean;
  /** Indica se o layout está em modo mobile */
  isMobileLayout: boolean;
  /** Callback chamado ao alterar o input de calorias */
  onPlanCaloriesChange: (value: string) => void;
  /** Callback para gerar um novo cardápio pelo modelo de IA */
  onGenerateMealPlan: () => void;
  /** Callback para usar as calorias da meta do usuário no campo do cardápio */
  onUseGoalCalories: () => void;
  /** Callback para exportar o cardápio em PDF */
  onExportPdf: () => void;
  /** Callback para descartar o rascunho do cardápio */
  onDiscardMealPlan: () => void;
  /** Callback para limpar todas as rejeições ativas */
  onClearRejections: () => void;
  /** Callback chamado ao alterar a quantidade de um item do cardápio */
  onChangeQuantity: (mealIndex: number, itemIndex: number, quantity: number) => void;
  /** Callback chamado ao rejeitar um item do cardápio */
  onRejectItem: (mealIndex: number, itemIndex: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: MealPlanEditorDisclosure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MealPlanEditorDisclosure — refeição expansível do cardápio.
 *
 * Exibe um `<details>` com o nome da refeição, total de calorias e,
 * ao expandir, a lista de itens com controle de quantidade e rejeição.
 */
function MealPlanEditorDisclosure({
  meal,
  mealIndex,
  defaultOpen = false,
  onChangeQuantity,
  onRejectItem,
}: {
  /** Dados da refeição (nome, itens, calorias, etc.) */
  meal: MealPlan["meals"][number];
  /** Índice da refeição no array de refeições do cardápio */
  mealIndex: number;
  /** Se verdadeiro, o disclosure inicia aberto */
  defaultOpen?: boolean;
  /** Callback de alteração de quantidade */
  onChangeQuantity: (mealIndex: number, itemIndex: number, quantity: number) => void;
  /** Callback de rejeição de item */
  onRejectItem: (mealIndex: number, itemIndex: number) => void;
}) {
  return (
    <details
      open={defaultOpen}
      className="glass-panel static-panel p-3.5 px-4 bg-[#020b1c]/70"
    >
      {/* Cabeçalho da refeição (sempre visível) */}
      <summary className="cursor-pointer list-none">
        <div className="flex justify-between gap-3 items-center flex-wrap">
          <div>
            <strong className="block">{meal.name}</strong>
            <span className="text-[var(--text-secondary)] text-[0.84rem]">
              {meal.items.length} itens · alvo {formatCalories(meal.targetCalories)}
            </span>
          </div>
          <span className="badge badge-success">{formatCalories(meal.totalCalories)}</span>
        </div>
      </summary>

      {/* Lista de itens ao expandir */}
      <div className="grid gap-2.5 mt-3.5">
        {meal.items.length ? (
          meal.items.map((item: MealPlanItem, itemIndex: number) => (
            <div
              key={`${meal.mealType}-${item.foodId}-${itemIndex}`}
              className="glass-panel static-panel p-3 px-3.5 bg-[#051227]/70"
            >
              {/* Nome e macros do item */}
              <div className="flex justify-between gap-3 flex-wrap items-center">
                <div className="min-w-0">
                  <strong className="block mb-0.5">
                    {item.name}
                  </strong>
                  <span className="text-[var(--text-secondary)] text-[0.84rem]">
                    {formatGrams(item.protein)} prot · {formatGrams(item.carbs)} carb ·{" "}
                    {formatGrams(item.fat)} gord
                  </span>
                </div>
                <span className="badge badge-success">{formatCalories(item.calories)}</span>
              </div>

              {/* Controles de quantidade e rejeição */}
              <div className="grid gap-2.5 grid-cols-[minmax(0,120px)_minmax(0,1fr)] mt-3 items-end">
                <Field label={`Quantidade (${item.unit})`}>
                  <input
                    className="input-field"
                    type="number"
                    min={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"}
                    step={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"}
                    value={item.quantity}
                    onChange={(e) =>
                      onChangeQuantity(mealIndex, itemIndex, Number(e.target.value))
                    }
                  />
                </Field>
                <button
                  onClick={() => onRejectItem(mealIndex, itemIndex)}
                  className="btn-outline w-full min-h-[3rem]"
                >
                  Rejeitar item
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Sem itens restantes"
            text="Gere novamente para buscar outra composição para essa refeição."
            compact
          />
        )}
      </div>
    </details>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MealPlanPanel — painel de cardápio diário.
 *
 * Permite gerar, editar e exportar um cardápio nutricional com
 * controle de calorias, rejeição de itens e exportação em PDF.
 */
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
    <div className="glass-panel static-panel p-4 bg-[#06162d]/64">
      {/* ── Cabeçalho ── */}
      <div className="flex justify-between gap-4 flex-wrap mb-4">
        <div>
          <strong className="block">Cardápio Diário</strong>
          <span className="text-[var(--text-secondary)] text-[0.88rem]">
            Monte refeições estratégicas em uma ficha de planejamento rápida de editar.
          </span>
        </div>
        {/* Badge com contagem de refeições do cardápio */}
        {displayedMealPlan ? (
          <span className="badge badge-success">
            {displayedMealPlan.meals.length} refeições
          </span>
        ) : null}
      </div>

      {/* ── Controles de geração ── */}
      <div className={`grid gap-3 ${isMobileLayout ? "grid-cols-1" : "grid-cols-[minmax(0,170px)_minmax(0,1fr)]"}`}>
        {/* Input de calorias alvo */}
        <Field label="Calorias do cardápio">
          <input
            className="input-field"
            type="number"
            value={planCalories}
            onChange={(e) => onPlanCaloriesChange(e.target.value)}
          />
        </Field>

        {/* Botões de ação em grid 2×2 */}
        <div className="grid gap-2.5 grid-cols-2 items-stretch">
          <button
            onClick={onGenerateMealPlan}
            className="btn-primary w-full min-h-[3rem]"
            disabled={isGeneratingPlan}
          >
            {isGeneratingPlan ? "Gerando..." : "Gerar cardápio"}
          </button>

          <button
            onClick={onUseGoalCalories}
            className="btn-outline w-full min-h-[3rem]"
          >
            Usar meta
          </button>

          <button
            onClick={onExportPdf}
            className="btn-outline w-full min-h-[3rem]"
            disabled={!displayedMealPlan || isExportingPdf}
          >
            {isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}
          </button>

          <button
            onClick={onDiscardMealPlan}
            className="btn-outline w-full min-h-[3rem]"
            disabled={!displayedMealPlan}
          >
            Descartar
          </button>
        </div>
      </div>

      {/* ── Rejeições ativas ── */}
      {planRejectedFoods.length > 0 ? (
        <div className="flex justify-between gap-3 flex-wrap mt-3 mb-1">
          <span className="text-[var(--text-secondary)] text-[0.88rem]">
            Rejeições ativas: {planRejectedFoods.join(", ")}
          </span>
          <button
            onClick={onClearRejections}
            className="btn-outline min-w-auto px-3 py-1.5"
          >
            Limpar rejeições
          </button>
        </div>
      ) : null}

      {/* ── Conteúdo do cardápio ── */}
      {displayedMealPlan && planTotals ? (
        <div className="grid gap-3 mt-4">
          {/* Sumário de macros */}
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
            <MiniValue
              label="Alvo"
              value={formatCalories(requestedPlanCalories)}
              accent="var(--accent-secondary)"
            />
            <MiniValue
              label="Planejado"
              value={formatCalories(displayedMealPlan.totalCalories)}
              accent="var(--accent-primary)"
            />
            <MiniValue
              label="Delta"
              value={formatDeltaCalories(planDelta)}
              accent={Math.abs(planDelta) <= 10 ? "#34d399" : "#fb7185"}
            />
            <MiniValue label="Proteína" value={formatGrams(planTotals.protein)} accent="#34d399" />
            <MiniValue label="Carbo" value={formatGrams(planTotals.carbs)} accent="#22d3ee" />
            <MiniValue label="Gordura" value={formatGrams(planTotals.fat)} accent="#fb7185" />
          </div>

          {/* Lista de refeições expansíveis */}
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
            text="Digite as calorias desejadas e gere um cardápio para editar ou exportar depois."
            compact
          />
        </div>
      )}
    </div>
  );
}
