import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  type MissingFoodLookupRecord,
} from "@/modules/nutrition/repositories/missing-food-lookup";
import {
  enrichMissingFoodLookup,
  lookupNutritionBarcode,
  processQueuedFoodLookups,
  searchNutritionCatalog,
} from "@/modules/nutrition/services/catalog-search.service";
import {
  claimMissingFoodLookups,
  completeMissingFoodLookup,
  listAccessibleFoods,
  listFoods,
  listUserCustomFoods,
  queueMissingFoodLookup,
  retryMissingFoodLookup,
  upsertFoods,
} from "@/modules/nutrition/repositories/nutrition-store";
import {
  fetchOpenFoodFactsBarcode,
  searchOpenFoodFacts,
} from "@/modules/nutrition/providers/open-food-facts";
import {
  fetchFatSecretBarcode,
  searchFatSecretFoods,
} from "@/modules/nutrition/providers/fatsecret";
import { searchUsdaFoods } from "@/modules/nutrition/providers/usda-food-data";

jest.mock("@/modules/nutrition/data/supplement-foods", () => ({
  SUPPLEMENT_FOODS: [],
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  claimMissingFoodLookups: jest.fn(),
  completeMissingFoodLookup: jest.fn(),
  listAccessibleFoods: jest.fn(),
  listFoods: jest.fn(),
  listUserCustomFoods: jest.fn(),
  queueMissingFoodLookup: jest.fn(),
  retryMissingFoodLookup: jest.fn(),
  upsertFoods: jest.fn(),
}));

jest.mock("@/modules/nutrition/providers/open-food-facts", () => ({
  fetchOpenFoodFactsBarcode: jest.fn(),
  searchOpenFoodFacts: jest.fn(),
}));

jest.mock("@/modules/nutrition/providers/fatsecret", () => ({
  fetchFatSecretBarcode: jest.fn(),
  searchFatSecretFoods: jest.fn(),
}));

jest.mock("@/modules/nutrition/providers/usda-food-data", () => ({
  searchUsdaFoods: jest.fn(),
}));

const mockedClaimMissingFoodLookups = jest.mocked(claimMissingFoodLookups);
const mockedCompleteMissingFoodLookup = jest.mocked(completeMissingFoodLookup);
const mockedListAccessibleFoods = jest.mocked(listAccessibleFoods);
const mockedListFoods = jest.mocked(listFoods);
const mockedListUserCustomFoods = jest.mocked(listUserCustomFoods);
const mockedQueueMissingFoodLookup = jest.mocked(queueMissingFoodLookup);
const mockedRetryMissingFoodLookup = jest.mocked(retryMissingFoodLookup);
const mockedUpsertFoods = jest.mocked(upsertFoods);
const mockedFetchOpenFoodFactsBarcode = jest.mocked(fetchOpenFoodFactsBarcode);
const mockedSearchOpenFoodFacts = jest.mocked(searchOpenFoodFacts);
const mockedFetchFatSecretBarcode = jest.mocked(fetchFatSecretBarcode);
const mockedSearchFatSecretFoods = jest.mocked(searchFatSecretFoods);
const mockedSearchUsdaFoods = jest.mocked(searchUsdaFoods);

function makeFood(id: string, overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id,
    source: "internal",
    name: "Banana",
    displayName: "Banana",
    baseUnit: "g",
    caloriesPer100: 89,
    proteinPer100: 1.1,
    carbsPer100: 22.8,
    fatPer100: 0.3,
    confidenceScore: 1,
    mealCategories: [],
    ...overrides,
  };
}

