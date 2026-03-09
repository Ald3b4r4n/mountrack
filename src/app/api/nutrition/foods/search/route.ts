import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { searchNutritionCatalog } from "@/modules/nutrition/services/catalog-search.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json(
        { results: [], source: "none", externalPending: false },
        { headers: getNutritionStorageHeaders() },
      );
    }

    const { results, source, externalPending } = await searchNutritionCatalog(user.uid, query);
    return NextResponse.json({ results, source, externalPending }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Search failed",
      unexpectedStatus: 500,
    });
  }
}
