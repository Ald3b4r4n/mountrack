import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  buildSupplementBrandSearchTerms,
  findSupplementBrandProfile,
  matchesSupplementBrandText,
} from "@/modules/nutrition/data/supplement-brands";

const STOP_WORDS = new Set(["a", "as", "de", "da", "das", "do", "dos", "e", "em", "para", "por"]);

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function buildAliasSearchTerms(normalizedQuery: string): string[] {
  const aliases: string[] = [];

  if (
    normalizedQuery.includes("barra de proteina") ||
    normalizedQuery.includes("barra proteica") ||
    normalizedQuery.includes("barra protein")
  ) {
    aliases.push("barra proteica", "protein bar", "barra protein");
  }

  if (normalizedQuery.includes("proteina de ervilha")) {
    aliases.push("pea protein");
  }

  if (normalizedQuery.includes("proteina de arroz")) {
    aliases.push("rice protein");
  }

  if (normalizedQuery.includes("proteina de soja")) {
    aliases.push("soy protein");
  }

  if (normalizedQuery.includes("pasta de amendoim")) {
    aliases.push("peanut butter");
  }

  if (normalizedQuery.includes("whey")) {
    aliases.push("whey protein");
  }

  if (normalizedQuery.includes("iogurte proteico")) {
    aliases.push("high protein yogurt");
  }

  return aliases;
}

export function buildOpenFoodFactsSearchTerms(query: string): string[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const variants = new Set<string>([trimmedQuery]);
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const supplementBrandTerms = buildSupplementBrandSearchTerms(trimmedQuery);

  for (const brandTerm of supplementBrandTerms) {
    variants.add(brandTerm);
  }

  for (const alias of buildAliasSearchTerms(normalizedQuery)) {
    variants.add(alias);
  }

  return Array.from(variants).slice(0, supplementBrandTerms.length ? 5 : 4);
}

function dedupeFoods(foods: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();

  return foods.filter((food) => {
    const key = `${food.barcode ?? ""}:${normalizeSearchText(food.displayName ?? food.name)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function computeExternalSearchScore(food: FoodItem, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeSearchText(query);
  const haystack = normalizeSearchText(
    [food.displayName ?? food.name, food.brand ?? "", ...(food.tags ?? [])].join(" "),
  );
  const brandProfile = findSupplementBrandProfile(query);

  let score = (food.confidenceScore ?? 0) * 100;
  let tokenHits = 0;

  if (haystack.includes(normalizedQuery)) {
    score += 120;
  }

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      tokenHits += 1;
      score += token.length >= 5 ? 40 : 22;
    }
  }

  if (queryTokens.length > 0 && tokenHits === 0) {
    score -= 180;
  }

  if (normalizedQuery.includes("barra") && /barra|bar/.test(haystack)) {
    score += 120;
  }

  if (normalizedQuery.includes("prote")) {
    if (food.category === "protein") {
      score += 90;
    }
    if (/(protein|proteina|whey|albumina)/.test(haystack)) {
      score += 95;
    }
  }

  if (normalizedQuery.includes("whey") && /whey/.test(haystack)) {
    score += 140;
  }

  if (brandProfile) {
    if (matchesSupplementBrandText([food.brand ?? "", food.displayName ?? food.name, ...(food.tags ?? [])].join(" "), brandProfile)) {
      score += 260;
    } else {
      score -= 240;
    }
  }

  if (food.countryCode === "BR") {
    score += 40;
  }

  if (food.locale?.startsWith("pt")) {
    score += 35;
  }

  if (food.isBranded) {
    score += 20;
  }

  score += (food.completenessScore ?? 0) * 25;
  return score;
}

export function rankOpenFoodFactsResults(query: string, foods: FoodItem[]): FoodItem[] {
  return dedupeFoods(foods)
    .map((food) => ({ food, score: computeExternalSearchScore(food, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ food }) => food);
}
