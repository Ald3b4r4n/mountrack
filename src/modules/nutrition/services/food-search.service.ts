import type {
  FoodItem,
  FoodSource,
  MealType,
} from "@/modules/nutrition/domain/types";
import {
  findSupplementBrandProfile,
  matchesSupplementBrandText,
} from "@/modules/nutrition/data/supplement-brands";

export type FoodSourceFilter = FoodSource | "all";

interface SearchFoodsOptions {
  internalFoods: FoodItem[];
  externalResults?: FoodItem[];
  limit?: number;
  source?: FoodSourceFilter;
  mealType?: MealType | null;
}

const STOP_WORDS = new Set([
  "a",
  "as",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "para",
  "por",
]);

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getNormalizedTags(food: FoodItem): string[] {
  return (food.tags ?? []).map(normalizeTerm).filter(Boolean);
}

function buildSearchableFoodText(
  food: FoodItem,
  normalizedTags: string[] = getNormalizedTags(food),
): string {
  return [
    food.displayName ?? food.name,
    food.brand ?? "",
    ...normalizedTags,
  ].join(" ");
}

function getQueryTokens(rawQuery: string): string[] {
  return normalizeTerm(rawQuery)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token))
    .filter((token) => token.length >= 3 || /^\d{4,}$/.test(token));
}

function getTokenStem(token: string): string {
  return token.length >= 5 ? token.slice(0, 5) : token;
}

function tokenizeSearchText(value: string): string[] {
  return normalizeTerm(value).split(/\s+/).filter(Boolean);
}

function startsWithQueryToken(name: string, queryToken: string): boolean {
  const [firstWord] = tokenizeSearchText(name);
  if (!firstWord || !queryToken) {
    return false;
  }

  return tokenMatchesWords([firstWord], queryToken);
}

function isBrandOnlyPlaceholder(food: FoodItem): boolean {
  const candidateName = food.name || food.displayName || "";
  const normalizedName = normalizeTerm(candidateName);
  if (!normalizedName) {
    return true;
  }

  const normalizedBrand = normalizeTerm(food.brand ?? "");
  if (!normalizedBrand) {
    return false;
  }

  if (normalizedBrand && normalizedName === normalizedBrand) {
    return true;
  }

  const nameTokens = tokenizeSearchText(candidateName);
  const brandTokens = tokenizeSearchText(food.brand ?? "");

  return (
    nameTokens.length <= 2 &&
    nameTokens.every((token) => tokenMatchesWords(brandTokens, token))
  );
}

function tokenMatchesWords(words: string[], token: string): boolean {
  const tokenStem = getTokenStem(token);
  return words.some(
    (word) =>
      word === token || word.startsWith(token) || word.startsWith(tokenStem),
  );
}

function tokenMatchesText(haystack: string, token: string): boolean {
  return tokenMatchesWords(tokenizeSearchText(haystack), token);
}

function hasTextTokenMatch(haystack: string, tokens: string[]): boolean {
  return tokens.some((token) => tokenMatchesText(haystack, token));
}

function countTextTokenMatches(haystack: string, tokens: string[]): number {
  const words = tokenizeSearchText(haystack);
  return tokens.filter(
    (token, index) =>
      tokens.indexOf(token) === index && tokenMatchesWords(words, token),
  ).length;
}

function computeLevenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const up = previous[column] ?? 0;
      const insertion = (previous[column - 1] ?? 0) + 1;
      const deletion = up + 1;
      const substitution =
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1);

      diagonal = up;
      previous[column] = Math.min(insertion, deletion, substitution);
    }
  }

  return previous[right.length] ?? Math.max(left.length, right.length);
}

function isTypoCloseToken(token: string, word: string): boolean {
  if (token.length < 4 || word.length < 4) {
    return false;
  }

  const maxDistance = token.length >= 7 ? 2 : 1;
  if (Math.abs(token.length - word.length) > maxDistance) {
    return false;
  }

  return computeLevenshteinDistance(token, word) <= maxDistance;
}

function countFuzzyTokenMatches(haystack: string, tokens: string[]): number {
  const words = tokenizeSearchText(haystack);
  if (!words.length || !tokens.length) {
    return 0;
  }

  const uniqueTokens = tokens.filter(
    (token, index) => token.length >= 4 && tokens.indexOf(token) === index,
  );

  return uniqueTokens.filter((token) => {
    if (tokenMatchesWords(words, token)) {
      return false;
    }

    return words.some((word) => isTypoCloseToken(token, word));
  }).length;
}

const DEFAULT_MEAL_TYPES: readonly FoodItem["mealCategories"][number][] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

