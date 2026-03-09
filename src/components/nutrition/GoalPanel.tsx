import type { DailySummary, NutritionGoal, NutritionObjective } from "@/modules/nutrition/domain/types";
import { OBJECTIVE_LABELS } from "@/modules/nutrition/constants";
import { formatCalories, formatGrams, formatMilliliters } from "@/modules/nutrition/ui-helpers";
import { CollapsibleSection, Field, MiniValue } from "@/components/nutrition/CommonUI";

export type GoalInputState = {
  targetCalories: string;
  targetWaterMl: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

export interface GoalPanelProps {
  goal: NutritionGoal;
  summary: DailySummary;
  goalInputs: GoalInputState;
  goalObjectiveDraft: NutritionObjective;
  isSavingGoal: boolean;
  defaultWaterTarget: number;
  onUpdateGoalInput: (key: keyof GoalInputState, value: string) => void;
  onChangeObjective: (objective: NutritionObjective) => void;
  onSaveGoal: () => void;
}

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
    <CollapsibleSection
      title="Meta nutricional"
      subtitle="Defina calorias, agua e macros para orientar seu dia e o cardapio."
      badge={<span className="badge badge-success">{OBJECTIVE_LABELS[goalObjectiveDraft]}</span>}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
        <Field label="Calorias">
          <input
            className="input-field"
            inputMode="numeric"
            value={goalInputs.targetCalories}
            onChange={(e) => onUpdateGoalInput("targetCalories", e.target.value)}
          />
        </Field>

        <Field label="Agua (ml)">
          <input
            className="input-field"
            inputMode="numeric"
            value={goalInputs.targetWaterMl}
            onChange={(e) => onUpdateGoalInput("targetWaterMl", e.target.value)}
          />
        </Field>

        <Field label="Proteina">
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

        <Field label="Objetivo">
          <select
            className="input-field"
            value={goalObjectiveDraft}
            onChange={(e) => onChangeObjective(e.target.value as NutritionObjective)}
          >
            <option value="lose">Emagrecimento</option>
            <option value="maintain">Manutencao</option>
            <option value="gain">Ganho de peso</option>
          </select>
        </Field>
      </div>

      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
        <MiniValue label="Meta" value={formatCalories(goal.targetCalories)} accent="var(--accent-secondary)" />
        <MiniValue
          label="Agua"
          value={formatMilliliters(goal.targetWaterMl ?? defaultWaterTarget)}
          accent="#38bdf8"
        />
        <MiniValue label="Hoje" value={formatCalories(summary.consumedCalories)} accent="var(--accent-primary)" />
        <MiniValue label="Proteina" value={formatGrams(summary.protein)} accent="#34d399" />
        <MiniValue label="Carbo" value={formatGrams(summary.carbs)} accent="#22d3ee" />
        <MiniValue label="Gordura" value={formatGrams(summary.fat)} accent="#fb7185" />
      </div>

      <button onClick={onSaveGoal} className="btn-primary w-full" disabled={isSavingGoal}>
        {isSavingGoal ? "Salvando..." : "Salvar meta"}
      </button>
    </CollapsibleSection>
  );
}
