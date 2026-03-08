import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  findSupplementBrandProfile,
  matchesSupplementBrandText,
} from "@/modules/nutrition/data/supplement-brands";

interface SearchFoodsOptions {
  internalFoods: FoodItem[];
  externalResults?: FoodItem[];
  limit?: number;
}

const STOP_WORDS = new Set(["a", "as", "de", "da", "das", "do", "dos", "e", "em", "para", "por"]);

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

function buildSearchableFoodText(food: FoodItem, normalizedTags: string[] = getNormalizedTags(food)): string {
  return [food.displayName ?? food.name, food.brand ?? "", ...normalizedTags].join(" ");
}

function getQueryTokens(rawQuery: string): string[] {
  return normalizeTerm(rawQuery)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function getTokenStem(token: string): string {
  return token.length >= 5 ? token.slice(0, 5) : token;
}

function hasTextTokenMatch(haystack: string, tokens: string[]): boolean {
  return tokens.some((token) => haystack.includes(token) || haystack.includes(getTokenStem(token)));
}

function computeFoodScore(food: FoodItem, rawQuery: string): number {
  const query = normalizeTerm(rawQuery);
  const queryTokens = getQueryTokens(rawQuery);
  const normalizedName = normalizeTerm(food.displayName ?? food.name);
  const normalizedBrand = normalizeTerm(food.brand ?? "");
  const normalizedTags = getNormalizedTags(food);
  const brandProfile = findSupplementBrandProfile(rawQuery);
  const matchesRequestedBrand = brandProfile
    ? matchesSupplementBrandText(buildSearchableFoodText(food, normalizedTags), brandProfile)
    : false;

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
  if (hasTextTokenMatch(normalizedName, queryTokens)) score += 80;
  if (hasTextTokenMatch(normalizedBrand, queryTokens)) score += 45;
  if (normalizedTags.some((tag) => hasTextTokenMatch(tag, queryTokens))) score += 55;
  if (query.includes("prote") && food.category === "protein") score += 70;
  if (query.includes("barra") && /(barra|bar)/.test(normalizedName)) score += 70;
  if (food.locale?.startsWith("pt")) score += 55;
  if (food.countryCode === "BR") score += 45;
  if (food.source === "openfoodfacts") score += 24;
  if (food.source === "internal") score -= brandProfile && matchesRequestedBrand ? 0 : 35;
  if (food.source === "usda") score -= 12;
  if (brandProfile) {
    if (matchesRequestedBrand) {
      score += food.source === "internal" ? 420 : 220;
      if (normalizedBrand === normalizeTerm(brandProfile.brand)) {
        score += 120;
      }
    } else {
      score -= 260;
    }
  }
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
  const queryTokens = getQueryTokens(query);
  const combinedFoods = dedupeFoods([...internalFoods, ...externalResults]);
  const brandProfile = findSupplementBrandProfile(query);

  const filteredFoods = combinedFoods.filter((food) => {
    if (!normalizedQuery) return true;
    const normalizedName = normalizeTerm(food.displayName ?? food.name);
    const normalizedBrand = normalizeTerm(food.brand ?? "");
    const normalizedTags = getNormalizedTags(food);
    const searchableText = buildSearchableFoodText(food, normalizedTags);

    const hasTokenMatch =
      hasTextTokenMatch(normalizedName, queryTokens) ||
      hasTextTokenMatch(normalizedBrand, queryTokens) ||
      normalizedTags.some((tag) => hasTextTokenMatch(tag, queryTokens));

    const matchesProteinIntent =
      normalizedQuery.includes("prote") &&
      food.category === "protein" &&
      (/(barra|bar|protein|prote)/.test(normalizedName) || normalizedTags.some((tag) => /(protein|prote)/.test(tag)));

    const matchesRequestedBrand = brandProfile ? matchesSupplementBrandText(searchableText, brandProfile) : false;

    if (brandProfile && !matchesRequestedBrand) {
      return food.barcode === query.trim();
    }

    return (
      food.barcode === query.trim() ||
      normalizedName.includes(normalizedQuery) ||
      normalizedBrand.includes(normalizedQuery) ||
      normalizedTags.some((tag) => tag.includes(normalizedQuery)) ||
      hasTokenMatch ||
      matchesProteinIntent
    );
  });

  const rankedFoods = filteredFoods
    .map((food) => ({ food, score: computeFoodScore(food, query) }))
    .sort((left, right) => right.score - left.score)
    .map(({ food }) => food);

  if (!brandProfile) {
    return rankedFoods.slice(0, limit);
  }

  const curatedBrandMatches = rankedFoods.filter(
    (food) => food.source === "internal" && matchesSupplementBrandText(buildSearchableFoodText(food), brandProfile),
  );
  const remainingFoods = rankedFoods.filter(
    (food) => !curatedBrandMatches.some((candidate) => candidate.id === food.id),
  );

  return [...curatedBrandMatches, ...remainingFoods].slice(0, limit);
}
