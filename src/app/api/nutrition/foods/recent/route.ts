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
      mealType: url.searchParams.get("mealType") ?? undefined,
    });
    const foods = await listRecentConsumedFoods(user.uid, {
      limit: query.limit,
      ...(query.mealType ? { mealType: query.mealType } : {}),
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
