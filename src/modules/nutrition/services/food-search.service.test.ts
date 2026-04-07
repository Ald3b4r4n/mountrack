import type { FoodItem } from "@/modules/nutrition/domain/types";
import { INTERNAL_FOODS } from "@/modules/nutrition/data/internal-foods";
import { SUPPLEMENT_FOODS } from "@/modules/nutrition/data/supplement-foods";
import {
  hasStrongFoodSearchResult,
  searchFoodsByQuery,
} from "@/modules/nutrition/services/food-search.service";

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

  it("ignores short noisy fragments that would otherwise surface unrelated foods", async () => {
    const results = await searchFoodsByQuery("zz alimento privado 2026", {
      internalFoods: SEARCHABLE_FOODS,
      externalResults: [],
    });

    expect(results).toHaveLength(0);
  });

  it("flags exact local custom matches as strong hits", async () => {
    const results = await searchFoodsByQuery("Zz Persistencia Privada 2026", {
      internalFoods: [
        {
          id: "custom-persistencia",
          source: "custom",
          name: "Zz Persistencia Privada 2026",
          displayName: "Zz Persistencia Privada 2026",
          baseUnit: "g",
          caloriesPer100: 111,
          proteinPer100: 10,
          carbsPer100: 12,
          fatPer100: 3,
          confidenceScore: 3,
          mealCategories: [],
        },
      ],
      externalResults: [],
    });

    expect(results).toHaveLength(1);
    expect(
      hasStrongFoodSearchResult("Zz Persistencia Privada 2026", results[0]),
    ).toBe(true);
  });

  it("does not keep accidental substring matches when only one weak token overlaps", async () => {
    const results = await searchFoodsByQuery("yyy nada 2026", {
      internalFoods: [
        {
          id: "custom-persistencia",
          source: "custom",
          name: "Zz Persistencia Privada 2026",
          displayName: "Zz Persistencia Privada 2026",
          baseUnit: "g",
          caloriesPer100: 111,
          proteinPer100: 10,
          carbsPer100: 12,
          fatPer100: 3,
          confidenceScore: 3,
          mealCategories: [],
        },
        {
          id: "taco-drenada",
          source: "tbca",
          name: "Ervilha, enlatada, drenada",
          displayName: "Ervilha, enlatada, drenada",
          brand: "TACO (Unicamp/NEPA)",
          baseUnit: "g",
          caloriesPer100: 74,
          proteinPer100: 4.6,
          carbsPer100: 13.4,
          fatPer100: 0.4,
          confidenceScore: 0.95,
          mealCategories: ["breakfast", "lunch", "dinner", "snack"],
        },
      ],
      externalResults: [],
    });

    expect(results).toHaveLength(0);
  });

  it("drops brand-only placeholder entries when searching supplement brands", async () => {
    const results = await searchFoodsByQuery("soldier", {
      internalFoods: [
        {
          id: "soldier-ghost",
          source: "internal",
          name: "Soldiers",
          displayName: "Soldiers Soldier Nutrition",
          brand: "Soldier Nutrition",
          baseUnit: "g",
          caloriesPer100: 191,
          proteinPer100: 30,
          carbsPer100: 16,
          fatPer100: 2.3,
          confidenceScore: 0.93,
          mealCategories: ["breakfast", "snack"],
          tags: ["soldier nutrition", "soldiers nutrition", "soldiers"],
        },
        {
          id: "soldier-real",
          source: "internal",
          name: "Whey Protein Mocaccino",
          displayName: "Whey Protein Mocaccino Soldiers Nutrition",
          brand: "Soldiers Nutrition",
          baseUnit: "g",
          caloriesPer100: 400,
          proteinPer100: 70,
          carbsPer100: 12,
          fatPer100: 7,
          confidenceScore: 0.93,
          category: "protein",
          mealCategories: ["breakfast", "snack"],
          tags: ["soldier nutrition", "soldiers nutrition", "whey", "protein"],
        },
      ],
      externalResults: [],
    });

    expect(results.some((food) => food.id === "soldier-ghost")).toBe(false);
    expect(results[0]?.id).toBe("soldier-real");
  });

  it("keeps generic staple foods ahead of branded products on single-token queries", async () => {
    const results = await searchFoodsByQuery("banana", {
      internalFoods: [
        {
          id: "banana-prata",
          source: "internal",
          name: "Banana prata",
          baseUnit: "g",
          caloriesPer100: 98,
          proteinPer100: 1.3,
          carbsPer100: 26,
          fatPer100: 0.1,
          confidenceScore: 0.97,
          category: "fruit",
          mealCategories: ["breakfast", "snack"],
        },
        {
          id: "banana-brasil-barra",
          source: "internal",
          name: "Barra De Banana",
          displayName: "Barra De Banana Banana Brasil",
          brand: "Banana Brasil",
          baseUnit: "g",
          caloriesPer100: 317,
          proteinPer100: 4,
          carbsPer100: 62,
          fatPer100: 5,
          confidenceScore: 0.93,
          completenessScore: 0.67,
          locale: "pt-BR",
          countryCode: "BR",
          category: "snack",
          mealCategories: ["snack"],
        },
      ],
      externalResults: [],
    });

    expect(results[0]?.id).toBe("banana-prata");
  });

  it("keeps staple milk and oats ahead of branded matches on generic queries", async () => {
    const leiteResults = await searchFoodsByQuery("leite", {
      internalFoods: [
        {
          id: "leite-integral",
          source: "internal",
          name: "Leite integral",
          baseUnit: "ml",
          caloriesPer100: 60,
          proteinPer100: 3.2,
          carbsPer100: 4.7,
          fatPer100: 3.3,
          confidenceScore: 0.98,
          category: "beverage",
          mealCategories: ["breakfast", "snack"],
        },
        {
          id: "barra-leite-dummy",
          source: "internal",
          name: "Barra proteica sabor leite condensado",
          displayName: "Barra proteica sabor leite condensado Marca X",
          brand: "Marca X",
          baseUnit: "g",
          caloriesPer100: 410,
          proteinPer100: 22,
          carbsPer100: 45,
          fatPer100: 14,
          confidenceScore: 0.93,
          completenessScore: 0.67,
          locale: "pt-BR",
          countryCode: "BR",
          category: "snack",
          mealCategories: ["snack"],
        },
      ],
      externalResults: [],
    });

    const aveiaResults = await searchFoodsByQuery("aveia", {
      internalFoods: [
        {
          id: "aveia-flocos",
          source: "internal",
          name: "Aveia em flocos",
          baseUnit: "g",
          caloriesPer100: 394,
          proteinPer100: 13.9,
          carbsPer100: 66.6,
          fatPer100: 8.5,
          confidenceScore: 0.98,
          category: "carb",
          mealCategories: ["breakfast", "snack"],
        },
        {
          id: "barra-aveia-dummy",
          source: "internal",
          name: "Barra de cereal sabor aveia e mel",
          displayName: "Barra de cereal sabor aveia e mel Marca Y",
          brand: "Marca Y",
          baseUnit: "g",
          caloriesPer100: 355,
          proteinPer100: 5.5,
          carbsPer100: 68,
          fatPer100: 7,
          confidenceScore: 0.93,
          completenessScore: 0.67,
          locale: "pt-BR",
          countryCode: "BR",
          category: "snack",
          mealCategories: ["snack"],
        },
      ],
      externalResults: [],
    });

    expect(leiteResults[0]?.id).toBe("leite-integral");
    expect(aveiaResults[0]?.id).toBe("aveia-flocos");
  });

  it("matches partial queries regardless of case for staple foods", async () => {
    const internalFoods: FoodItem[] = [
      {
        id: "batata-doce",
        source: "internal" as const,
        name: "Batata-doce cozida",
        displayName: "Batata-doce cozida",
        baseUnit: "g" as const,
        caloriesPer100: 77,
        proteinPer100: 0.6,
        carbsPer100: 18.4,
        fatPer100: 0.1,
        confidenceScore: 0.98,
        category: "carb",
        mealCategories: ["lunch", "dinner"],
      },
    ];

    for (const query of ["Bata", "bat", "BAT", "BATATA", "batata"]) {
      const results = await searchFoodsByQuery(query, {
        internalFoods,
        externalResults: [],
      });

      expect(results[0]?.id).toBe("batata-doce");
    }
  });

  it("matches foods regardless of accents and cedilla", async () => {
    const internalFoods: FoodItem[] = [
      {
        id: "maca",
        source: "internal" as const,
        name: "Maçã",
        displayName: "Maçã",
        baseUnit: "g" as const,
        caloriesPer100: 56,
        proteinPer100: 0.3,
        carbsPer100: 15.2,
        fatPer100: 0.0,
        confidenceScore: 0.98,
        category: "fruit",
        mealCategories: ["breakfast", "snack"],
      },
      {
        id: "acai",
        source: "internal" as const,
        name: "Açaí, polpa, congelada",
        displayName: "Açaí, polpa, congelada",
        baseUnit: "g" as const,
        caloriesPer100: 58,
        proteinPer100: 0.8,
        carbsPer100: 6.2,
        fatPer100: 3.9,
        confidenceScore: 0.98,
        category: "fruit",
        mealCategories: ["breakfast", "snack"],
      },
    ];

    const macaResults = await searchFoodsByQuery("maca", {
      internalFoods,
      externalResults: [],
    });
    const acaiResults = await searchFoodsByQuery("acai", {
      internalFoods,
      externalResults: [],
    });
    const acucarResults = await searchFoodsByQuery("açai", {
      internalFoods,
      externalResults: [],
    });

    expect(macaResults[0]?.id).toBe("maca");
    expect(acaiResults[0]?.id).toBe("acai");
    expect(acucarResults[0]?.id).toBe("acai");
  });

  it("ignores brand-only matches for generic one-word queries", async () => {
    const results = await searchFoodsByQuery("frango", {
      internalFoods: [
        {
          id: "frango-peito",
          source: "fatsecret",
          name: "Peito de frango grelhado",
          displayName: "Peito de frango grelhado",
          baseUnit: "g",
          caloriesPer100: 165,
          proteinPer100: 31,
          carbsPer100: 0,
          fatPer100: 3.6,
          confidenceScore: 1,
          mealCategories: ["lunch", "dinner"],
        },
        {
          id: "mint-choco-brand-frango",
          source: "fatsecret",
          name: "Mint Chocolates",
          displayName: "Mint Chocolates",
          brand: "Frango",
          baseUnit: "g",
          caloriesPer100: 525,
          proteinPer100: 4,
          carbsPer100: 58,
          fatPer100: 31,
          confidenceScore: 1,
          mealCategories: ["snack"],
        },
      ],
      externalResults: [],
    });

    expect(results.some((item) => item.id === "mint-choco-brand-frango")).toBe(
      false,
    );
    expect(results[0]?.id).toBe("frango-peito");
  });

  // T007 — source filter: custom only
  it("returns only custom-source foods when source option is custom", async () => {
    const customFood: FoodItem = {
      id: "custom-frango",
      source: "custom",
      name: "Frango personalizado",
      baseUnit: "g",
      confidenceScore: 1,
      mealCategories: [],
    };
    const fatsecretFood: FoodItem = {
      id: "fs-frango",
      source: "fatsecret",
      name: "Frango grelhado",
      baseUnit: "g",
      confidenceScore: 1,
      mealCategories: [],
    };

    const results = await searchFoodsByQuery("frango", {
      internalFoods: [customFood, fatsecretFood],
      externalResults: [],
      source: "custom",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.source === "custom")).toBe(true);
  });

  // T008 — source filter: all returns mixed sources
  it("returns foods from all sources when source option is all", async () => {
    const customFood: FoodItem = {
      id: "custom-frango",
      source: "custom",
      name: "Frango custom",
      baseUnit: "g",
      confidenceScore: 1,
      mealCategories: [],
    };
    const fatsecretFood: FoodItem = {
      id: "fs-frango",
      source: "fatsecret",
      name: "Frango fatsecret",
      baseUnit: "g",
      confidenceScore: 1,
      mealCategories: [],
    };

    const results = await searchFoodsByQuery("frango", {
      internalFoods: [customFood, fatsecretFood],
      externalResults: [],
      source: "all",
    });

    const sources = results.map((r) => r.source);
    expect(sources).toContain("custom");
    expect(sources).toContain("fatsecret");
  });
});
