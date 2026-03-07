export type ExpenseType = "ampoule" | "consultation" | "supplement" | "other";

const EXPENSE_LABELS: Record<ExpenseType, string> = {
  ampoule: "Ampola/Medicação",
  consultation: "Consulta Médica",
  supplement: "Suplementação",
  other: "Outros Gastos",
};

export function getTodayLocalDate(now: Date = new Date()): string {
  const localDate = new Date(now);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

export function getExpenseLabel(expenseType: ExpenseType): string {
  return EXPENSE_LABELS[expenseType] ?? "Desconhecido";
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

