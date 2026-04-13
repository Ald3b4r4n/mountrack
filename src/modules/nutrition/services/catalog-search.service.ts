import type { FoodItem, MealType } from "@/modules/nutrition/domain/types";
import { buildNutritionBarcodeCandidates } from "@/modules/nutrition/barcode";
import { findSupplementBrandProfile } from "@/modules/nutrition/data/supplement-brands";
import {
  completeMissingFoodLookup,
  claimMissingFoodLookups,
  listAccessibleFoods,
  listFoods,
  queueMissingFoodLookup,
  retryMissingFoodLookup,
  upsertFoods,
} from "@/modules/nutrition/repositories/nutrition-store";
import {
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  type MissingFoodLookupRecord,
} from "@/modules/nutrition/repositories/missing-food-lookup";
import {
  hasStrongFoodSearchResult,
  searchFoodsByQuery,
  type FoodSourceFilter,
} from "@/modules/nutrition/services/food-search.service";
import {
  fetchOpenFoodFactsBarcode,
  searchOpenFoodFacts,
} from "@/modules/nutrition/providers/open-food-facts";
import {
  fetchFatSecretBarcode,
  searchFatSecretFoods,
} from "@/modules/nutrition/providers/fatsecret";
import { searchUsdaFoods } from "@/modules/nutrition/providers/usda-food-data";

const SEARCH_LIMIT = 50;
const SOURCE_APPEND_LIMIT = 6;
const DID_YOU_MEAN_LIMIT = 3;
const DID_YOU_MEAN_POOL_LIMIT = 180;
const SEARCH_STOP_WORDS = new Set([
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

const SEARCH_TOKEN_SYNONYMS: Record<string, string[]> = {
  arroz: ["rice"],
  feijao: ["bean", "beans", "black", "pinto"],
  feijoes: ["bean", "beans", "black", "pinto"],
};

function findBarcodeMatch(
  foods: FoodItem[],
  candidates: string[],
): FoodItem | null {
  return (
    foods.find((food) => {
      if (!food.barcode) {
        return false;
      }

      const storedCandidates = buildNutritionBarcodeCandidates(food.barcode);
      return storedCandidates.some((candidate) =>
        candidates.includes(candidate),
      );
    }) ?? null
  );
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeBaseQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token))
    .filter((token) => token.length >= 3 || /^\d{4,}$/.test(token));
}

function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const aliases = SEARCH_TOKEN_SYNONYMS[token] ?? [];
    for (const alias of aliases) {
      expanded.add(alias);
    }
  }

  return Array.from(expanded);
}

function tokenizeQuery(query: string): string[] {
  return expandQueryTokens(tokenizeBaseQuery(query));
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

function deriveSuggestionDistance(
  query: string,
  candidateLabel: string,
): number {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidateLabel);

  if (!normalizedQuery || !normalizedCandidate) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0;
  }

  const candidateTokens = normalizedCandidate.split(/\s+/).filter(Boolean);
  const tokenDistances = candidateTokens
    .filter((token) => token.length >= 3)
    .map((token) => computeLevenshteinDistance(normalizedQuery, token));
  const phraseDistance = computeLevenshteinDistance(
    normalizedQuery,
    normalizedCandidate,
  );

  return Math.min(phraseDistance, ...tokenDistances);
}

function buildDidYouMeanSuggestions(
  query: string,
  foods: FoodItem[],
): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 3) {
    return [];
  }

  const maxDistance =
    normalizedQuery.length >= 10 ? 3 : normalizedQuery.length >= 6 ? 2 : 1;
  const seenLabels = new Set<string>();

  const rankedSuggestions = foods
    .map((food) => {
      const label = (food.displayName ?? food.name).trim();
      if (!label) {
        return null;
      }

      const normalizedLabel = normalizeSearchText(label);
      if (!normalizedLabel || normalizedLabel === normalizedQuery) {
        return null;
      }

      const dedupeKey = `${food.source}::${normalizedLabel}`;
      if (seenLabels.has(dedupeKey)) {
        return null;
      }
      seenLabels.add(dedupeKey);

      const distance = deriveSuggestionDistance(normalizedQuery, label);
      if (!Number.isFinite(distance) || distance > maxDistance) {
        return null;
      }

      const sourcePenalty = food.source === "internal" ? 0 : 0.15;
      const confidencePenalty = Math.max(0, 1 - food.confidenceScore);
      return {
        label,
        ranking: distance + sourcePenalty + confidencePenalty,
      };
    })
    .filter((suggestion): suggestion is { label: string; ranking: number } =>
      Boolean(suggestion),
    )
    .sort((left, right) => left.ranking - right.ranking)
    .slice(0, DID_YOU_MEAN_POOL_LIMIT);

  const uniqueLabels = new Set<string>();
  const suggestions: string[] = [];

  for (const candidate of rankedSuggestions) {
    const comparable = normalizeSearchText(candidate.label);
    if (uniqueLabels.has(comparable)) {
      continue;
    }

    uniqueLabels.add(comparable);
    suggestions.push(candidate.label);

    if (suggestions.length >= DID_YOU_MEAN_LIMIT) {
      break;
    }
  }

  return suggestions;
}

