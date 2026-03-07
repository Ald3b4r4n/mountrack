import type { FoodItem } from "@/modules/nutrition/domain/types";

interface SearchFoodsOptions {
  internalFoods: FoodItem[];
  externalResults?: FoodItem[];
  limit?: number;
}

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\w\s]/g, " ")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getNormalizedTags(food: FoodItem): string[] {
  return (food.tags ?? []).map(normalizeTerm).filter(Boolean);
}

function computeFoodScore(food: FoodItem, rawQuery: string): number {
  const query = normalizeTerm(rawQuery);
  const normalizedName = normalizeTerm(food.displayName ?? food.name);
  const normalizedBrand = normalizeTerm(food.brand ?? "");
  const normalizedTags = getNormalizedTags(food);

  if (food.barcode && rawQuery.trim() === food.barcode) {
    return 1200 + food.confidenceScore * 100;
  }

  let score = food.confidenceScore * 100;

  if (normalizedName === query) score += 260;
  if (normalizedName.startsWith(query)) score += 190;
  if (normalizedName.includes(query)) score += 150;
  if (normalizedBrand === query) score += 125;
  if (normalizedBrand.includes(query)) score += 40;
  if (normalizedTags.includes(query)) score += 95;
  if (normalizedTags.some((tag) => tag.includes(query))) score += 65;
  if (food.locale?.startsWith("pt")) score += 55;
  if (food.countryCode === "BR") score += 45;
  if (food.source === "openfoodfacts") score += 24;
  if (food.source === "internal") score -= 35;
  if (food.source === "usda") score -= 12;
  score += (food.completenessScore ?? 0) * 30;

  return score;
}

function dedupeFoods(foods: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const key = `${food.barcode ?? ""}:${normalizeTerm(food.displayName ?? food.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchFoodsByQuery(
  query: string,
  { internalFoods, externalResults = [], limit = 8 }: SearchFoodsOptions,
): Promise<FoodItem[]> {
  const normalizedQuery = normalizeTerm(query);
  const combinedFoods = dedupeFoods([...internalFoods, ...externalResults]);

  const filteredFoods = combinedFoods.filter((food) => {
    if (!normalizedQuery) return true;
    const normalizedName = normalizeTerm(food.displayName ?? food.name);
    const normalizedBrand = normalizeTerm(food.brand ?? "");
    const normalizedTags = getNormalizedTags(food);
    return (
      food.barcode === query.trim() ||
      normalizedName.includes(normalizedQuery) ||
      normalizedBrand.includes(normalizedQuery) ||
      normalizedTags.some((tag) => tag.includes(normalizedQuery))
    );
  });

  return filteredFoods
    .map((food) => ({ food, score: computeFoodScore(food, query) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ food }) => food);
}
