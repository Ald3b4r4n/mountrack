import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import {
  getNutritionStorageHeaders,
  listRecentConsumedFoods,
} from "@/modules/nutrition/repositories/nutrition-store";
import { recentFoodsQuerySchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const url = new URL(request.url);
    const query = recentFoodsQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
    });
    const foods = await listRecentConsumedFoods(user.uid, {
      limit: query.limit,
    });

    return NextResponse.json(
      { foods },
      { headers: getNutritionStorageHeaders() },
    );
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to list recent foods",
      unexpectedStatus: 500,
    });
  }
}