function isLooselyRelevantSourceCandidate(
  food: FoodItem,
  query: string,
): boolean {
  const baseQueryTokens = tokenizeBaseQuery(query);
  const queryTokens = tokenizeQuery(query);
  const normalizedQuery = normalizeSearchText(query);
  const searchable = normalizeSearchText(
    [food.displayName ?? food.name, food.brand ?? "", ...(food.tags ?? [])]
      .join(" ")
      .trim(),
  );

  if (!searchable) {
    return false;
  }

  if (normalizedQuery && searchable.includes(normalizedQuery)) {
    return true;
  }

  if (!queryTokens.length) {
    return false;
  }

  const uniqueTokens = Array.from(new Set(queryTokens));
  const matchingCount = uniqueTokens.filter((token) =>
    searchable.includes(token),
  ).length;

  if (baseQueryTokens.length <= 1) {
    return matchingCount >= 1;
  }

  if (matchingCount >= 2) {
    return true;
  }

  return Boolean(baseQueryTokens[0] && searchable.includes(baseQueryTokens[0]));
}

function filterRelevantSourceCandidates(
  sourceCandidates: FoodItem[],
  query: string,
): FoodItem[] {
  return sourceCandidates.filter((candidate) =>
    isLooselyRelevantSourceCandidate(candidate, query),
  );
}

function shouldEnrichFromExternal(
  query: string,
  results: FoodItem[],
  hasRequestedBrand: boolean,
): boolean {
  if (!query.trim()) {
    return false;
  }

  if (hasStrongFoodSearchResult(query, results[0])) {
    return false;
  }

  if (hasRequestedBrand && results.length >= 3) {
    return false;
  }

  if (results.length >= 5) {
    return false;
  }

  return true;
}

function dedupeFoodsById(foods: FoodItem[]): FoodItem[] {
  const seenIds = new Set<string>();
  return foods.filter((food) => {
    if (seenIds.has(food.id)) {
      return false;
    }

    seenIds.add(food.id);
    return true;
  });
}

function appendUniqueFoods(
  baseFoods: FoodItem[],
  nextFoods: FoodItem[],
): FoodItem[] {
  const seen = new Set(baseFoods.map((food) => food.id));
  const merged = [...baseFoods];

  for (const food of nextFoods) {
    if (seen.has(food.id)) {
      continue;
    }

    seen.add(food.id);
    merged.push(food);
  }

  return merged;
}

function filterFoodsBySource(
  foods: FoodItem[],
  sourceFilter: FoodSourceFilter,
): FoodItem[] {
  if (sourceFilter === "all") {
    return foods;
  }

  return foods.filter((food) => food.source === sourceFilter);
}

function buildHybridResults(
  rankedFoods: FoodItem[],
  sourceCandidates: FoodItem[],
  query: string,
): FoodItem[] {
  const rankedSlice = rankedFoods.slice(0, SEARCH_LIMIT);
  const rankedIds = new Set(rankedSlice.map((food) => food.id));
  const relevantSourceCandidates = filterRelevantSourceCandidates(
    sourceCandidates,
    query,
  ).filter((candidate) => !rankedIds.has(candidate.id));

  if (rankedSlice.length) {
    return appendUniqueFoods(
      rankedSlice,
      relevantSourceCandidates.slice(0, SOURCE_APPEND_LIMIT),
    ).slice(0, SEARCH_LIMIT);
  }

  if (relevantSourceCandidates.length) {
    return relevantSourceCandidates.slice(0, SEARCH_LIMIT);
  }

  return sourceCandidates.slice(0, SEARCH_LIMIT);
}

