import type { FoodItem } from "@/modules/nutrition/domain/types";
import { normalizeOpenFoodFactsProduct } from "@/modules/nutrition/normalizers/normalize-food";
import {
  buildOpenFoodFactsSearchTerms,
  rankOpenFoodFactsResults,
} from "@/modules/nutrition/providers/open-food-facts-search";

const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "product_name_pt",
  "generic_name",
  "generic_name_pt",
  "brands",
  "image_url",
  "image_front_url",
  "serving_size",
  "quantity",
  "countries_tags",
  "categories_tags",
  "last_modified_t",
  "nutriments",
].join(",");

const OPEN_FOOD_FACTS_TIMEOUT_MS = 4500;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPEN_FOOD_FACTS_TIMEOUT_MS);

  try {
    return await fetch(url, {
      next: { revalidate: 60 * 30 },
      signal: controller.signal,
      headers: {
        "User-Agent": "MounTrack/1.0 (nutrition-catalog)",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchOpenFoodFactsSearchTerm(query: string): Promise<FoodItem[]> {
  const response = await fetchWithTimeout(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=${OPEN_FOOD_FACTS_FIELDS}&lc=pt&cc=br`,
  );

  if (!response?.ok) return [];

  try {
    const payload = (await response.json()) as { products?: unknown[] };
    return (payload.products ?? [])
      .map((product) => normalizeOpenFoodFactsProduct(product as Record<string, unknown>))
      .filter((food): food is FoodItem => Boolean(food));
  } catch {
    return [];
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return [];

  const queryVariants = buildOpenFoodFactsSearchTerms(query);
  const collectedResults: FoodItem[] = [];

  for (const queryVariant of queryVariants) {
    const nextResults = await fetchOpenFoodFactsSearchTerm(queryVariant);
    collectedResults.push(...nextResults);

    if (rankOpenFoodFactsResults(query, collectedResults).length >= 8) {
      break;
    }
  }

  return rankOpenFoodFactsResults(query, collectedResults).slice(0, 8);
}

export async function fetchOpenFoodFactsBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;

  const response = await fetchWithTimeout(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}&lc=pt&cc=br`,
  );

  if (!response?.ok) return null;

  try {
    const payload = (await response.json()) as { product?: Record<string, unknown> };
    return normalizeOpenFoodFactsProduct(payload.product ?? {});
  } catch {
    return null;
  }
}
