import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  type MissingFoodLookupRecord,
} from "@/modules/nutrition/repositories/missing-food-lookup";
import {
  enrichMissingFoodLookup,
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
import { searchOpenFoodFacts } from "@/modules/nutrition/providers/open-food-facts";
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
const mockedSearchOpenFoodFacts = jest.mocked(searchOpenFoodFacts);
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

function makeLookup(overrides: Partial<MissingFoodLookupRecord> = {}): MissingFoodLookupRecord {
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
    mockedSearchOpenFoodFacts.mockReset();
    mockedSearchUsdaFoods.mockReset();

    mockedClaimMissingFoodLookups.mockResolvedValue([]);
    mockedCompleteMissingFoodLookup.mockResolvedValue(undefined);
    mockedListAccessibleFoods.mockResolvedValue([]);
    mockedListFoods.mockResolvedValue([]);
    mockedListUserCustomFoods.mockResolvedValue([]);
    mockedQueueMissingFoodLookup.mockResolvedValue(makeLookup());
    mockedRetryMissingFoodLookup.mockResolvedValue(undefined);
    mockedUpsertFoods.mockResolvedValue(undefined);
    mockedSearchOpenFoodFacts.mockResolvedValue([]);
    mockedSearchUsdaFoods.mockResolvedValue([]);
  });

  it("returns strong local hits without waiting on external providers", async () => {
    mockedListAccessibleFoods.mockResolvedValue([
      makeFood("custom-persistencia", {
        source: "custom",
        name: "Zz Persistencia Privada 2026",
        displayName: "Zz Persistencia Privada 2026",
        confidenceScore: 3,
      }),
    ]);

    const result = await searchNutritionCatalog("user-a", "Zz Persistencia Privada 2026");

    expect(result.source).toBe("custom");
    expect(result.externalPending).toBe(false);
    expect(result.results[0]?.id).toBe("custom-persistencia");
    expect(mockedSearchOpenFoodFacts).not.toHaveBeenCalled();
    expect(mockedSearchUsdaFoods).not.toHaveBeenCalled();
  });

  it("returns immediately with external pending when local results are absent", async () => {
    const result = await searchNutritionCatalog("user-a", "cuscuz de milho");

    expect(result.results).toEqual([]);
    expect(result.source).toBe("none");
    expect(result.externalPending).toBe(true);
    expect(mockedQueueMissingFoodLookup).toHaveBeenCalledWith({
      query: "cuscuz de milho",
      reason: "search_miss",
    });
    expect(mockedSearchOpenFoodFacts).not.toHaveBeenCalled();
    expect(mockedSearchUsdaFoods).not.toHaveBeenCalled();
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

  it("enriches queued query lookups through external providers", async () => {
    mockedSearchOpenFoodFacts.mockResolvedValue([
      makeFood("off-cuscuz", {
        source: "openfoodfacts",
        name: "Cuscuz de milho",
        displayName: "Cuscuz de milho",
      }),
    ]);

    const queuedLookup = makeLookup({ status: "processing", attempts: 1, updatedAt: "2026-03-09T10:01:00.000Z" });
    const result = await enrichMissingFoodLookup(queuedLookup);

    expect(mockedSearchOpenFoodFacts).toHaveBeenCalledWith("cuscuz de milho");
    expect(mockedSearchUsdaFoods).toHaveBeenCalledWith("cuscuz de milho");
    expect(mockedUpsertFoods).toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.insertedCount).toBe(1);
  });

  it("requeues transient failures before the retry budget is exhausted", async () => {
    mockedClaimMissingFoodLookups.mockResolvedValue([
      makeLookup({
        status: "processing",
        attempts: 1,
        updatedAt: "2026-03-09T10:01:00.000Z",
      }),
    ]);
    mockedSearchOpenFoodFacts.mockRejectedValue(new Error("Temporary OFF outage"));

    const result = await processQueuedFoodLookups(5);

    expect(mockedRetryMissingFoodLookup).toHaveBeenCalledWith("lookup-1", "Temporary OFF outage");
    expect(mockedCompleteMissingFoodLookup).not.toHaveBeenCalledWith("lookup-1", "failed", expect.anything());
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
    mockedSearchOpenFoodFacts.mockRejectedValue(new Error("Persistent OFF outage"));

    const result = await processQueuedFoodLookups(5);

    expect(mockedRetryMissingFoodLookup).not.toHaveBeenCalled();
    expect(mockedCompleteMissingFoodLookup).toHaveBeenCalledWith("lookup-1", "failed", "Persistent OFF outage");
    expect(mockedUpsertFoods).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
  });
});
