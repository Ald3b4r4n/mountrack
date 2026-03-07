import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { deleteMealPlan } from "@/modules/nutrition/repositories/nutrition-store";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    await deleteMealPlan(user.uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Unable to delete meal plan",
      unexpectedStatus: 500,
    });
  }
}
