import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders, saveUserCustomFood, findAccessibleFoodById } from "@/modules/nutrition/repositories/nutrition-store";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import { customFoodSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireNutritionUser(request);
    const { id } = await params;

    if (!id || !id.startsWith("custom_")) {
      return NextResponse.json(
        { error: "Only custom foods can be edited" },
        { status: 400 },
      );
    }

    const existing = await findAccessibleFoodById(user.uid, id);
    if (!existing || existing.source !== "custom") {
      return NextResponse.json(
        { error: "Custom food not found" },
        { status: 404 },
      );
    }

    const payload = customFoodSchema.parse(await request.json());
    const servingBase = payload.servingGrams ?? 100;
    const normFactor = 100 / servingBase;

    const updatedFood: FoodItem = {
      ...existing,
      name: payload.name,
      displayName: payload.name,
      brand: payload.brand,
      barcode: payload.barcode,
      caloriesPer100: Number(((payload.caloriesPer100 ?? 0) * normFactor).toFixed(2)),
      proteinPer100: Number(((payload.proteinPer100 ?? 0) * normFactor).toFixed(2)),
      carbsPer100: Number(((payload.carbsPer100 ?? 0) * normFactor).toFixed(2)),
      fatPer100: Number(((payload.fatPer100 ?? 0) * normFactor).toFixed(2)),
      fiberPer100: Number(((payload.fiberPer100 ?? 0) * normFactor).toFixed(2)),
      sodiumPer100: Number(((payload.sodiumPer100 ?? 0) * normFactor).toFixed(2)),
      servingGrams: payload.servingGrams,
    };

    const item = await saveUserCustomFood(user.uid, updatedFood);

    return NextResponse.json({ item }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Failed to update custom food",
      unexpectedStatus: 500,
    });
  }
}
