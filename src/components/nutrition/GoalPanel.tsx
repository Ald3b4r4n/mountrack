/**
 * @file GoalPanel.tsx
 * @description Painel de configuração da meta nutricional do usuário.
 *
 * Exibe um formulário para o usuário definir:
 * - Calorias diárias alvo
 * - Ingestão de água (ml)
 * - Macronutrientes (proteínas, carboidratos, gorduras)
 * - Objetivo nutricional (emagrecimento, manutenção, ganho de peso)
 *
 * Também exibe um resumo comparando os valores da meta com o consumo atual do dia.
 */

import type { DailySummary, NutritionGoal, NutritionObjective } from "@/modules/nutrition/domain/types";
import { OBJECTIVE_LABELS } from "@/modules/nutrition/constants";
import {
  formatCalories,
  formatGrams,
  formatMilliliters,
} from "@/modules/nutrition/ui-helpers";
import { Field, MiniValue } from "@/components/nutrition/CommonUI";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE PROPS
// ─────────────────────────────────────────────────────────────────────────────

/** Estado temporário dos campos de input da meta (armazenados como strings para suportar edição parcial) */
export type GoalInputState = {
  targetCalories: string;
  targetWaterMl: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

export interface GoalPanelProps {
  /** Meta salva atualmente no servidor/buffer */
  goal: NutritionGoal;
  /** Resumo dos dados de consumo do dia corrente */
  summary: DailySummary;
  /** Valores temporários dos campos de input enquanto o usuário edita */
  goalInputs: GoalInputState;
  /** Objetivo nutricional selecionado no rascunho (antes de salvar) */
  goalObjectiveDraft: NutritionObjective;
  /** Indica se o formulário está sendo salvo */
  isSavingGoal: boolean;
  /** Valor padrão para a meta de água (usado quando goal.targetWaterMl é nulo) */
  defaultWaterTarget: number;
  /** Callback para atualizar um campo específico da meta */
  onUpdateGoalInput: (key: keyof GoalInputState, value: string) => void;
  /** Callback para alterar o objetivo nutricional no rascunho */
  onChangeObjective: (objective: NutritionObjective) => void;
  /** Callback para disparar o salvamento da meta */
  onSaveGoal: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GoalPanel — formulário de configuração de meta nutricional.
 *
 * Renderiza inputs para todos os campos da meta, um seletor de objetivo
 * e um bloco de resumo comparando meta salva vs. consumo atual.
 */
export function GoalPanel({
  goal,
  summary,
  goalInputs,
  goalObjectiveDraft,
  isSavingGoal,
  defaultWaterTarget,
  onUpdateGoalInput,
  onChangeObjective,
  onSaveGoal,
}: GoalPanelProps) {
  return (
    <div className="glass-panel static-panel p-4 bg-[#06162d]/60">
      {/* ── Cabeçalho ── */}
      <div className="flex justify-between gap-4 flex-wrap mb-4">
        <div>
          <strong className="block">Meta nutricional</strong>
          <span className="text-[var(--text-secondary)] text-[0.88rem]">
            Configure sua rotina para que possamos traçar os melhores caminhos e sugestões.
          </span>
        </div>
        {/* Badge mostra o objetivo atual do rascunho */}
        <span className="badge badge-success">
          {OBJECTIVE_LABELS[goalObjectiveDraft]}
        </span>
      </div>

      {/* ── Campos de edição da meta ── */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        <Field label="Calorias">
          <input
            className="input-field"
            inputMode="numeric"
            value={goalInputs.targetCalories}
            onChange={(e) => onUpdateGoalInput("targetCalories", e.target.value)}
          />
        </Field>

        <Field label="Água (ml)">
          <input
            className="input-field"
            inputMode="numeric"
            value={goalInputs.targetWaterMl}
            onChange={(e) => onUpdateGoalInput("targetWaterMl", e.target.value)}
          />
        </Field>

        <Field label="Proteína">
          <input
            className="input-field"
            inputMode="decimal"
            value={goalInputs.targetProtein}
            onChange={(e) => onUpdateGoalInput("targetProtein", e.target.value)}
          />
        </Field>

        <Field label="Carbo">
          <input
            className="input-field"
            inputMode="decimal"
            value={goalInputs.targetCarbs}
            onChange={(e) => onUpdateGoalInput("targetCarbs", e.target.value)}
          />
        </Field>

        <Field label="Gordura">
          <input
            className="input-field"
            inputMode="decimal"
            value={goalInputs.targetFat}
            onChange={(e) => onUpdateGoalInput("targetFat", e.target.value)}
          />
        </Field>

        {/* Seletor de objetivo nutricional */}
        <Field label="Objetivo">
          <select
            className="input-field"
            value={goalObjectiveDraft}
            onChange={(e) => onChangeObjective(e.target.value as NutritionObjective)}
          >
            <option value="lose">Emagrecimento</option>
            <option value="maintain">Manutenção</option>
            <option value="gain">Ganho de peso</option>
          </select>
        </Field>
      </div>

      {/* ── Resumo comparativo: meta salva vs. consumo do dia ── */}
      <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(110px,1fr))] my-4">
        <MiniValue
          label="Meta"
          value={formatCalories(goal.targetCalories)}
          accent="var(--accent-secondary)"
        />
        <MiniValue
          label="Água"
          value={formatMilliliters(goal.targetWaterMl ?? defaultWaterTarget)}
          accent="#38bdf8"
        />
        <MiniValue
          label="Hoje"
          value={formatCalories(summary.consumedCalories)}
          accent="var(--accent-primary)"
        />
        <MiniValue
          label="Proteína"
          value={formatGrams(summary.protein)}
          accent="#34d399"
        />
        <MiniValue
          label="Carbo"
          value={formatGrams(summary.carbs)}
          accent="#22d3ee"
        />
        <MiniValue
          label="Gordura"
          value={formatGrams(summary.fat)}
          accent="#fb7185"
        />
      </div>

      {/* ── Botão de salvar ── */}
      <button
        onClick={onSaveGoal}
        className="btn-primary w-full"
        disabled={isSavingGoal}
      >
        {isSavingGoal ? "Salvando..." : "Salvar meta"}
      </button>
    </div>
  );
}
