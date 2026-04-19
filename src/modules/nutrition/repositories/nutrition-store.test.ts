import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiaryItemSnapshot, FoodItem } from "@/modules/nutrition/domain/types";
import { getNutritionMemoryStore } from "@/modules/nutrition/repositories/memory-store";
import {
  MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
  MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS,
} from "@/modules/nutrition/repositories/missing-food-lookup";
import {
  claimMissingFoodLookups,
  completeMissingFoodLookup,
  findAccessibleFoodById,
  getOrCreateDiary,
  copyDiaryItem,
  listAccessibleFoods,
  listDiaryHistory,
  listRecentConsumedFoods,
  listFoods,
  listUserCustomFoods,
  queueMissingFoodLookup,
  removeDiaryItem,
  saveUserCustomFood,
  replaceDiaryItem,
  saveDiaryItem,
  upsertFoods,
} from "@/modules/nutrition/repositories/nutrition-store";

function makeDiaryItem(id: string, diaryId: string, overrides: Partial<DiaryItemSnapshot> = {}): DiaryItemSnapshot {
  return {
    id,
    diaryId,
    foodId: "food-banana",
    foodName: "Banana",
    mealType: "breakfast",
    quantity: 1,
    unit: "unit",
    consumedAt: "2026-03-07T08:00:00.000Z",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.3,
    fiber: 3.1,
    sodium: 1,
    ...overrides,
  };
}

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

