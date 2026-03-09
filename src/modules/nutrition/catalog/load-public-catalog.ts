import { promises as fs } from "node:fs";
import path from "node:path";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import type { PublicCatalogDocument } from "@/modules/nutrition/catalog/public-catalog-types";

const PUBLIC_CATALOG_PATH = path.join(process.cwd(), "data", "nutrition", "catalog", "foods-public.v1.json");

const EMPTY_PUBLIC_CATALOG: PublicCatalogDocument = {
  version: "dev-empty",
  generatedAt: "",
  foods: [],
};

let publicCatalogPromise: Promise<PublicCatalogDocument> | null = null;

function sanitizePublicCatalogFood(food: Partial<FoodItem>): FoodItem | null {
  if (!food.id || !food.name) {
    return null;
  }

  return {
    id: food.id,
    source: food.source ?? "internal",
    sourceId: food.sourceId,
    name: food.name,
    displayName: food.displayName ?? food.name,
    brand: food.brand,
    barcode: food.barcode,
    baseUnit: food.baseUnit ?? "g",
    servingDescription: food.servingDescription,
    servingGrams: food.servingGrams,
    unitGrams: food.unitGrams,
    caloriesPer100: food.caloriesPer100,
    proteinPer100: food.proteinPer100,
    carbsPer100: food.carbsPer100,
    fatPer100: food.fatPer100,
    fiberPer100: food.fiberPer100,
    sodiumPer100: food.sodiumPer100,
    imageUrl: food.imageUrl,
    confidenceScore: food.confidenceScore ?? 0.8,
    completenessScore: food.completenessScore,
    locale: food.locale,
    countryCode: food.countryCode,
    isBranded: food.isBranded,
    externalUpdatedAt: food.externalUpdatedAt,
    mealCategories: food.mealCategories ?? [],
    category: food.category,
    tags: food.tags ?? [],
  };
}

async function readPublicCatalog(): Promise<PublicCatalogDocument> {
  try {
    const rawDocument = await fs.readFile(PUBLIC_CATALOG_PATH, "utf8");
    const parsedDocument = JSON.parse(rawDocument) as Partial<PublicCatalogDocument>;

    return {
      version: parsedDocument.version ?? EMPTY_PUBLIC_CATALOG.version,
      generatedAt: parsedDocument.generatedAt ?? EMPTY_PUBLIC_CATALOG.generatedAt,
      foods: Array.isArray(parsedDocument.foods)
        ? parsedDocument.foods
            .map((food) => sanitizePublicCatalogFood(food))
            .filter((food): food is FoodItem => Boolean(food))
        : [],
    };
  } catch {
    return EMPTY_PUBLIC_CATALOG;
  }
}

export async function loadPublicCatalog(): Promise<PublicCatalogDocument> {
  publicCatalogPromise ??= readPublicCatalog();
  return publicCatalogPromise;
}

export async function listPublicCatalogFoods(): Promise<FoodItem[]> {
  const catalog = await loadPublicCatalog();
  return catalog.foods;
}

export function clearPublicCatalogCache(): void {
  publicCatalogPromise = null;
}
