import type { FoodItem } from "@/modules/nutrition/domain/types";
import { findSupplementBrandProfile } from "@/modules/nutrition/data/supplement-brands";
import { SUPPLEMENT_FOODS } from "@/modules/nutrition/data/supplement-foods";
import { listFoods, queueMissingFoodLookup, upsertFoods } from "@/modules/nutrition/repositories/nutrition-store";
import { searchFoodsByQuery } from "@/modules/nutrition/services/food-search.service";
import { searchOpenFoodFacts, fetchOpenFoodFactsBarcode } from "@/modules/nutrition/providers/open-food-facts";
import { searchUsdaFoods } from "@/modules/nutrition/providers/usda-food-data";

const SEARCH_LIMIT = 8;

function resolveCatalogSource(results: FoodItem[]): string {
  const primaryResult = results[0];
  if (!primaryResult) {
    return "none";
  }

  if (primaryResult.source === "internal") {
    return "catalog";
  }

  if (primaryResult.source === "openfoodfacts") {
    return "openfoodfacts";
  }

  return "external";
}

export async function searchNutritionCatalog(query: string): Promise<{ results: FoodItem[]; source: string }> {
  const catalogFoods = [...(await listFoods({ includeInternal: true })), ...SUPPLEMENT_FOODS];
  const requestedBrand = findSupplementBrandProfile(query);
  const storedResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    limit: SEARCH_LIMIT,
  });

  if (requestedBrand && storedResults.length >= 3) {
    return { results: storedResults, source: resolveCatalogSource(storedResults) };
  }

  if (storedResults.length >= 5) {
    return { results: storedResults, source: resolveCatalogSource(storedResults) };
  }

  const [offResults, usdaResults] = await Promise.all([
    searchOpenFoodFacts(query),
    searchUsdaFoods(query),
  ]);
  const externalResults = [...offResults, ...usdaResults];

  if (externalResults.length) {
    await upsertFoods(externalResults);
  } else {
    await queueMissingFoodLookup({ query, reason: "search_miss" });
  }

  const combinedResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    externalResults,
    limit: SEARCH_LIMIT,
  });

  if (combinedResults.length) {
    return {
      results: combinedResults,
      source: externalResults.length ? resolveCatalogSource(combinedResults) : "catalog",
    };
  }

  const fallbackResults = await searchFoodsByQuery(query, {
    internalFoods: catalogFoods,
    limit: SEARCH_LIMIT,
  });

  return { results: fallbackResults, source: fallbackResults.length ? "fallback" : "none" };
}

export async function lookupNutritionBarcode(code: string): Promise<{ item: FoodItem | null; source: string }> {
  const storedFoods = await listFoods({ includeInternal: false });
  const storedMatch = storedFoods.find((food) => food.barcode === code) ?? null;
  if (storedMatch) {
    return { item: storedMatch, source: resolveCatalogSource([storedMatch]) };
  }

  const offMatch = await fetchOpenFoodFactsBarcode(code);
  if (offMatch) {
    await upsertFoods([offMatch]);
    return { item: offMatch, source: "openfoodfacts" };
  }

  await queueMissingFoodLookup({ barcode: code, reason: "barcode_miss" });

  const fallbackMatch = (await listFoods({ includeInternal: true })).find((food) => food.barcode === code) ?? null;
  return { item: fallbackMatch, source: fallbackMatch ? "fallback" : "none" };
}
