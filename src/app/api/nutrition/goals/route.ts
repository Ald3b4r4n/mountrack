import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { nutritionGoalSchema } from "@/modules/nutrition/validators";
import { getGoal, getNutritionStorageHeaders, saveGoal } from "@/modules/nutrition/repositories/nutrition-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const goal = await getGoal(user.uid, defaultGoal);
    return NextResponse.json({ goal }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to fetch goal",
      unexpectedStatus: 500,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const currentGoal = await getGoal(user.uid, defaultGoal);
    const payload = nutritionGoalSchema.parse(await request.json());
    const goal = await saveGoal({
      userId: user.uid,
      targetCalories: payload.targetCalories,
      targetWaterMl: payload.targetWaterMl ?? currentGoal.targetWaterMl ?? defaultGoal.targetWaterMl,
      targetProtein: payload.targetProtein,
      targetCarbs: payload.targetCarbs,
      targetFat: payload.targetFat,
      objective: payload.objective,
    });
    return NextResponse.json({ goal }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to save goal",
      unexpectedStatus: 500,
    });
  }
}
