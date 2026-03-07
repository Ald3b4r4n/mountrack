import type { NutritionTotals } from "@/modules/nutrition/domain/types";
import type { FoodItem, NutritionUnit } from "@/modules/nutrition/domain/types";

export interface NutritionCalculationInput {
  food: FoodItem;
  quantity: number;
  unit: NutritionUnit;
}

function resolveBaseQuantity(food: FoodItem, quantity: number, unit: NutritionUnit): number {
  if (unit === "g" || unit === "ml") {
    return quantity;
  }

  if (unit === "serving") {
    return quantity * (food.servingGrams ?? 100);
  }

  return quantity * (food.unitGrams ?? food.servingGrams ?? 100);
}

export function roundNutrients(value: number): number {
  return Number(value.toFixed(2));
}

function scaled(value: number | undefined, factor: number): number {
  return roundNutrients((value ?? 0) * factor);
}

export function calculateNutritionForQuantity({
  food,
  quantity,
  unit,
}: NutritionCalculationInput): NutritionTotals {
  const baseQuantity = resolveBaseQuantity(food, quantity, unit);
  const factor = baseQuantity / 100;

  return {
    calories: scaled(food.caloriesPer100, factor),
    protein: scaled(food.proteinPer100, factor),
    carbs: scaled(food.carbsPer100, factor),
    fat: scaled(food.fatPer100, factor),
    fiber: scaled(food.fiberPer100, factor),
    sodium: scaled(food.sodiumPer100, factor),
  };
}