describe("nutrition-store authorization", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSupabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
  const globalStore = globalThis as typeof globalThis & {
    __nutritionStore__?: {
      cachedFoods?: Map<string, FoodItem>;
      userCustomFoods?: Map<string, FoodItem>;
      missingFoodLookups?: Map<string, unknown>;
      goals?: Map<string, unknown>;
      diaries?: Map<string, unknown>;
      mealPlans?: Map<string, unknown>;
    };
    __nutritionPool__?: {
      query: jest.Mock;
    };
    __nutritionSchemaPromise__?: Promise<void>;
  };

  beforeEach(() => {
    process.env.DATABASE_URL = "";
    process.env.SUPABASE_DATABASE_URL = "";
    delete globalStore.__nutritionPool__;
    delete globalStore.__nutritionSchemaPromise__;

    const store = getNutritionMemoryStore();
    store.cachedFoods.clear();
    store.userCustomFoods.clear();
    store.missingFoodLookups.clear();
    store.goals.clear();
    store.diaries.clear();
    store.mealPlans.clear();
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.SUPABASE_DATABASE_URL = originalSupabaseDatabaseUrl;
  });

  it("blocks cross-user diary item replacement", async () => {
    const diary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const item = makeDiaryItem("item-a", diary.id);

    await saveDiaryItem("user-a", "2026-03-07", 2000, 2200, item);

    const result = await replaceDiaryItem("user-b", "item-a", {
      ...item,
      foodName: "Tampered Banana",
      calories: 999,
    });

    expect(result).toBeNull();

    const ownerDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    expect(ownerDiary.items).toHaveLength(1);
    expect(ownerDiary.items[0]?.foodName).toBe("Banana");
    expect(ownerDiary.items[0]?.calories).toBe(105);
  });

  it("blocks cross-user diary item deletion", async () => {
    const diary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const item = makeDiaryItem("item-a", diary.id);

    await saveDiaryItem("user-a", "2026-03-07", 2000, 2200, item);

    const result = await removeDiaryItem("user-b", "item-a");

    expect(result).toBeNull();

    const ownerDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    expect(ownerDiary.items).toHaveLength(1);
    expect(ownerDiary.items[0]?.id).toBe("item-a");
  });

  it("still allows the owner to update and delete their own item", async () => {
    const diary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const item = makeDiaryItem("item-a", diary.id);

    await saveDiaryItem("user-a", "2026-03-07", 2000, 2200, item);

    const updatedDiary = await replaceDiaryItem("user-a", "item-a", {
      ...item,
      foodName: "Banana prata",
      calories: 112,
    });

    expect(updatedDiary?.items[0]?.foodName).toBe("Banana prata");
    expect(updatedDiary?.items[0]?.calories).toBe(112);

    const deletedDiary = await removeDiaryItem("user-a", "item-a");

    expect(deletedDiary?.items).toHaveLength(0);
  });

  it("copies a diary item to a target meal without changing the source item", async () => {
    const sourceDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const sourceItem = makeDiaryItem("item-a", sourceDiary.id, {
      mealType: "breakfast",
      mealLabel: "Café da manhã",
      consumedAt: "2026-03-07T08:00:00.000Z",
    });

    await saveDiaryItem("user-a", "2026-03-07", 2000, 2200, sourceItem);

    const copied = await copyDiaryItem(
      "user-a",
      "item-a",
      {
        targetDate: "2026-03-08",
        targetMealType: "lunch",
        targetMealLabel: "Almoço",
        consumedAt: "2026-03-08T12:30:00.000Z",
      },
      2100,
      2300,
    );

    expect(copied?.item.id).not.toBe("item-a");
    expect(copied?.item).toEqual(
      expect.objectContaining({
        foodId: "food-banana",
        foodName: "Banana",
        mealType: "lunch",
        mealLabel: "Almoço",
        consumedAt: "2026-03-08T12:30:00.000Z",
        calories: 105,
      }),
    );

    const refreshedSourceDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const targetDiary = await getOrCreateDiary("user-a", "2026-03-08", 2100, 2300);

    expect(refreshedSourceDiary.items).toHaveLength(1);
    expect(refreshedSourceDiary.items[0]?.id).toBe("item-a");
    expect(targetDiary.items).toHaveLength(1);
    expect(targetDiary.items[0]?.id).toBe(copied?.item.id);
  });

  it("does not copy another user's diary item", async () => {
    const sourceDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    await saveDiaryItem("user-a", "2026-03-07", 2000, 2200, makeDiaryItem("item-a", sourceDiary.id));

    const copied = await copyDiaryItem(
      "user-b",
      "item-a",
      {
        targetDate: "2026-03-08",
        targetMealType: "lunch",
        targetMealLabel: "Almoço",
      },
      2100,
      2300,
    );

    expect(copied).toBeNull();
  });

  it("lists recent consumed foods scoped by user, newest first, and deduped by food id", async () => {
    const oldDiary = await getOrCreateDiary("user-a", "2026-03-06", 2000, 2200);
    const newDiary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);
    const otherUserDiary = await getOrCreateDiary("user-b", "2026-03-07", 2000, 2200);

    await saveDiaryItem(
      "user-a",
      "2026-03-06",
      2000,
      2200,
      makeDiaryItem("old-banana", oldDiary.id, {
        foodId: "food-banana",
        foodName: "Banana antiga",
        consumedAt: "2026-03-06T08:00:00.000Z",
      }),
    );
    await saveDiaryItem(
      "user-a",
      "2026-03-07",
      2000,
      2200,
      makeDiaryItem("new-banana", newDiary.id, {
        foodId: "food-banana",
        foodName: "Banana nova",
        quantity: 2,
        consumedAt: "2026-03-07T08:00:00.000Z",
      }),
    );
    await saveDiaryItem(
      "user-a",
      "2026-03-07",
      2000,
      2200,
      makeDiaryItem("rice", newDiary.id, {
        foodId: "food-rice",
        foodName: "Arroz branco",
        mealType: "lunch",
        consumedAt: "2026-03-07T12:00:00.000Z",
      }),
    );
    await saveDiaryItem(
      "user-b",
      "2026-03-07",
      2000,
      2200,
      makeDiaryItem("other-user-food", otherUserDiary.id, {
        foodId: "food-hidden",
        foodName: "Alimento oculto",
        consumedAt: "2026-03-07T13:00:00.000Z",
      }),
    );

    const recentFoods = await listRecentConsumedFoods("user-a", { limit: 8 });

    expect(recentFoods).toEqual([
      expect.objectContaining({
        sourceItemId: "rice",
        foodId: "food-rice",
        foodName: "Arroz branco",
        lastMealType: "lunch",
      }),
      expect.objectContaining({
        sourceItemId: "new-banana",
        foodId: "food-banana",
        foodName: "Banana nova",
        quantity: 2,
      }),
    ]);
    expect(recentFoods.some((food) => food.foodId === "food-hidden")).toBe(false);
  });

  it("filters recent consumed foods by mealType when provided", async () => {
    const diary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);

    await saveDiaryItem(
      "user-a",
      "2026-03-07",
      2000,
      2200,
      makeDiaryItem("bf-banana", diary.id, {
        foodId: "food-banana",
        foodName: "Banana",
        mealType: "breakfast",
        consumedAt: "2026-03-07T08:00:00.000Z",
      }),
    );
    await saveDiaryItem(
      "user-a",
      "2026-03-07",
      2000,
      2200,
      makeDiaryItem("lunch-rice", diary.id, {
        foodId: "food-rice",
        foodName: "Arroz branco",
        mealType: "lunch",
        consumedAt: "2026-03-07T12:00:00.000Z",
      }),
    );

    const breakfastFoods = await listRecentConsumedFoods("user-a", {
      limit: 15,
      mealType: "breakfast",
    });

    expect(breakfastFoods).toHaveLength(1);
    expect(breakfastFoods[0]).toEqual(
      expect.objectContaining({
        foodId: "food-banana",
        lastMealType: "breakfast",
      }),
    );
  });

  it("accepts limit up to 15 for recent consumed foods", async () => {
    const diary = await getOrCreateDiary("user-a", "2026-03-07", 2000, 2200);

    for (let index = 0; index < 20; index += 1) {
      await saveDiaryItem(
        "user-a",
        "2026-03-07",
        2000,
        2200,
        makeDiaryItem(`bf-${index}`, diary.id, {
          foodId: `food-${index}`,
          foodName: `Alimento ${index}`,
          mealType: "breakfast",
          consumedAt: new Date(Date.UTC(2026, 2, 7, 8, index)).toISOString(),
        }),
      );
    }

    const foods = await listRecentConsumedFoods("user-a", {
      limit: 15,
      mealType: "breakfast",
    });

    expect(foods).toHaveLength(15);
  });

  it("keeps custom foods private to the owner", async () => {
    await saveUserCustomFood(
      "user-a",
      makeFood("custom-a", {
        source: "custom",
        name: "Panqueca da Ana",
        displayName: "Panqueca da Ana",
        confidenceScore: 3,
      }),
    );

    const ownerFoods = await listAccessibleFoods("user-a", { includeInternal: false });
    const otherFoods = await listAccessibleFoods("user-b", { includeInternal: false });

    expect(ownerFoods.some((food) => food.id === "custom-a")).toBe(true);
    expect(otherFoods.some((food) => food.id === "custom-a")).toBe(false);
  });

  it("does not expose custom foods through the public catalog list", async () => {
    await upsertFoods([
      makeFood("public-banana"),
      makeFood("custom-leaked", {
        source: "custom",
        sourceId: "user-a",
        confidenceScore: 3,
      }),
    ]);

    await saveUserCustomFood(
      "user-a",
      makeFood("custom-private", {
        source: "custom",
        name: "Iogurte da Ana",
        displayName: "Iogurte da Ana",
        confidenceScore: 3,
      }),
    );

    const publicFoods = await listFoods({ includeInternal: false });

    expect(publicFoods.some((food) => food.id === "public-banana")).toBe(true);
    expect(publicFoods.some((food) => food.id === "custom-leaked")).toBe(false);
    expect(publicFoods.some((food) => food.id === "custom-private")).toBe(false);
  });

  it("migrates legacy in-memory custom foods into the private store before reading them", async () => {
    const store = getNutritionMemoryStore();
    store.cachedFoods.set(
      "legacy-custom-a",
      makeFood("legacy-custom-a", {
        source: "custom",
        sourceId: "user-a",
        name: "Crepioca antiga",
        displayName: "Crepioca antiga",
        confidenceScore: 3,
      }),
    );

    const ownerFoods = await listUserCustomFoods("user-a");
    const publicFoods = await listFoods({ includeInternal: false });

    expect(ownerFoods.some((food) => food.id === "legacy-custom-a")).toBe(true);
    expect(store.userCustomFoods.has("custom-food:user-a:legacy-custom-a")).toBe(true);
    expect(store.cachedFoods.has("legacy-custom-a")).toBe(false);
    expect(publicFoods.some((food) => food.id === "legacy-custom-a")).toBe(false);
  });

  it("blocks food lookup by id for another users custom food", async () => {
    await saveUserCustomFood(
      "user-a",
      makeFood("custom-a", {
        source: "custom",
        name: "Bolo da Ana",
        displayName: "Bolo da Ana",
        confidenceScore: 3,
      }),
    );

    const ownerFood = await findAccessibleFoodById("user-a", "custom-a");
    const attackerFood = await findAccessibleFoodById("user-b", "custom-a");

    expect(ownerFood?.id).toBe("custom-a");
    expect(attackerFood).toBeNull();
  });

  it("repairs legacy in-memory store state during hot reload", () => {
    globalStore.__nutritionStore__ = {
      cachedFoods: new Map<string, FoodItem>(),
    };

    const store = getNutritionMemoryStore();

    expect(store.cachedFoods).toBeInstanceOf(Map);
    expect(store.userCustomFoods).toBeInstanceOf(Map);
    expect(store.missingFoodLookups).toBeInstanceOf(Map);
    expect(store.goals).toBeInstanceOf(Map);
    expect(store.diaries).toBeInstanceOf(Map);
    expect(store.mealPlans).toBeInstanceOf(Map);
  });

  it("dedupes repeated missing food lookups and processes the queue lifecycle", async () => {
    const firstLookup = await queueMissingFoodLookup({
      query: "Cuscuz de milho",
      reason: "search_miss",
    });
    const secondLookup = await queueMissingFoodLookup({
      query: "cuscuz   de milho",
      reason: "search_miss",
    });

    expect(secondLookup.id).toBe(firstLookup.id);

    const claimedLookups = await claimMissingFoodLookups(5);

    expect(claimedLookups).toHaveLength(1);
    expect(claimedLookups[0]?.id).toBe(firstLookup.id);
    expect(claimedLookups[0]?.status).toBe("processing");
    expect(claimedLookups[0]?.attempts).toBe(1);

    await completeMissingFoodLookup(firstLookup.id, "completed");

    const claimedAfterCompletion = await claimMissingFoodLookups(5);
    expect(claimedAfterCompletion).toHaveLength(0);
  });

  it("reclaims stale processing lookups but leaves fresh ones untouched", async () => {
    const store = getNutritionMemoryStore();
    const lookup = await queueMissingFoodLookup({
      query: "bolo de milho",
      reason: "search_miss",
    });

    const firstClaim = await claimMissingFoodLookups(5);
    expect(firstClaim).toHaveLength(1);
    expect(firstClaim[0]?.status).toBe("processing");

    store.missingFoodLookups.set(lookup.id, {
      ...firstClaim[0]!,
      status: "processing",
      processingStartedAt: new Date(Date.now() - MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS - 1_000).toISOString(),
    });

    const reclaimed = await claimMissingFoodLookups(5);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]?.attempts).toBe(2);

    store.missingFoodLookups.set(lookup.id, {
      ...reclaimed[0]!,
      status: "processing",
      processingStartedAt: new Date().toISOString(),
    });

    const notReclaimed = await claimMissingFoodLookups(5);
    expect(notReclaimed).toHaveLength(0);
  });

  it("does not claim lookups that already hit the max retry budget", async () => {
    const store = getNutritionMemoryStore();
    const lookup = await queueMissingFoodLookup({
      query: "farofa doce",
      reason: "search_miss",
    });

    store.missingFoodLookups.set(lookup.id, {
      ...lookup,
      attempts: MISSING_FOOD_LOOKUP_MAX_ATTEMPTS,
      status: "pending",
    });

    const claimed = await claimMissingFoodLookups(5);
    expect(claimed).toHaveLength(0);
  });

  it("excludes the current day from diary history in memory mode", async () => {
    const todayDiary = await getOrCreateDiary("user-a", "2026-03-15", 2000, 2200);
    const previousDiary = await getOrCreateDiary("user-a", "2026-03-14", 2000, 2200);

    await saveDiaryItem("user-a", "2026-03-15", 2000, 2200, makeDiaryItem("item-today", todayDiary.id));
    await saveDiaryItem("user-a", "2026-03-14", 2000, 2200, makeDiaryItem("item-previous", previousDiary.id));

    const history = await listDiaryHistory("user-a", {
      limit: 6,
      offset: 0,
      excludeDate: "2026-03-15",
    });

    expect(history.total).toBe(1);
    expect(history.diaries).toHaveLength(1);
    expect(history.diaries[0]?.date).toBe("2026-03-14");
  });

  it("normalizes database history rows when pg returns Date objects", async () => {
    process.env.DATABASE_URL = "postgres://example.invalid/mountrack";

    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{ count: "1" }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "diary-1",
            user_id: "user-a",
            diary_date: new Date(2026, 2, 14),
            target_calories: "2000",
            target_water_ml: "2200",
            water_intake_ml: "700",
            meal_definitions: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    globalStore.__nutritionPool__ = { query };
    globalStore.__nutritionSchemaPromise__ = Promise.resolve();

    const history = await listDiaryHistory("user-a", {
      limit: 6,
      offset: 0,
      excludeDate: "2026-03-15",
    });

    expect(history.total).toBe(1);
    expect(history.diaries).toHaveLength(1);
    expect(history.diaries[0]?.date).toBe("2026-03-14");
    expect(query).toHaveBeenCalledTimes(3);

    delete globalStore.__nutritionPool__;
    delete globalStore.__nutritionSchemaPromise__;
  });

  it("keeps nutrition schema hardening in runtime bootstrap and Supabase migration", () => {
    const runtimeSchemaSource = readFileSync(
      join(process.cwd(), "src/modules/nutrition/repositories/nutrition-store.ts"),
      "utf8",
    );
    const migrationSource = readFileSync(
      join(process.cwd(), "supabase/migrations/20260318_000003_public_rls_hardening.sql"),
      "utf8",
    );

    for (const tableName of [
      "nutrition_foods",
      "nutrition_food_sources_raw",
      "nutrition_brand_watchlist",
      "nutrition_missing_food_queue",
      "nutrition_goals",
      "nutrition_diaries",
      "nutrition_diary_items",
      "nutrition_meal_plans",
      "nutrition_user_foods_custom",
    ]) {
      expect(runtimeSchemaSource).toContain(`alter table ${tableName} enable row level security;`);
      expect(migrationSource).toContain(`alter table if exists public.${tableName} enable row level security;`);
    }
  });
});
