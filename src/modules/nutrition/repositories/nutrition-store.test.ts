import type { DiaryItemSnapshot } from "@/modules/nutrition/domain/types";
import { getNutritionMemoryStore } from "@/modules/nutrition/repositories/memory-store";
import {
  getOrCreateDiary,
  removeDiaryItem,
  replaceDiaryItem,
  saveDiaryItem,
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

describe("nutrition-store authorization", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSupabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = "";
    process.env.SUPABASE_DATABASE_URL = "";

    const store = getNutritionMemoryStore();
    store.cachedFoods.clear();
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
});
