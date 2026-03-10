import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders, saveUserCustomFood } from "@/modules/nutrition/repositories/nutrition-store";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import { customFoodSchema } from "@/modules/nutrition/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const payload = customFoodSchema.parse(await request.json());

    const customFood: FoodItem = {
      id: `custom_${crypto.randomUUID()}`,
      source: "custom",
      name: payload.name,
      displayName: payload.name,
      brand: payload.brand,
      barcode: payload.barcode,
      caloriesPer100: payload.caloriesPer100 ?? 0,
      proteinPer100: payload.proteinPer100 ?? 0,
      carbsPer100: payload.carbsPer100 ?? 0,
      fatPer100: payload.fatPer100 ?? 0,
      fiberPer100: payload.fiberPer100 ?? 0,
      sodiumPer100: payload.sodiumPer100 ?? 0,
      confidenceScore: 3,
      mealCategories: [],
      baseUnit: "g",
      servingGrams: payload.servingGrams,
    };

    const item = await saveUserCustomFood(user.uid, customFood);

    return NextResponse.json({ item }, { status: 201, headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Failed to save custom food",
      unexpectedStatus: 500,
    });
  }
}
