import { NextResponse } from "next/server";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { toNutritionRouteErrorResponse } from "@/modules/nutrition/http/route-error";
import { upsertFoods, getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import type { FoodItem } from "@/modules/nutrition/domain/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireNutritionUser(request);
    const body = await request.json();

    if (!body || typeof body !== "object" || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const {
      name,
      brand,
      barcode,
      caloriesPer100,
      proteinPer100,
      carbsPer100,
      fatPer100,
      servingGrams,
    } = body;

    const customFood: FoodItem = {
      id: `custom_${crypto.randomUUID()}`,
      source: "custom",
      sourceId: user.uid, // Vincular alimento customizado ao usuario
      name: name,
      displayName: name,
      brand: brand || undefined,
      barcode: barcode || undefined,
      caloriesPer100: caloriesPer100,
      proteinPer100: proteinPer100,
      fatPer100: fatPer100,
      confidenceScore: 3, // Custom food has high confidence by default
      mealCategories: [],
      baseUnit: "g", // os alimentos customizados vao usar gramas como base padrão
      servingGrams: servingGrams || undefined,
    };

    await upsertFoods([customFood]);

    return NextResponse.json({ item: customFood }, { headers: getNutritionStorageHeaders() });
  } catch (error) {
    return toNutritionRouteErrorResponse(error, {
      defaultMessage: "Failed to save custom food",
      unexpectedStatus: 500,
    });
  }
}