function isDefaultMealTypeValue(
  mealType: MealType,
): mealType is FoodItem["mealCategories"][number] {
  return DEFAULT_MEAL_TYPES.includes(
    mealType as FoodItem["mealCategories"][number],
  );
}

function resolveDefaultMealType(
  mealType: MealType | null | undefined,
): FoodItem["mealCategories"][number] | null {
  if (!mealType || !isDefaultMealTypeValue(mealType)) {
    return null;
  }

  return mealType;
}

export function hasStrongFoodSearchResult(
  query: string,
  food: FoodItem | null | undefined,
): boolean {
  if (!food) {
    return false;
  }

  if (isBrandOnlyPlaceholder(food)) {
    return false;
  }

  const rawQuery = query.trim();
  const normalizedQuery = normalizeTerm(rawQuery);
  if (!normalizedQuery) {
    return false;
  }

  const normalizedTags = getNormalizedTags(food);
  const normalizedName = normalizeTerm(food.displayName ?? food.name);
  const normalizedBrand = normalizeTerm(food.brand ?? "");
  const searchableText = normalizeTerm(
    buildSearchableFoodText(food, normalizedTags),
  );
  const queryTokens = getQueryTokens(rawQuery);
  const matchingTokenCount = countTextTokenMatches(searchableText, queryTokens);
  const brandProfile = findSupplementBrandProfile(query);

  if (food.barcode && rawQuery === food.barcode) {
    return true;
  }

  if (
    normalizedName === normalizedQuery ||
    normalizedBrand === normalizedQuery
  ) {
    return true;
  }

  if (
    normalizedQuery.length >= 4 &&
    normalizedName.startsWith(normalizedQuery)
  ) {
    return true;
  }

  if (normalizedQuery.length >= 6 && normalizedName.includes(normalizedQuery)) {
    return true;
  }

  if (queryTokens.length >= 2 && matchingTokenCount === queryTokens.length) {
    return true;
  }

  if (
    queryTokens.length === 1 &&
    queryTokens[0] &&
    queryTokens[0].length >= 4 &&
    tokenMatchesText(searchableText, queryTokens[0])
  ) {
    return true;
  }

  if (
    brandProfile &&
    matchesSupplementBrandText(searchableText, brandProfile)
  ) {
    return true;
  }

  return false;
}

