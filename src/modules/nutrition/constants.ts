import { MealType, NutritionObjective } from "./domain/types";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  snack: "Lanche",
  dinner: "Jantar",
};

export const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  lose: "Emagrecimento",
  maintain: "Manutencao",
  gain: "Ganho de peso",
};

export const MACRO_LABELS = {
  protein: "Proteina",
  carbs: "Carboidratos",
  fat: "Gorduras",
};

export const PLANNING_TABS = [
  { key: "goal" as const, label: "Metas" },
  { key: "plan" as const, label: "Plano alimentar" },
] as const;

export type PlanningTabKey = typeof PLANNING_TABS[number]["key"];
