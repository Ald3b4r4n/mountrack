import { FoodItem, FoodSource, NutritionUnit } from "@/modules/nutrition/domain/types";

const DECIMAL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDecimal(value: number): string {
  return DECIMAL_FORMATTER.format(Number(value.toFixed(2)));
}

export function getFoodLabel(food: FoodItem): string {
  return food.displayName ?? food.name;
}

export function getFoodDefaultUnit(food: FoodItem): NutritionUnit {
  if (food.servingGrams) return "serving";
  if (food.baseUnit === "unit") return "unit";
  return food.baseUnit === "ml" ? "ml" : "g";
}

export function getFoodDefaultQuantity(food: FoodItem): string {
  if (food.baseUnit === "unit") return "1";
  return food.servingGrams ? "1" : "100";
}

export function formatFoodSourceLabel(source: FoodSource, options?: { compact?: boolean }): string {
  const compact = options?.compact ?? false;

  switch (source) {
    case "internal":
      return compact ? "App" : "Catálogo do app";
    case "tbca":
      return compact ? "Brasil" : "Tabela brasileira";
    case "custom":
      return compact ? "Meu" : "Meu alimento";
    case "openfoodfacts":
      return compact ? "Aberto" : "Catálogo aberto";
    case "usda":
      return compact ? "USDA" : "Base USDA";
    default:
      return compact ? "Catálogo" : "Catálogo";
  }
}

export function formatCalories(value: number): string {
  return `${value.toFixed(0)} kcal`;
}

export function formatGrams(value: number): string {
  return `${formatDecimal(value)} g`;
}

export function formatMilliliters(value: number): string {
  return `${value.toFixed(0)} ml`;
}

export function formatDeltaCalories(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(0)} kcal`;
}

function parseHistoryDate(dateString: string): Date {
  const localCalendarMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!localCalendarMatch) return new Date(dateString);

  const year = Number(localCalendarMatch[1]);
  const monthIndex = Number(localCalendarMatch[2]) - 1;
  const day = Number(localCalendarMatch[3]);
  const parsedDate = new Date(year, monthIndex, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== monthIndex ||
    parsedDate.getDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return parsedDate;
}

export function formatHistoryDate(dateString: string): string {
  try {
    const d = parseHistoryDate(dateString);
    if (!Number.isFinite(d.getTime())) return dateString;
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }).replace(".", ""); // Ex: "seg, 01 de mar"
  } catch {
    return dateString;
  }
}
