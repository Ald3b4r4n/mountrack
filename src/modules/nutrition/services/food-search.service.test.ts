import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { searchFoodsByQuery } from "@/modules/nutrition/services/food-search.service";

describe("food search service", () => {
  it("ranks exact textual matches before looser matches", async () => {
    const results = await searchFoodsByQuery("banana", {
      internalFoods: INTERNAL_FOODS,
      externalResults: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name.toLowerCase()).toContain("banana");
  });

  it("returns barcode exact match when available", async () => {
    const results = await searchFoodsByQuery("7891000100103", {
      internalFoods: INTERNAL_FOODS,
      externalResults: [],
    });

    expect(results[0]?.barcode).toBe("7891000100103");
  });

  it("matches branded whey searches through brand and tags", async () => {
    const results = await searchFoodsByQuery("Growth", {
      internalFoods: INTERNAL_FOODS,
      externalResults: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.brand).toBe("Growth");
  });
});

