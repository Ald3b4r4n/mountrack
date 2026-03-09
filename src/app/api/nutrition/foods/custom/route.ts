import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { getNutritionStorageHeaders, saveUserCustomFood } from "@/modules/nutrition/repositories/nutrition-store";
import type { FoodItem } from "@/modules/nutrition/domain/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const body = await request.json();

    if (!body || typeof body !== "object" || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customFood: FoodItem = {
      id: `custom_${crypto.randomUUID()}`,
      source: "custom",
      name: body.name,
      displayName: body.name,
      brand: body.brand || undefined,
      barcode: body.barcode || undefined,
      caloriesPer100: body.caloriesPer100,
      proteinPer100: body.proteinPer100,
      carbsPer100: body.carbsPer100,
      fatPer100: body.fatPer100,
      fiberPer100: body.fiberPer100,
      sodiumPer100: body.sodiumPer100,
      confidenceScore: 3,
      mealCategories: [],
      baseUnit: "g",
      servingGrams: body.servingGrams || undefined,
    };

    const item = await saveUserCustomFood(user.uid, customFood);

    return NextResponse.json({ item }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Failed to save custom food",
      unexpectedStatus: 500,
    });
  }
}
