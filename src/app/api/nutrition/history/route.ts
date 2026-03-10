import { NextResponse } from "next/server";
import type { DiaryHistoryEntry } from "@/modules/nutrition/domain/types";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { buildDailySummary } from "@/modules/nutrition/services/daily-calories.service";
import { getGoal, getNutritionStorageHeaders, listDiaryHistory } from "@/modules/nutrition/repositories/nutrition-store";
import { historyQuerySchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user, defaultGoal } = await requireNutritionUser(request);
    const url = new URL(request.url);
    const { page, pageSize } = historyQuerySchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const offset = (page - 1) * pageSize;
    const goal = await getGoal(user.uid, defaultGoal);
    const { diaries, total } = await listDiaryHistory(user.uid, { limit: pageSize, offset });

    const entries: DiaryHistoryEntry[] = diaries.map((diary) => ({
      date: diary.date,
      itemCount: diary.items.length,
      summary: buildDailySummary({
        date: diary.date,
        targetCalories: diary.targetCalories,
        targetWaterMl: diary.targetWaterMl || goal.targetWaterMl || defaultGoal.targetWaterMl || 2200,
        waterIntakeMl: diary.waterIntakeMl,
        items: diary.items,
      }),
    }));

    return NextResponse.json(
      {
        entries,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      { headers: getNutritionStorageHeaders() },
    );
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to load nutrition history",
      unexpectedStatus: 500,
    });
  }
}
