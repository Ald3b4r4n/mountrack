import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { buildDailySummary } from "@/modules/nutrition/services/daily-calories.service";
import { getGoal, getMealPlan, getOrCreateDiary, updateDiaryWater } from "@/modules/nutrition/repositories/nutrition-store";
import { waterIntakeSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ date: string }> }) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const { date } = await context.params;
    const goal = await getGoal(user.uid, defaultGoal);
    const diary = await getOrCreateDiary(user.uid, date, goal.targetCalories, goal.targetWaterMl ?? defaultGoal.targetWaterMl ?? 2200);
    const summary = buildDailySummary({
      date,
      targetCalories: diary.targetCalories,
      targetWaterMl: diary.targetWaterMl,
      waterIntakeMl: diary.waterIntakeMl,
      items: diary.items,
    });
    const mealPlan = await getMealPlan(user.uid);

    return NextResponse.json({ diary, summary, goal, mealPlan });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Diary lookup failed",
      unexpectedStatus: 500,
    });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ date: string }> }) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const { date } = await context.params;
    const goal = await getGoal(user.uid, defaultGoal);
    const payload = waterIntakeSchema.parse(await request.json());
    const diary = await updateDiaryWater(
      user.uid,
      date,
      goal.targetCalories,
      goal.targetWaterMl ?? defaultGoal.targetWaterMl ?? 2200,
      payload.waterIntakeMl,
    );
    const summary = buildDailySummary({
      date,
      targetCalories: diary.targetCalories,
      targetWaterMl: diary.targetWaterMl,
      waterIntakeMl: diary.waterIntakeMl,
      items: diary.items,
    });
    const mealPlan = await getMealPlan(user.uid);

    return NextResponse.json({ diary, summary, goal, mealPlan });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to update hydration",
      unexpectedStatus: 500,
    });
  }
}
