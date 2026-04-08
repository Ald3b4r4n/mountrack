import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { searchNutritionCatalog } from "@/modules/nutrition/services/catalog-search.service";
import type { MealType } from "@/modules/nutrition/domain/types";
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
const MEAL_TYPE_PATTERN =
  /^(breakfast|lunch|dinner|snack|custom:[a-z0-9-]{1,48})$/;

function parseSourceFilter(raw: string | null): FoodSourceFilter | null {
  if (!raw) return "all";
  if ((VALID_FOOD_SOURCES as readonly string[]).includes(raw)) {
    return raw as FoodSourceFilter;
  }
  return null;
}

function parseMealType(raw: string | null): MealType | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  if (!MEAL_TYPE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized as MealType;
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
        {
          error: `Invalid source filter. Valid values: ${VALID_FOOD_SOURCES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const rawMealType = url.searchParams.get("mealType");
    const mealType = parseMealType(rawMealType);
    if (rawMealType && mealType === null) {
      return NextResponse.json(
        {
          error:
            "Invalid meal type. Valid values: breakfast, lunch, dinner, snack or custom:<slug>",
        },
        { status: 400 },
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { results: [], source: "none", externalPending: false },
        { headers: getNutritionStorageHeaders() },
      );
    }

    const { results, source, externalPending, didYouMean } =
      await searchNutritionCatalog(user.uid, query, sourceFilter, mealType);

    return NextResponse.json(
      {
        results,
        source,
        externalPending,
        ...(didYouMean && didYouMean.length > 0 ? { didYouMean } : {}),
      },
      { headers: getNutritionStorageHeaders() },
    );
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Search failed",
      unexpectedStatus: 500,
    });
  }
}