function computeFoodScore(
  food: FoodItem,
  rawQuery: string,
  mealType: MealType | null,
): number {
  const query = normalizeTerm(rawQuery);
  const queryTokens = getQueryTokens(rawQuery);
  const defaultMealType = resolveDefaultMealType(mealType);
  const primaryQueryToken = queryTokens[0] ?? "";
  const normalizedName = normalizeTerm(food.displayName ?? food.name);
  const normalizedBrand = normalizeTerm(food.brand ?? "");
  const normalizedTags = getNormalizedTags(food);
  const brandProfile = findSupplementBrandProfile(rawQuery);
  const matchesRequestedBrand = brandProfile
    ? matchesSupplementBrandText(
        buildSearchableFoodText(food, normalizedTags),
        brandProfile,
      )
    : false;
  const isGenericSingleTokenQuery = !brandProfile && queryTokens.length === 1;
  const nameStartsWithPrimaryToken = startsWithQueryToken(
    food.displayName ?? food.name,
    primaryQueryToken,
  );
  const isBrandedResult = Boolean(normalizedBrand);

  if (food.barcode && rawQuery.trim() === food.barcode) {
    return 1200 + food.confidenceScore * 100;
  }

  let score = food.confidenceScore * 100;

  if (isBrandOnlyPlaceholder(food)) {
    score -= 320;
  }

  if (normalizedName === query) score += 260;
  if (normalizedName.startsWith(query)) score += 190;
  if (normalizedName.includes(query)) score += 150;
  if (normalizedBrand === query) score += 125;
  if (normalizedBrand.includes(query)) score += 40;
  if (normalizedTags.includes(query)) score += 95;
  if (normalizedTags.some((tag) => tag.includes(query))) score += 65;
  if (hasTextTokenMatch(normalizedName, queryTokens)) score += 80;
  if (hasTextTokenMatch(normalizedBrand, queryTokens)) score += 45;
  if (normalizedTags.some((tag) => hasTextTokenMatch(tag, queryTokens)))
    score += 55;
  if (countFuzzyTokenMatches(normalizedName, queryTokens) > 0) score += 35;
  if (countFuzzyTokenMatches(normalizedBrand, queryTokens) > 0) score += 18;
  if (
    normalizedTags.some((tag) => countFuzzyTokenMatches(tag, queryTokens) > 0)
  )
    score += 15;
  if (query.includes("prote") && food.category === "protein") score += 70;
  if (query.includes("barra") && /(barra|bar)/.test(normalizedName))
    score += 70;
  if (food.locale?.startsWith("pt")) score += 55;
  if (food.countryCode === "BR") score += 45;
  if (food.source === "custom") score += 70;
  if (food.source === "fatsecret") score += 90;
  if (food.source === "openfoodfacts") score += 24;
  if (food.source === "internal")
    score -= brandProfile && matchesRequestedBrand ? 0 : 35;
  if (food.source === "usda") score -= 12;
  if (defaultMealType) {
    if (food.mealCategories.includes(defaultMealType)) {
      score += 55;
    } else if (food.mealCategories.length > 0) {
      score -= 10;
    }
  }
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

  if (isGenericSingleTokenQuery) {
    if (nameStartsWithPrimaryToken && !isBrandedResult) {
      score += 120;
    }

    if (isBrandedResult && !nameStartsWithPrimaryToken) {
      score -= 110;
    }
  }

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
  {
    internalFoods,
    externalResults = [],
    limit = 8,
    source = "all",
    mealType = null,
  }: SearchFoodsOptions,
): Promise<FoodItem[]> {
  const normalizedQuery = normalizeTerm(query);
  const queryTokens = getQueryTokens(query);
  const allFoods = dedupeFoods([...internalFoods, ...externalResults]);
  const combinedFoods =
    source === "all"
      ? allFoods
      : allFoods.filter((food) => food.source === source);
  const brandProfile = findSupplementBrandProfile(query);

  const filteredFoods = combinedFoods.filter((food) => {
    if (!normalizedQuery) return true;
    if (isBrandOnlyPlaceholder(food) && food.barcode !== query.trim())
      return false;
    const normalizedName = normalizeTerm(food.displayName ?? food.name);
    const normalizedBrand = normalizeTerm(food.brand ?? "");
    const normalizedTags = getNormalizedTags(food);
    const searchableText = buildSearchableFoodText(food, normalizedTags);
    const minimumTokenMatches =
      queryTokens.length >= 2 ? Math.min(2, queryTokens.length) : 1;
    const matchingTokenCount = countTextTokenMatches(
      searchableText,
      queryTokens,
    );

    const hasTokenMatch =
      queryTokens.length > 0 && matchingTokenCount >= minimumTokenMatches;
    const fuzzyTokenMatchCount = countFuzzyTokenMatches(
      searchableText,
      queryTokens,
    );
    const hasFuzzyTokenMatch =
      queryTokens.length > 0 && fuzzyTokenMatchCount >= 1;
    const hasNameTokenMatch =
      queryTokens.length > 0 &&
      countTextTokenMatches(normalizedName, queryTokens) > 0;
    const hasTagTokenMatch =
      queryTokens.length > 0 &&
      normalizedTags.some((tag) => countTextTokenMatches(tag, queryTokens) > 0);
    const hasNameOrTagTokenMatch = hasNameTokenMatch || hasTagTokenMatch;

    const matchesProteinIntent =
      normalizedQuery.includes("prote") &&
      food.category === "protein" &&
      (/(barra|bar|protein|prote)/.test(normalizedName) ||
        normalizedTags.some((tag) => /(protein|prote)/.test(tag)));

    const matchesRequestedBrand = brandProfile
      ? matchesSupplementBrandText(searchableText, brandProfile)
      : false;
    const isGenericSingleTokenQuery = !brandProfile && queryTokens.length === 1;

    if (brandProfile && !matchesRequestedBrand) {
      return food.barcode === query.trim();
    }

    if (
      isGenericSingleTokenQuery &&
      normalizedBrand.includes(normalizedQuery) &&
      !normalizedName.includes(normalizedQuery) &&
      !hasNameOrTagTokenMatch
    ) {
      return false;
    }

    return (
      food.barcode === query.trim() ||
      normalizedName.includes(normalizedQuery) ||
      normalizedBrand.includes(normalizedQuery) ||
      normalizedTags.some((tag) => tag.includes(normalizedQuery)) ||
      hasTokenMatch ||
      hasFuzzyTokenMatch ||
      matchesProteinIntent
    );
  });

  const rankedFoods = filteredFoods
    .map((food) => ({
      food,
      score: computeFoodScore(food, query, mealType),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ food }) => food);

  if (!brandProfile) {
    return rankedFoods.slice(0, limit);
  }

  const curatedBrandMatches = rankedFoods.filter(
    (food) =>
      food.source === "internal" &&
      matchesSupplementBrandText(buildSearchableFoodText(food), brandProfile),
  );
  const remainingFoods = rankedFoods.filter(
    (food) =>
      !curatedBrandMatches.some((candidate) => candidate.id === food.id),
  );

  return [...curatedBrandMatches, ...remainingFoods].slice(0, limit);
}
