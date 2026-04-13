import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import {
  copyDiaryItem,
  getGoal,
  getNutritionStorageHeaders,
} from "@/modules/nutrition/repositories/nutrition-store";
import { copyDiaryItemSchema, entityIdParamsSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const { id } = entityIdParamsSchema.parse(await context.params);
    const payload = copyDiaryItemSchema.parse(await request.json());
    const goal = await getGoal(user.uid, defaultGoal);

    const copied = await copyDiaryItem(
      user.uid,
      id,
      payload,
      goal.targetCalories,
      goal.targetWaterMl ?? defaultGoal.targetWaterMl ?? 2200,
    );

    if (!copied) {
      return NextResponse.json({ error: "Diary item not found" }, { status: 404 });
    }

    return NextResponse.json(copied, {
      status: 201,
      headers: getNutritionStorageHeaders(),
    });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to copy diary item",
      unexpectedStatus: 500,
    });
  }
}
