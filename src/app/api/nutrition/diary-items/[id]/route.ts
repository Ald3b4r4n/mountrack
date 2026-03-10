import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { findAccessibleFoodById, replaceDiaryItem, removeDiaryItem } from "@/modules/nutrition/repositories/nutrition-store";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import { entityIdParamsSchema, updateDiaryItemSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireNutritionUser(request);
    const { id } = entityIdParamsSchema.parse(await context.params);
    const payload = updateDiaryItemSchema.parse({ id, ...(await request.json()) });
    const food = await findAccessibleFoodById(user.uid, payload.foodId);

    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const nextItem = createDiaryItemSnapshot({
      diaryId: "patched-item",
      food,
      quantity: payload.quantity,
      unit: payload.unit,
      mealType: payload.mealType,
      mealLabel: payload.mealLabel,
      consumedAt: payload.consumedAt ?? new Date().toISOString(),
    });
    nextItem.id = id;

    const diary = await replaceDiaryItem(user.uid, id, nextItem);
    if (!diary) {
      return NextResponse.json({ error: "Diary item not found" }, { status: 404 });
    }

    return NextResponse.json({ diary });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to update diary item",
      unexpectedStatus: 500,
    });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireNutritionUser(request);
    const { id } = entityIdParamsSchema.parse(await context.params);
    const diary = await removeDiaryItem(user.uid, id);
    if (!diary) {
      return NextResponse.json({ error: "Diary item not found" }, { status: 404 });
    }

    return NextResponse.json({ diary });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to delete diary item",
      unexpectedStatus: 500,
    });
  }
}

