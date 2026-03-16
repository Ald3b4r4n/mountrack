import type { FoodItem } from "@/modules/nutrition/domain/types";
import { buildNutritionBarcodeCandidates } from "@/modules/nutrition/barcode";
import { findSupplementBrandProfile } from "@/modules/nutrition/data/supplement-brands";
import {
  completeMissingFoodLookup,
  claimMissingFoodLookups,
  listAccessibleFoods,
  queueMissingFoodLookup,
  retryMissingFoodLookup,
  upsertFoods,
} from "@/modules/nutrition/repositories/nutrition-store";
import {
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  type MissingFoodLookupRecord,
} from "@/modules/nutrition/repositories/missing-food-lookup";
import { hasStrongFoodSearchResult, searchFoodsByQuery } from "@/modules/nutrition/services/food-search.service";
import { fetchOpenFoodFactsBarcode, searchOpenFoodFacts } from "@/modules/nutrition/providers/open-food-facts";
import { searchUsdaFoods } from "@/modules/nutrition/providers/usda-food-data";

const SEARCH_LIMIT = 8;

function shouldEnrichFromExternal(query: string, results: FoodItem[], hasRequestedBrand: boolean): boolean {
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

  if (primaryResult.source === "custom") {
    return "custom";
  }

  return "external";
}

export async function searchNutritionCatalog(
  userId: string,
  query: string,
): Promise<{ results: FoodItem[]; source: string; externalPending: boolean }> {
  const catalogFoods = await listAccessibleFoods(userId, { includeInternal: true });
  const requestedBrand = findSupplementBrandProfile(query);
  const storedResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    limit: SEARCH_LIMIT,
  });

  const externalPending = shouldEnrichFromExternal(query, storedResults, Boolean(requestedBrand));
  if (!externalPending) {
    return { results: storedResults, source: resolveCatalogSource(storedResults), externalPending: false };
  }
  await queueMissingFoodLookup({ query, reason: "search_miss" });

  return {
    results: storedResults,
    source: storedResults.length ? resolveCatalogSource(storedResults) : "none",
    externalPending: true,
  };
}

export async function enrichMissingFoodLookup(
  lookup: MissingFoodLookupRecord,
): Promise<{ status: "completed" | "failed" | "no_match"; insertedCount: number; lastError?: string | null }> {
  try {
    if (lookup.barcode) {
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

    const [offResults, usdaResults] = await Promise.all([
      searchOpenFoodFacts(lookup.query),
      searchUsdaFoods(lookup.query),
    ]);
    const externalResults = [...offResults, ...usdaResults];

    if (!externalResults.length) {
      return { status: "no_match", insertedCount: 0 };
    }

    await upsertFoods(externalResults);
    return { status: "completed", insertedCount: externalResults.length };
  } catch (error) {
    return {
      status: "failed",
      insertedCount: 0,
      lastError: error instanceof Error ? error.message : "Unexpected enrichment failure",
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

export async function lookupNutritionBarcode(userId: string, code: string): Promise<{ item: FoodItem | null; source: string }> {
  const candidates = buildNutritionBarcodeCandidates(code);
  if (!candidates.length) {
    return { item: null, source: "none" };
  }

  const storedFoods = await listAccessibleFoods(userId, { includeInternal: true });
  const storedMatch = storedFoods.find((food) => food.barcode && candidates.includes(food.barcode)) ?? null;
  if (storedMatch) {
    return { item: storedMatch, source: resolveCatalogSource([storedMatch]) };
  }

  for (const candidate of candidates) {
    const offMatch = await fetchOpenFoodFactsBarcode(candidate);
    if (offMatch) {
      await upsertFoods([offMatch]);
      return { item: offMatch, source: "openfoodfacts" };
    }
  }

  await queueMissingFoodLookup({ barcode: candidates[0], reason: "barcode_miss" });

  const fallbackMatch = (await listAccessibleFoods(userId, { includeInternal: true })).find(
    (food) => food.barcode && candidates.includes(food.barcode),
  ) ?? null;
  return { item: fallbackMatch, source: fallbackMatch ? "fallback" : "none" };
}
