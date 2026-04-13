import type { FoodItem } from "@/modules/nutrition/domain/types";
import { inferFoodClassification } from "@/modules/nutrition/normalizers/infer-food-classification";

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  generic_name?: string;
  generic_name_pt?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  serving_size?: string;
  quantity?: string;
  countries_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
  categories_tags?: string[];
  last_modified_t?: number;
}

interface UsdaFoodSearchItem {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  gtinUpc?: string;
  dataType?: string;
  foodNutrients?: Array<{
    nutrientName?: string;
    value?: number;
    unitName?: string;
  }>;
  publicationDate?: string;
}

type FatSecretScalar =
  | string
  | number
  | {
      value?: string | number;
    };

interface FatSecretFoodCandidate {
  food_id?: FatSecretScalar;
  food_name?: FatSecretScalar;
  food_type?: FatSecretScalar;
  brand_name?: FatSecretScalar;
  food_url?: FatSecretScalar;
  barcode?: FatSecretScalar;
  serving_description?: FatSecretScalar;
  servings?: {
    serving?:
      | {
          metric_serving_amount?: FatSecretScalar;
          metric_serving_unit?: FatSecretScalar;
          calories?: FatSecretScalar;
          protein?: FatSecretScalar;
          carbohydrate?: FatSecretScalar;
          fat?: FatSecretScalar;
          fiber?: FatSecretScalar;
          sodium?: FatSecretScalar;
        }
      | Array<{
          metric_serving_amount?: FatSecretScalar;
          metric_serving_unit?: FatSecretScalar;
          calories?: FatSecretScalar;
          protein?: FatSecretScalar;
          carbohydrate?: FatSecretScalar;
          fat?: FatSecretScalar;
          fiber?: FatSecretScalar;
          sodium?: FatSecretScalar;
        }>;
  };
  food_description?: FatSecretScalar;
}

export interface FatSecretFoodContext {
  locale?: string;
  countryCode?: string;
}

function readFatSecretScalar(
  value: FatSecretScalar | undefined,
): string | number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "object") {
    return value.value;
  }

  return value;
}

function toText(value: FatSecretScalar | undefined): string | undefined {
  const scalar = readFatSecretScalar(value);
  if (scalar === undefined || scalar === null) {
    return undefined;
  }

  const text = String(scalar).trim();
  return text || undefined;
}

