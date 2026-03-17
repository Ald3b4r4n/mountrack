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

const OPEN_FOOD_FACTS_TIMEOUT_MS = 3500;
const OPEN_FOOD_FACTS_BASE_URLS = [
  "https://world.openfoodfacts.org",
  "https://openfoodfacts.org",
];

async function fetchWithTimeout(
  url: string,
  timeoutMs = OPEN_FOOD_FACTS_TIMEOUT_MS,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      next: { revalidate: 60 * 30 },
      signal: controller.signal,
      headers: {
        "User-Agent": "MounTrack/1.0 (nutrition-catalog)",
      },
    });
  } catch (error) {
    console.error("[OpenFoodFacts] Request failed:", {
      url,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchOpenFoodFactsJson(path: string): Promise<Response | null> {
  for (const baseUrl of OPEN_FOOD_FACTS_BASE_URLS) {
    const primaryResponse = await fetchWithTimeout(`${baseUrl}${path}`);
    if (primaryResponse?.ok) {
      return primaryResponse;
    }

    // One retry per host to absorb transient OFF latency spikes.
    const retryResponse = await fetchWithTimeout(`${baseUrl}${path}`);
    if (retryResponse?.ok) {
      return retryResponse;
    }
  }

  return null;
}

async function fetchOpenFoodFactsSearchTerm(
  query: string,
): Promise<FoodItem[]> {
  const response = await fetchOpenFoodFactsJson(
    `/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=${OPEN_FOOD_FACTS_FIELDS}&lc=pt&cc=br`,
  );

  if (!response?.ok) return [];

  try {
    const payload = (await response.json()) as { products?: unknown[] };
    return (payload.products ?? [])
      .map((product) =>
        normalizeOpenFoodFactsProduct(product as Record<string, unknown>),
      )
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

export async function fetchOpenFoodFactsBarcode(
  barcode: string,
): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;

  console.log(`[OpenFoodFacts] Barcode lookup: ${barcode}`);

  const localizedResponse = await fetchOpenFoodFactsJson(
    `/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}&lc=pt&cc=br`,
  );

  if (localizedResponse?.ok) {
    try {
      const payload = (await localizedResponse.json()) as {
        status?: number;
        product?: Record<string, unknown>;
      };
      const localizedFood = normalizeOpenFoodFactsProduct(
        payload.product ?? {},
      );
      if (localizedFood) {
        console.log(`[OpenFoodFacts] Barcode match (localized): ${barcode}`);
        return localizedFood;
      }

      console.log(
        "[OpenFoodFacts] Localized payload had no normalizable product",
        {
          barcode,
          status: payload.status,
        },
      );
    } catch (error) {
      console.error(
        "[OpenFoodFacts] Failed to parse localized barcode payload",
        {
          barcode,
          message: error instanceof Error ? error.message : "unknown error",
        },
      );
    }
  } else {
    console.warn(
      `[OpenFoodFacts] Localized barcode request failed: ${barcode}`,
    );
  }

  // Fallback without locale/country hints: some products resolve only in default context.
  const rawResponse = await fetchOpenFoodFactsJson(
    `/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}`,
  );

  if (!rawResponse?.ok) {
    console.warn(`[OpenFoodFacts] Raw barcode request failed: ${barcode}`);
    return null;
  }

  try {
    const payload = (await rawResponse.json()) as {
      status?: number;
      product?: Record<string, unknown>;
    };
    const food = normalizeOpenFoodFactsProduct(payload.product ?? {});
    if (!food) {
      console.log("[OpenFoodFacts] No product from raw barcode payload", {
        barcode,
        status: payload.status,
      });
      return null;
    }

    console.log(`[OpenFoodFacts] Barcode match (raw): ${barcode}`);
    return food;
  } catch (error) {
    console.error("[OpenFoodFacts] Failed to parse raw barcode payload", {
      barcode,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  }
}