function resolveCatalogSource(results: FoodItem[]): string {
  const primaryResult = results[0];
  if (!primaryResult) {
    return "none";
  }

  if (primaryResult.source === "internal" || primaryResult.source === "tbca") {
    return "catalog";
  }

  if (primaryResult.source === "openfoodfacts") {
    return "openfoodfacts";
  }

  if (primaryResult.source === "fatsecret") {
    return "fatsecret";
  }

  if (primaryResult.source === "custom") {
    return "custom";
  }

  return "external";
}

export async function searchNutritionCatalog(
  userId: string,
  query: string,
  sourceFilter: FoodSourceFilter = "all",
  mealType: MealType | null = null,
): Promise<{
  results: FoodItem[];
  source: string;
  externalPending: boolean;
  didYouMean?: string[];
}> {
  if (!query.trim()) {
    return { results: [], source: "none", externalPending: false };
  }

  // FatSecret is our primary provider - get results immediately
  const fatSecretResults = await searchFatSecretFoods(query);
  const catalogFoods = await listAccessibleFoods(userId, {
    includeInternal: true,
  });
  const requestedBrand = findSupplementBrandProfile(query);

  // If FatSecret has good results, return immediately
  // OFF and USDA run in background (fire-and-forget) for deduplication
  if (fatSecretResults.length > 0) {
    const fatSecretCandidates = filterFoodsBySource(
      fatSecretResults,
      sourceFilter,
    );

    const rankedResults = await searchFoodsByQuery(query, {
      internalFoods: catalogFoods,
      externalResults: fatSecretResults,
      limit: SEARCH_LIMIT,
      source: sourceFilter,
      mealType,
    });
    const prioritizedResults = buildHybridResults(
      rankedResults,
      fatSecretCandidates,
      query,
    );

    // Upsert FatSecret results immediately
    await upsertFoods(fatSecretResults);

    // Background caching: fetch OFF/USDA but don't wait for them
    Promise.all([searchOpenFoodFacts(query), searchUsdaFoods(query)])
      .then(([offResults, usdaResults]) => {
        const externalResults = dedupeFoodsById([
          ...offResults,
          ...usdaResults,
        ]);
        if (externalResults.length) {
          upsertFoods(externalResults);
        }
      })
      .catch(() => {
        // Silently ignore OFF/USDA errors
      });

    return {
      results: prioritizedResults,
      source:
        prioritizedResults[0]?.source === "fatsecret"
          ? "fatsecret-primary"
          : resolveCatalogSource(prioritizedResults),
      externalPending: false,
      didYouMean:
        prioritizedResults.length > 0
          ? undefined
          : buildDidYouMeanSuggestions(query, [
              ...fatSecretCandidates,
              ...catalogFoods,
            ]),
    };
  }

  // Fallback to parallel search if FatSecret has no results
  const [offResults, usdaResults] = await Promise.all([
    searchOpenFoodFacts(query),
    searchUsdaFoods(query),
  ]);

  const externalResults = dedupeFoodsById([...offResults, ...usdaResults]);
  if (externalResults.length) {
    await upsertFoods(externalResults);
  }

  const filteredExternalResults = filterFoodsBySource(
    externalResults,
    sourceFilter,
  );

  const secondaryExternalResults = await searchFoodsByQuery(query, {
    internalFoods: filteredExternalResults,
    limit: SEARCH_LIMIT,
    mealType,
  });

  const localLastResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    limit: SEARCH_LIMIT,
    source: sourceFilter,
    mealType,
  });

  const rankedResults = appendUniqueFoods(
    secondaryExternalResults,
    localLastResults,
  );
  const prioritizedResults = buildHybridResults(
    rankedResults,
    filteredExternalResults,
    query,
  );

  const externalPending = shouldEnrichFromExternal(
    query,
    prioritizedResults,
    Boolean(requestedBrand),
  );
  const didYouMeanSuggestions = buildDidYouMeanSuggestions(query, [
    ...catalogFoods,
    ...filteredExternalResults,
  ]);

  if (prioritizedResults.length || !externalPending) {
    return {
      results: prioritizedResults,
      source: resolveCatalogSource(prioritizedResults),
      externalPending,
      didYouMean:
        prioritizedResults.length > 0 ? undefined : didYouMeanSuggestions,
    };
  }

  await queueMissingFoodLookup({ query, reason: "search_miss" });

  return {
    results: [],
    source: "none",
    externalPending: true,
    didYouMean: didYouMeanSuggestions,
  };
}

