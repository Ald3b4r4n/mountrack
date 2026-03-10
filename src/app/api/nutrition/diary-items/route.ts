import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { diaryItemSchema } from "@/modules/nutrition/validators";
import { findAccessibleFoodById, getGoal, getNutritionStorageHeaders, saveDiaryItem } from "@/modules/nutrition/repositories/nutrition-store";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const payload = diaryItemSchema.parse(await request.json());
    const goal = await getGoal(user.uid, defaultGoal);
    const fallbackFood =
      payload.foodSnapshot != null
        ? {
            ...payload.foodSnapshot,
            id: payload.foodId,
          }
        : null;
    const food = (await findAccessibleFoodById(user.uid, payload.foodId)) ?? fallbackFood;

    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const snapshot = createDiaryItemSnapshot({
      diaryId: `${user.uid}:${payload.date}`,
      food,
      quantity: payload.quantity,
      unit: payload.unit,
      mealType: payload.mealType,
      mealLabel: payload.mealLabel,
      consumedAt: payload.consumedAt ?? new Date().toISOString(),
    });

    const diary = await saveDiaryItem(
      user.uid,
      payload.date,
      goal.targetCalories,
      goal.targetWaterMl ?? defaultGoal.targetWaterMl ?? 2200,
      snapshot,
    );

    return NextResponse.json({ diary, item: snapshot }, { status: 201, headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to create diary item",
      unexpectedStatus: 500,
    });
  }
}