function makeLookup(
  overrides: Partial<MissingFoodLookupRecord> = {},
): MissingFoodLookupRecord {
  return {
    id: "lookup-1",
    query: "cuscuz de milho",
    reason: "search_miss",
    status: "pending",
    attempts: 0,
    createdAt: "2026-03-09T10:00:00.000Z",
    updatedAt: "2026-03-09T10:00:00.000Z",
    processedAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("catalog search service", () => {
  beforeEach(() => {
    mockedClaimMissingFoodLookups.mockReset();
    mockedCompleteMissingFoodLookup.mockReset();
    mockedListAccessibleFoods.mockReset();
    mockedListFoods.mockReset();
    mockedListUserCustomFoods.mockReset();
    mockedQueueMissingFoodLookup.mockReset();
    mockedRetryMissingFoodLookup.mockReset();
    mockedUpsertFoods.mockReset();
    mockedFetchOpenFoodFactsBarcode.mockReset();
    mockedSearchOpenFoodFacts.mockReset();
    mockedFetchFatSecretBarcode.mockReset();
    mockedSearchFatSecretFoods.mockReset();
    mockedSearchUsdaFoods.mockReset();

    mockedClaimMissingFoodLookups.mockResolvedValue([]);
    mockedCompleteMissingFoodLookup.mockResolvedValue(undefined);
    mockedListAccessibleFoods.mockResolvedValue([]);
    mockedListFoods.mockResolvedValue([]);
    mockedListUserCustomFoods.mockResolvedValue([]);
    mockedQueueMissingFoodLookup.mockResolvedValue(makeLookup());
    mockedRetryMissingFoodLookup.mockResolvedValue(undefined);
    mockedUpsertFoods.mockResolvedValue(undefined);
    mockedFetchOpenFoodFactsBarcode.mockResolvedValue(null);
    mockedSearchOpenFoodFacts.mockResolvedValue([]);
    mockedFetchFatSecretBarcode.mockResolvedValue(null);
    mockedSearchFatSecretFoods.mockResolvedValue([]);
    mockedSearchUsdaFoods.mockResolvedValue([]);
  });

  it("uses FatSecret as primary source when it returns results", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-banana", {
        source: "fatsecret",
        name: "Banana Prata",
        displayName: "Banana Prata",
        confidenceScore: 1.8,
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "banana prata");

    expect(result.results[0]?.id).toBe("fatsecret-banana");
    expect(result.source).toBe("fatsecret-primary");
    expect(mockedSearchFatSecretFoods).toHaveBeenCalledWith("banana prata");
  });

  it("returns current FatSecret results when source filter is fatsecret", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-feijao", {
        source: "fatsecret",
        name: "Feijao carioca cozido",
        displayName: "Feijao carioca cozido",
        confidenceScore: 1.6,
      }),
    ]);

    const result = await searchNutritionCatalog(
      "user-a",
      "feijao",
      "fatsecret",
    );

    expect(result.source).toBe("fatsecret-primary");
    expect(result.results.map((item) => item.id)).toContain("fatsecret-feijao");
  });

  it("applies meal context ranking when searching local catalog", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([]);
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-ovos-mexidos", {
        source: "internal",
        name: "Ovos mexidos",
        displayName: "Ovos mexidos",
        confidenceScore: 0.95,
        mealCategories: ["breakfast"],
      }),
      makeFood("local-ovos-cozidos", {
        source: "internal",
        name: "Ovos cozidos",
        displayName: "Ovos cozidos",
        confidenceScore: 1.05,
        mealCategories: ["dinner"],
      }),
    ]);

    const result = await searchNutritionCatalog(
      "user-a",
      "ovos",
      "all",
      "breakfast",
    );

    expect(result.results[0]?.id).toBe("local-ovos-mexidos");
  });

  it("falls back to raw FatSecret candidates when ranking removes every item", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-raw-only", {
        source: "fatsecret",
        name: "Bean cooked",
        displayName: "Bean cooked",
        confidenceScore: 0.8,
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "feijao");

    expect(result.source).toBe("fatsecret-primary");
    expect(result.results.map((item) => item.id)).toContain(
      "fatsecret-raw-only",
    );
  });

  it("does not append unrelated FatSecret candidates when local ranked results already exist", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-rice", {
        source: "fatsecret",
        name: "Rice Vermicelli",
        displayName: "Rice Vermicelli",
      }),
    ]);
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-feijao", {
        source: "internal",
        name: "Feijao carioca cozido",
        displayName: "Feijao carioca cozido",
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "feijao");

    expect(result.results.map((item) => item.id)).toContain("local-feijao");
    expect(result.results.map((item) => item.id)).not.toContain(
      "fatsecret-rice",
    );
  });

  it("appends loosely relevant FatSecret candidates when local ranking dominates multi-token query", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-feijao", {
        source: "fatsecret",
        name: "Feijao",
        displayName: "Feijao",
      }),
    ]);
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-feijao-corda", {
        source: "internal",
        name: "Feijao de corda cozido",
        displayName: "Feijao de corda cozido",
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "feijao de corda");

    expect(result.results.map((item) => item.id)).toContain(
      "local-feijao-corda",
    );
    expect(result.results.map((item) => item.id)).toContain("fatsecret-feijao");
  });

  it("treats english bean aliases as relevant for portuguese feijao query", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-black-beans", {
        source: "fatsecret",
        name: "Black Beans",
        displayName: "Black Beans",
      }),
    ]);
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-feijao-1", {
        source: "internal",
        name: "Feijao carioca cozido",
        displayName: "Feijao carioca cozido",
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "feijao");

    expect(result.results.map((item) => item.id)).toContain(
      "fatsecret-black-beans",
    );
  });

  it("returns more than 8 merged results when available", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) =>
        makeFood(`fatsecret-item-${index + 1}`, {
          source: "fatsecret",
          name: `Frango item ${index + 1}`,
          displayName: `Frango item ${index + 1}`,
          confidenceScore: 1.8,
        }),
      ),
    );
    mockedListAccessibleFoods.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) =>
        makeFood(`local-item-${index + 1}`, {
          source: "internal",
          name: `Frango local ${index + 1}`,
          displayName: `Frango local ${index + 1}`,
          confidenceScore: 1.2,
        }),
      ),
    );

    const result = await searchNutritionCatalog("user-a", "frango");

    expect(result.results.length).toBeGreaterThan(8);
    expect(result.results.length).toBe(22);
  });

  it("returns strong local hits when external sources are empty", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("custom-persistencia", {
        source: "custom",
        name: "Zz Persistencia Privada 2026",
        displayName: "Zz Persistencia Privada 2026",
        confidenceScore: 3,
      }),
    ]);

    const result = await searchNutritionCatalog(
      "user-a",
      "Zz Persistencia Privada 2026",
    );

    expect(result.source).toBe("custom");
    expect(result.externalPending).toBe(false);
    expect(result.results[0]?.id).toBe("custom-persistencia");
    expect(mockedSearchFatSecretFoods).toHaveBeenCalled();
  });

  it("returns external pending when all providers miss", async () => {
    const result = await searchNutritionCatalog("user-a", "cuscuz de milho");

    expect(result.results).toEqual([]);
    expect(result.source).toBe("none");
    expect(result.externalPending).toBe(true);
    expect(mockedQueueMissingFoodLookup).toHaveBeenCalledWith({
      query: "cuscuz de milho",
      reason: "search_miss",
    });
    expect(mockedSearchFatSecretFoods).toHaveBeenCalled();
    expect(mockedSearchOpenFoodFacts).toHaveBeenCalled();
    expect(mockedSearchUsdaFoods).toHaveBeenCalled();
  });

  it("returns did-you-mean suggestions when query has a near-miss typo", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-feijao-carioca", {
        source: "internal",
        name: "Feijao carioca cozido",
        displayName: "Feijao carioca cozido",
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "fejao", "fatsecret");

    expect(result.results).toHaveLength(0);
    expect(result.didYouMean?.length).toBeGreaterThan(0);
    expect(result.didYouMean?.[0]?.toLowerCase()).toContain("feijao");
  });

  it("labels tbca foods as catalog results when they are already local", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("tbca-cuscuz", {
        source: "tbca",
        name: "Cuscuz, de milho, cozido com sal",
        displayName: "Cuscuz, de milho, cozido com sal",
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "cuscuz de milho");

    expect(result.source).toBe("catalog");
    expect(result.externalPending).toBe(false);
  });

  it("matches stored foods when the scanner returns a GTIN-14 variant", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("leite-condensado", {
        barcode: "7891000100103",
        name: "Leite Condensado",
        displayName: "Leite Condensado",
      }),
    ]);

    const result = await lookupNutritionBarcode("user-a", "07891000100103");

    expect(result.item?.id).toBe("leite-condensado");
    expect(result.source).toBe("catalog");
    expect(mockedFetchFatSecretBarcode).toHaveBeenCalled();
    expect(mockedFetchOpenFoodFactsBarcode).toHaveBeenCalled();
  });

  it("matches stored foods when scanner returns UPC-A and catalog stores EAN-13", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("whey-1kg", {
        barcode: "0789100010010",
        name: "Whey Protein 1kg",
        displayName: "Whey Protein 1kg",
      }),
    ]);

    const result = await lookupNutritionBarcode("user-a", "789100010010");

    expect(result.item?.id).toBe("whey-1kg");
    expect(result.source).toBe("catalog");
    expect(mockedFetchFatSecretBarcode).toHaveBeenCalled();
    expect(mockedFetchOpenFoodFactsBarcode).toHaveBeenCalled();
  });

  it("checks Open Food Facts before local catalog when FatSecret misses barcode", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("local-late-hit", {
        barcode: "7893596226205",
        name: "Item Local",
        displayName: "Item Local",
      }),
    ]);
    mockedFetchOpenFoodFactsBarcode.mockResolvedValue(
      makeFood("off-hit", {
        source: "openfoodfacts",
        barcode: "7893596226205",
        name: "Item OFF",
        displayName: "Item OFF",
      }),
    );

    const result = await lookupNutritionBarcode("user-a", "7893596226205");

    expect(result.item?.id).toBe("off-hit");
    expect(result.source).toBe("openfoodfacts");
    expect(mockedFetchFatSecretBarcode).toHaveBeenCalled();
    expect(mockedListFoods).not.toHaveBeenCalled();
  });

  it("returns FatSecret barcode match before other providers", async () => {
    mockedFetchFatSecretBarcode.mockResolvedValue(
      makeFood("fatsecret-barcode-hit", {
        source: "fatsecret",
        barcode: "7893596226205",
        name: "Item FatSecret",
        displayName: "Item FatSecret",
      }),
    );

    const result = await lookupNutritionBarcode("user-a", "7893596226205");

    expect(result.item?.id).toBe("fatsecret-barcode-hit");
    expect(result.source).toBe("fatsecret");
    expect(mockedFetchOpenFoodFactsBarcode).not.toHaveBeenCalled();
  });

  it("enriches queued query lookups through external providers", async () => {
    mockedSearchFatSecretFoods.mockResolvedValue([
      makeFood("fatsecret-cuscuz", {
        source: "fatsecret",
        name: "Cuscuz de milho (FatSecret)",
        displayName: "Cuscuz de milho (FatSecret)",
      }),
    ]);
    mockedSearchOpenFoodFacts.mockResolvedValue([
      makeFood("off-cuscuz", {
        source: "openfoodfacts",
        name: "Cuscuz de milho",
        displayName: "Cuscuz de milho",
      }),
    ]);

    const queuedLookup = makeLookup({
      status: "processing",
      attempts: 1,
      updatedAt: "2026-03-09T10:01:00.000Z",
    });
    const result = await enrichMissingFoodLookup(queuedLookup);

    expect(mockedSearchFatSecretFoods).toHaveBeenCalledWith("cuscuz de milho");
    expect(mockedSearchOpenFoodFacts).toHaveBeenCalledWith("cuscuz de milho");
    expect(mockedSearchUsdaFoods).toHaveBeenCalledWith("cuscuz de milho");
    expect(mockedUpsertFoods).toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.insertedCount).toBe(2);
  });

  it("requeues transient failures before the retry budget is exhausted", async () => {
    mockedClaimMissingFoodLookups.mockResolvedValue([
      makeLookup({
        status: "processing",
        attempts: 1,
        updatedAt: "2026-03-09T10:01:00.000Z",
      }),
    ]);
    mockedSearchOpenFoodFacts.mockRejectedValue(
      new Error("Temporary OFF outage"),
    );

    const result = await processQueuedFoodLookups(5);

    expect(mockedRetryMissingFoodLookup).toHaveBeenCalledWith(
      "lookup-1",
      "Temporary OFF outage",
    );
    expect(mockedCompleteMissingFoodLookup).not.toHaveBeenCalledWith(
      "lookup-1",
      "failed",
      expect.anything(),
    );
    expect(result.retried).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("marks lookup as failed after the retry budget is exhausted", async () => {
    mockedClaimMissingFoodLookups.mockResolvedValue([
      makeLookup({
        status: "processing",
        attempts: MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
        updatedAt: "2026-03-09T10:01:00.000Z",
      }),
    ]);
    mockedSearchOpenFoodFacts.mockRejectedValue(
      new Error("Persistent OFF outage"),
    );

    const result = await processQueuedFoodLookups(5);

    expect(mockedRetryMissingFoodLookup).not.toHaveBeenCalled();
    expect(mockedCompleteMissingFoodLookup).toHaveBeenCalledWith(
      "lookup-1",
      "failed",
      "Persistent OFF outage",
    );
    expect(mockedUpsertFoods).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
  });
});
