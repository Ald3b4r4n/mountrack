import type { FoodItem } from "@/modules/nutrition/domain/types";
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
): Promise<{ results: FoodItem[]; source: string; externalPending: boolean }> {
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
    const fatSecretPrimaryResults = await searchFoodsByQuery(query, {
      internalFoods: fatSecretResults,
      limit: SEARCH_LIMIT,
    });

    const localLastResults = await searchFoodsByQuery(query, {
      internalFoods: catalogFoods,
      limit: SEARCH_LIMIT,
      source: sourceFilter,
    });

    const prioritizedResults = appendUniqueFoods(
      sourceFilter === "all" ? fatSecretPrimaryResults : [],
      localLastResults,
    ).slice(0, SEARCH_LIMIT);

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
      source: "fatsecret-primary",
      externalPending: false,
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

  const secondaryExternalResults = await searchFoodsByQuery(query, {
    internalFoods: [...offResults, ...usdaResults],
    limit: SEARCH_LIMIT,
  });

  const localLastResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    limit: SEARCH_LIMIT,
    source: sourceFilter,
  });

  const prioritizedResults = appendUniqueFoods(
    sourceFilter === "all" ? secondaryExternalResults : [],
    localLastResults,
  ).slice(0, SEARCH_LIMIT);

  const externalPending = shouldEnrichFromExternal(
    query,
    prioritizedResults,
    Boolean(requestedBrand),
  );

  if (prioritizedResults.length || !externalPending) {
    return {
      results: prioritizedResults,
      source: resolveCatalogSource(prioritizedResults),
      externalPending,
    };
  }

  await queueMissingFoodLookup({ query, reason: "search_miss" });

  return {
    results: [],
    source: "none",
    externalPending: true,
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