export async function enrichMissingFoodLookup(
  lookup: MissingFoodLookupRecord,
): Promise<{
  status: "completed" | "failed" | "no_match";
  insertedCount: number;
  lastError?: string | null;
}> {
  try {
    if (lookup.barcode) {
      const fatSecretMatch = await fetchFatSecretBarcode(lookup.barcode);
      if (fatSecretMatch) {
        await upsertFoods([fatSecretMatch]);
        return { status: "completed", insertedCount: 1 };
      }

      const barcodeMatch = await fetchOpenFoodFactsBarcode(lookup.barcode);
      if (!barcodeMatch) {
        return { status: "no_match", insertedCount: 0 };
      }

      await upsertFoods([barcodeMatch]);
      return { status: "completed", insertedCount: 1 };
    }

    if (!lookup.query) {
      return { status: "no_match", insertedCount: 0 };
    }

    const [fatSecretResults, offResults, usdaResults] = await Promise.all([
      searchFatSecretFoods(lookup.query),
      searchOpenFoodFacts(lookup.query),
      searchUsdaFoods(lookup.query),
    ]);
    const externalResults = dedupeFoodsById([
      ...fatSecretResults,
      ...offResults,
      ...usdaResults,
    ]);

    if (!externalResults.length) {
      return { status: "no_match", insertedCount: 0 };
    }

    await upsertFoods(externalResults);
    return { status: "completed", insertedCount: externalResults.length };
  } catch (error) {
    return {
      status: "failed",
      insertedCount: 0,
      lastError:
        error instanceof Error
          ? error.message
          : "Unexpected enrichment failure",
    };
  }
}

export async function processQueuedFoodLookups(limit = 5): Promise<{
  claimed: number;
  completed: number;
  noMatch: number;
  failed: number;
  retried: number;
  insertedCount: number;
}> {
  const claimedLookups = await claimMissingFoodLookups(limit);
  let completed = 0;
  let noMatch = 0;
  let failed = 0;
  let retried = 0;
  let insertedCount = 0;

  for (const lookup of claimedLookups) {
    const result = await enrichMissingFoodLookup(lookup);
    insertedCount += result.insertedCount;

    if (result.status === "completed") {
      await completeMissingFoodLookup(lookup.id, "completed");
      completed += 1;
      continue;
    }

    if (result.status === "no_match") {
      await completeMissingFoodLookup(lookup.id, "no_match");
      noMatch += 1;
      continue;
    }

    if (lookup.attempts < MISSING_FOOD_LOOKUP_MAX_ATTEMPTS) {
      await retryMissingFoodLookup(lookup.id, result.lastError);
      retried += 1;
      continue;
    }

    await completeMissingFoodLookup(lookup.id, "failed", result.lastError);
    failed += 1;
  }

  return {
    claimed: claimedLookups.length,
    completed,
    noMatch,
    failed,
    retried,
    insertedCount,
  };
}

export async function lookupNutritionBarcode(
  userId: string,
  code: string,
): Promise<{ item: FoodItem | null; source: string }> {
  const candidates = buildNutritionBarcodeCandidates(code);
  if (!candidates.length) {
    return { item: null, source: "none" };
  }

  for (const candidate of candidates) {
    const fatSecretMatch = await fetchFatSecretBarcode(candidate);
    if (fatSecretMatch) {
      await upsertFoods([fatSecretMatch]);
      return { item: fatSecretMatch, source: "fatsecret" };
    }
  }

  for (const candidate of candidates) {
    const offMatch = await fetchOpenFoodFactsBarcode(candidate);
    if (offMatch) {
      await upsertFoods([offMatch]);
      return { item: offMatch, source: "openfoodfacts" };
    }
  }

  const tbcaCatalogFoods = await listFoods({ includeInternal: true });
  const tbcaCatalogMatch = findBarcodeMatch(tbcaCatalogFoods, candidates);
  if (tbcaCatalogMatch) {
    return {
      item: tbcaCatalogMatch,
      source: resolveCatalogSource([tbcaCatalogMatch]),
    };
  }

  const storedFoods = await listAccessibleFoods(userId, {
    includeInternal: true,
  });
  const storedMatch = findBarcodeMatch(storedFoods, candidates);
  if (storedMatch) {
    return { item: storedMatch, source: resolveCatalogSource([storedMatch]) };
  }

  await queueMissingFoodLookup({
    barcode: candidates[0],
    reason: "barcode_miss",
  });

  const fallbackMatch = findBarcodeMatch(
    await listAccessibleFoods(userId, { includeInternal: true }),
    candidates,
  );
  return { item: fallbackMatch, source: fallbackMatch ? "fallback" : "none" };
}
