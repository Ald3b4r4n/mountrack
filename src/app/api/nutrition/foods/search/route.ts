import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { searchNutritionCatalog } from "@/modules/nutrition/services/catalog-search.service";
import type { FoodSourceFilter } from "@/modules/nutrition/services/food-search.service";
import { searchQuerySchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

const VALID_FOOD_SOURCES: readonly FoodSourceFilter[] = [
  "all",
  "fatsecret",
  "openfoodfacts",
  "usda",
  "custom",
  "internal",
  "tbca",
];

function parseSourceFilter(raw: string | null): FoodSourceFilter | null {
  if (!raw) return "all";
  if ((VALID_FOOD_SOURCES as readonly string[]).includes(raw)) {
    return raw as FoodSourceFilter;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const url = new URL(request.url);
    const { q: query } = searchQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
    });

    const sourceFilter = parseSourceFilter(url.searchParams.get("source"));
    if (sourceFilter === null) {
      return NextResponse.json(
        { error: `Invalid source filter. Valid values: ${VALID_FOOD_SOURCES.join(", ")}` },
        { status: 400 },
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { results: [], source: "none", externalPending: false },
        { headers: getNutritionStorageHeaders() },
      );
    }

    const { results, source, externalPending } = await searchNutritionCatalog(
      user.uid,
      query,
      sourceFilter,
    );
    return NextResponse.json({ results, source, externalPending }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Search failed",
      unexpectedStatus: 500,
    });
  }
}
