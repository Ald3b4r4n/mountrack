import type { FoodItem } from "@/modules/nutrition/domain/types";
import { listFoods, queueMissingFoodLookup, upsertFoods } from "@/modules/nutrition/repositories/nutrition-store";
import { searchFoodsByQuery } from "@/modules/nutrition/services/food-search.service";
import { searchOpenFoodFacts, fetchOpenFoodFactsBarcode } from "@/modules/nutrition/providers/open-food-facts";
import { searchUsdaFoods } from "@/modules/nutrition/providers/usda-food-data";

const SEARCH_LIMIT = 8;

export async function searchNutritionCatalog(query: string): Promise<{ results: FoodItem[]; source: string }> {
  const storedFoods = await listFoods({ includeInternal: false });
  const storedResults = await searchFoodsByQuery(query, {
    internalFoods: storedFoods,
    limit: SEARCH_LIMIT,
  });

  if (storedResults.length >= 5) {
    return { results: storedResults, source: "catalog" };
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
    internalFoods: storedFoods,
    externalResults,
    limit: SEARCH_LIMIT,
  });

  if (combinedResults.length) {
    return { results: combinedResults, source: externalResults.length ? "external" : "catalog" };
  }

  const fallbackResults = await searchFoodsByQuery(query, {
    internalFoods: await listFoods({ includeInternal: true }),
    limit: SEARCH_LIMIT,
  });

  return { results: fallbackResults, source: fallbackResults.length ? "fallback" : "none" };
}

export async function lookupNutritionBarcode(code: string): Promise<{ item: FoodItem | null; source: string }> {
  const storedFoods = await listFoods({ includeInternal: false });
  const storedMatch = storedFoods.find((food) => food.barcode === code) ?? null;
  if (storedMatch) {
    return { item: storedMatch, source: "catalog" };
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
