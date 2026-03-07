import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { searchNutritionCatalog } from "@/modules/nutrition/services/catalog-search.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireNutritionUser(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const { results, source } = await searchNutritionCatalog(query);
    return NextResponse.json({ results, source });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Search failed",
      unexpectedStatus: 500,
    });
  }
}
