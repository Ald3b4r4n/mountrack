import type { FoodItem } from "@/modules/nutrition/domain/types";
import { normalizeUsdaFood } from "@/modules/nutrition/normalizers/normalize-food";

const USDA_TIMEOUT_MS = 1800;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);

  try {
    return await fetch(url, {
      next: { revalidate: 60 * 60 * 6 },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey || !query.trim()) {
    return [];
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=6&api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(url);
  if (!response?.ok) return [];

  try {
    const payload = (await response.json()) as { foods?: unknown[] };
    return (payload.foods ?? [])
      .map((food) => normalizeUsdaFood(food as Record<string, unknown>))
      .filter((item): item is FoodItem => Boolean(item));
  } catch {
    return [];
  }
}
