import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import {
  findAccessibleFoodById,
  findDiaryItemById,
  replaceDiaryItem,
  removeDiaryItem,
} from "@/modules/nutrition/repositories/nutrition-store";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import type { DiaryItemSnapshot } from "@/modules/nutrition/domain/types";
import { entityIdParamsSchema, updateDiaryItemSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

function roundScaledValue(value: number, ratio: number): number {
  return Math.round(value * ratio * 100) / 100;
}

function buildFallbackSnapshot(
  currentItem: DiaryItemSnapshot,
  payload: {
    quantity: number;
    unit: DiaryItemSnapshot["unit"];
    mealType: DiaryItemSnapshot["mealType"];
    mealLabel?: string;
    consumedAt?: string;
  },
): DiaryItemSnapshot {
  const ratio = currentItem.quantity > 0 ? payload.quantity / currentItem.quantity : 1;

  return {
    ...currentItem,
    quantity: payload.quantity,
    unit: payload.unit,
    mealType: payload.mealType,
    mealLabel: payload.mealLabel,
    consumedAt: payload.consumedAt ?? currentItem.consumedAt ?? new Date().toISOString(),
    calories: roundScaledValue(currentItem.calories, ratio),
    protein: roundScaledValue(currentItem.protein, ratio),
    carbs: roundScaledValue(currentItem.carbs, ratio),
    fat: roundScaledValue(currentItem.fat, ratio),
    fiber: roundScaledValue(currentItem.fiber, ratio),
    sodium: roundScaledValue(currentItem.sodium, ratio),
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireNutritionUser(request);
    const { id } = entityIdParamsSchema.parse(await context.params);
    const payload = updateDiaryItemSchema.parse({ id, ...(await request.json()) });
    const currentItem = await findDiaryItemById(user.uid, id);

    if (!currentItem) {
      return NextResponse.json({ error: "Diary item not found" }, { status: 404 });
    }

    const food = await findAccessibleFoodById(user.uid, payload.foodId);
    const nextItem = food
      ? createDiaryItemSnapshot({
          diaryId: "patched-item",
          food,
          quantity: payload.quantity,
          unit: payload.unit,
          mealType: payload.mealType,
          mealLabel: payload.mealLabel,
          consumedAt: payload.consumedAt ?? new Date().toISOString(),
        })
      : buildFallbackSnapshot(currentItem, {
          quantity: payload.quantity,
          unit: payload.unit,
          mealType: payload.mealType,
          mealLabel: payload.mealLabel,
          consumedAt: payload.consumedAt,
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