function toNumber(value: FatSecretScalar | undefined): number | undefined {
  const scalar = readFatSecretScalar(value);
  if (scalar === undefined || scalar === null || scalar === "") {
    return undefined;
  }

  const parsed = Number(scalar);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function repairMojibake(value: string | undefined): string | undefined {
  if (!value) return value;
  if (!/[ÃÂâ€]/.test(value)) {
    return value;
  }

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function pickOpenFoodFactsName(
  product: OpenFoodFactsProduct,
): string | undefined {
  return repairMojibake(
    product.product_name_pt ||
      product.product_name ||
      product.generic_name_pt ||
      product.generic_name,
  );
}

function parseServingGrams(servingSize?: string): number | undefined {
  if (!servingSize) return undefined;
  const match = servingSize
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s?(g|ml)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function completenessScoreFromFood(food: Partial<FoodItem>): number {
  const fields = [
    food.caloriesPer100,
    food.proteinPer100,
    food.carbsPer100,
    food.fatPer100,
    food.fiberPer100,
    food.sodiumPer100,
  ];

  return Number(
    (
      fields.filter((value) => value !== undefined).length / fields.length
    ).toFixed(2),
  );
}

function readUsdaNutrient(
  nutrients: UsdaFoodSearchItem["foodNutrients"] = [],
  names: string[],
): number | undefined {
  const nutrient = nutrients.find(
    (item) => item.nutrientName && names.includes(item.nutrientName),
  );
  return nutrient?.value;
}

function readFatSecretServing(food: FatSecretFoodCandidate): {
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fiberPer100?: number;
  sodiumPer100?: number;
  servingDescription?: string;
  servingGrams?: number;
} {
  const servingPayload = food.servings?.serving;
  const serving = Array.isArray(servingPayload)
    ? (servingPayload.find(
        (item) =>
          (toText(item.metric_serving_unit) ?? "").toLowerCase() === "g",
      ) ?? servingPayload[0])
    : servingPayload;

  if (serving) {
    const metricServingAmount = toNumber(serving.metric_serving_amount);
    const scale =
      metricServingAmount && metricServingAmount > 0
        ? 100 / metricServingAmount
        : 1;

    return {
      caloriesPer100:
        toNumber(serving.calories) != null
          ? Number((Number(serving.calories) * scale).toFixed(2))
          : undefined,
      proteinPer100:
        toNumber(serving.protein) != null
          ? Number((Number(serving.protein) * scale).toFixed(2))
          : undefined,
      carbsPer100:
        toNumber(serving.carbohydrate) != null
          ? Number((Number(serving.carbohydrate) * scale).toFixed(2))
          : undefined,
      fatPer100:
        toNumber(serving.fat) != null
          ? Number((Number(serving.fat) * scale).toFixed(2))
          : undefined,
      fiberPer100:
        toNumber(serving.fiber) != null
          ? Number((Number(serving.fiber) * scale).toFixed(2))
          : undefined,
      sodiumPer100:
        toNumber(serving.sodium) != null
          ? Number((Number(serving.sodium) * scale).toFixed(2))
          : undefined,
      servingDescription: toText(food.serving_description),
      servingGrams: metricServingAmount,
    };
  }

  const description = toText(food.food_description) ?? "";
  const macroMatch = description.match(
    /Calories:\s*([\d.,]+)kcal\s*\|\s*Fat:\s*([\d.,]+)g\s*\|\s*Carbs:\s*([\d.,]+)g\s*\|\s*Protein:\s*([\d.,]+)g/i,
  );

  if (!macroMatch) {
    return {};
  }

  const calories = Number(macroMatch[1].replace(",", "."));
  const fat = Number(macroMatch[2].replace(",", "."));
  const carbs = Number(macroMatch[3].replace(",", "."));
  const protein = Number(macroMatch[4].replace(",", "."));

  if (![calories, fat, carbs, protein].every(Number.isFinite)) {
    return {};
  }

  return {
    caloriesPer100: calories,
    fatPer100: fat,
    carbsPer100: carbs,
    proteinPer100: protein,
  };
}

export function normalizeOpenFoodFactsProduct(
  product: OpenFoodFactsProduct,
): FoodItem | null {
  const name = pickOpenFoodFactsName(product);
  if (!name) return null;

  const tags = [
    "industrializado",
    ...(product.categories_tags ?? []).map((tag) => repairMojibake(tag) ?? tag),
  ];
  const classification = inferFoodClassification(name, tags);
  const countryCode = product.countries_tags?.some((tag) =>
    /brazil|brasil/i.test(tag),
  )
    ? "BR"
    : undefined;
  const locale =
    product.product_name_pt || product.generic_name_pt ? "pt-BR" : undefined;

  const food: FoodItem = {
    id: `off-${product.code ?? name.toLowerCase().replace(/\s+/g, "-")}`,
    source: "openfoodfacts",
    sourceId: product.code,
    name,
    displayName: name,
    brand: repairMojibake(product.brands?.split(",")[0]?.trim()),
    barcode: product.code,
    baseUnit: "g",
    servingDescription: product.serving_size,
    servingGrams: parseServingGrams(product.serving_size),
    caloriesPer100: toNumber(product.nutriments?.["energy-kcal_100g"]),
    proteinPer100: toNumber(product.nutriments?.proteins_100g),
    carbsPer100: toNumber(product.nutriments?.carbohydrates_100g),
    fatPer100: toNumber(product.nutriments?.fat_100g),
    fiberPer100: toNumber(product.nutriments?.fiber_100g),
    sodiumPer100: toNumber(product.nutriments?.sodium_100g),
    imageUrl: product.image_front_url ?? product.image_url,
    confidenceScore: countryCode === "BR" ? 0.9 : 0.78,
    locale,
    countryCode,
    isBranded: true,
    externalUpdatedAt: product.last_modified_t
      ? new Date(product.last_modified_t * 1000).toISOString()
      : undefined,
    ...classification,
  };

  food.completenessScore = completenessScoreFromFood(food);
  return food;
}

export function normalizeUsdaFood(food: UsdaFoodSearchItem): FoodItem | null {
  const name = repairMojibake(food.description?.trim());
  if (!name || !food.fdcId) return null;

  const classification = inferFoodClassification(name, [
    repairMojibake(food.brandOwner ?? "") ?? "",
    repairMojibake(food.dataType ?? "") ?? "",
  ]);
  const normalizedFood: FoodItem = {
    id: `usda-${food.fdcId}`,
    source: "usda",
    sourceId: String(food.fdcId),
    name,
    displayName: name,
    brand: repairMojibake(food.brandOwner?.trim()) || undefined,
    barcode: food.gtinUpc?.trim() || undefined,
    baseUnit: "g",
    caloriesPer100: readUsdaNutrient(food.foodNutrients, ["Energy"]),
    proteinPer100: readUsdaNutrient(food.foodNutrients, ["Protein"]),
    carbsPer100: readUsdaNutrient(food.foodNutrients, [
      "Carbohydrate, by difference",
    ]),
    fatPer100: readUsdaNutrient(food.foodNutrients, ["Total lipid (fat)"]),
    fiberPer100: readUsdaNutrient(food.foodNutrients, ["Fiber, total dietary"]),
    sodiumPer100: readUsdaNutrient(food.foodNutrients, ["Sodium, Na"]),
    confidenceScore: 0.62,
    locale: "en-US",
    countryCode: "US",
    isBranded: /branded/i.test(food.dataType ?? ""),
    externalUpdatedAt: food.publicationDate,
    ...classification,
  };

  normalizedFood.completenessScore = completenessScoreFromFood(normalizedFood);
  return normalizedFood;
}

export function normalizeFatSecretFood(
  food: FatSecretFoodCandidate,
  context: FatSecretFoodContext = {},
): FoodItem | null {
  const name = repairMojibake(toText(food.food_name));
  const sourceId = toText(food.food_id) ?? "";

  if (!name || !sourceId) {
    return null;
  }

  const macros = readFatSecretServing(food);
  const tags = [
    repairMojibake(toText(food.food_type) ?? "") ?? "",
    "fatsecret",
  ].filter(Boolean);
  const classification = inferFoodClassification(name, tags);

  const normalizedFood: FoodItem = {
    id: `fatsecret-${sourceId}`,
    source: "fatsecret",
    sourceId,
    name,
    displayName: name,
    brand: repairMojibake(toText(food.brand_name)) || undefined,
    barcode: toText(food.barcode) || undefined,
    baseUnit: "g",
    servingDescription: macros.servingDescription,
    servingGrams: macros.servingGrams,
    caloriesPer100: macros.caloriesPer100,
    proteinPer100: macros.proteinPer100,
    carbsPer100: macros.carbsPer100,
    fatPer100: macros.fatPer100,
    fiberPer100: macros.fiberPer100,
    sodiumPer100: macros.sodiumPer100,
    confidenceScore: 0.88,
    ...(context.locale ? { locale: context.locale } : {}),
    ...(context.countryCode ? { countryCode: context.countryCode } : {}),
    isBranded: Boolean(toText(food.brand_name)),
    ...classification,
  };

  normalizedFood.completenessScore = completenessScoreFromFood(normalizedFood);
  return normalizedFood;
}
