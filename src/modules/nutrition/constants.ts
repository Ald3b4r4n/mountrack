import type { DefaultMealType, MealDefinition, NutritionObjective } from "./domain/types";

export const MEAL_ORDER: DefaultMealType[] = ["breakfast", "lunch", "snack", "dinner"];

export const MEAL_LABELS: Record<DefaultMealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
};

export const DEFAULT_MEAL_DEFINITIONS: MealDefinition[] = MEAL_ORDER.map((mealKey) => ({
  key: mealKey,
  label: MEAL_LABELS[mealKey],
  isDefault: true,
}));

export const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  lose: "Emagrecimento",
  maintain: "Manutenção",
  gain: "Ganho de peso",
};

export const MACRO_LABELS = {
  protein: "Proteína",
  carbs: "Carboidratos",
  fat: "Gorduras",
};

export const PLANNING_TABS = [
  { key: "goal" as const, label: "Metas" },
  { key: "plan" as const, label: "Plano alimentar" },
] as const;

export type PlanningTabKey = typeof PLANNING_TABS[number]["key"];
