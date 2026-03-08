import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { SUPPLEMENT_FOODS } from "@/modules/nutrition/data/supplement-foods";
import { searchFoodsByQuery } from "@/modules/nutrition/services/food-search.service";

const SEARCHABLE_FOODS = [...INTERNAL_FOODS, ...SUPPLEMENT_FOODS];

describe("food search service", () => {
  it("ranks exact textual matches before looser matches", async () => {
    const results = await searchFoodsByQuery("banana", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name.toLowerCase()).toContain("banana");
  });

  it("returns barcode exact match when available", async () => {
    const results = await searchFoodsByQuery("7891000100103", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [],
    });

    expect(results[0]?.barcode).toBe("7891000100103");
  });

  it("matches branded whey searches through brand and tags", async () => {
    const results = await searchFoodsByQuery("Growth", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.brand).toBe("Growth");
  });

  it("keeps exact supplement brands ahead of noisy external matches", async () => {
    const results = await searchFoodsByQuery("Essential Nutrition", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [
        {
          id: "off-random-whey",
          source: "openfoodfacts",
          name: "Whey random",
          displayName: "Whey random",
          brand: "Outra Marca",
          baseUnit: "g",
          confidenceScore: 0.91,
          category: "protein",
          mealCategories: ["breakfast", "snack"],
          tags: ["whey", "suplemento"],
        },
      ],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.brand).toBe("Essential Nutrition");
  });

  it("prioritizes curated catalog items before cached external items for supplement brands", async () => {
    const results = await searchFoodsByQuery("Growth Supplements", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [
        {
          id: "off-growth-pea",
          source: "openfoodfacts",
          name: "Pea Protein",
          displayName: "Pea Protein Growth Supplements",
          brand: "Growth Supplements",
          baseUnit: "g",
          confidenceScore: 0.95,
          category: "protein",
          mealCategories: ["breakfast", "snack"],
          tags: ["pea protein", "growth supplements", "protein"],
        },
      ],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.source).toBe("internal");
    expect(results[0]?.brand).toBe("Growth");
  });

  it("finds niche supplement brands from the curated catalog", async () => {
    const results = await searchFoodsByQuery("Dr. Peanut", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.brand).toBe("Dr. Peanut");
  });

  it("keeps protein bar matches when the query uses a natural portuguese phrase", async () => {
    const results = await searchFoodsByQuery("barra de proteina", {
      internalFoods: [],
      externalResults: [
        {
          id: "off-protein-bar",
          source: "openfoodfacts",
          name: "Barra proteica",
          displayName: "Barra proteica",
          brand: "Carrefour",
          baseUnit: "g",
          confidenceScore: 0.9,
          category: "protein",
          mealCategories: ["breakfast", "snack"],
          tags: ["industrializado", "protein-bars"],
        },
      ],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toBe("Barra proteica");
  });
});
