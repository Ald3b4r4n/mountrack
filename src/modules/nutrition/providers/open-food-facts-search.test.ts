import type { FoodItem } from "@/modules/nutrition/domain/types";
import { SUPPLEMENT_BRAND_PROFILES } from "@/modules/nutrition/data/supplement-brands";
import {
  buildOpenFoodFactsSearchTerms,
  rankOpenFoodFactsResults,
} from "@/modules/nutrition/providers/open-food-facts-search";

function makeFood(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: "food-1",
    source: "openfoodfacts",
    name: "Barra proteica",
    displayName: "Barra proteica",
    baseUnit: "g",
    confidenceScore: 0.9,
    category: "protein",
    mealCategories: ["breakfast", "snack"],
    tags: ["industrializado", "protein-bars"],
    ...overrides,
  };
}

describe("open food facts search helpers", () => {
  it("expands brazilian protein bar searches with useful aliases", () => {
    const terms = buildOpenFoodFactsSearchTerms("barra de proteina");

    expect(terms).toContain("barra de proteina");
    expect(terms).toContain("barra proteica");
    expect(terms).toContain("protein bar");
  });

  it("adds brand-specific supplement queries when the search is a known brand", () => {
    const wheyBrandProfile = SUPPLEMENT_BRAND_PROFILES.find((profile) =>
      profile.preferredQueries.some((query) => query.includes("whey")),
    );

    expect(wheyBrandProfile).toBeDefined();

    const terms = buildOpenFoodFactsSearchTerms(wheyBrandProfile!.brand);

    expect(terms).toContain(wheyBrandProfile!.brand);
    expect(terms.some((term) => term.includes("whey"))).toBe(true);
  });

  it("ranks protein bars ahead of unrelated matches", () => {
    const ranked = rankOpenFoodFactsResults("barra de proteina", [
      makeFood(),
      makeFood({
        id: "food-2",
        name: "Achocolatado em po",
        displayName: "Achocolatado em po",
        category: "snack",
        tags: ["industrializado"],
        confidenceScore: 0.8,
      }),
    ]);

    expect(ranked[0]?.displayName).toBe("Barra proteica");
    expect(ranked.some((food) => food.displayName === "Achocolatado em po")).toBe(false);
  });

  it("prefers the requested supplement brand over noisy results", () => {
    const ranked = rankOpenFoodFactsResults("Integralmedica", [
      makeFood({
        id: "off-integralmedica",
        name: "100% Pure Whey",
        displayName: "100% Pure Whey Integralmédica",
        brand: "Integralmédica",
        tags: ["whey", "protein", "integralmedica"],
      }),
      makeFood({
        id: "off-noise",
        name: "Barra proteica de trufa",
        displayName: "Barra proteica de trufa",
        brand: "Marca Aleatoria",
        tags: ["industrializado", "protein-bars"],
      }),
    ]);

    expect(ranked[0]?.brand).toBe("Integralmédica");
  });
});
