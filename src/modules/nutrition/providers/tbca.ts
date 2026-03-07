import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import type { FoodItem } from "@/modules/nutrition/domain/types";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function searchTbcaFoods(query: string): Promise<FoodItem[]> {
  const normalizedQuery = normalize(query);
  return INTERNAL_FOODS.filter((food) => normalize(food.name).includes(normalizedQuery)).slice(0, 6);
}

