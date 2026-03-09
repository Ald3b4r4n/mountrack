import { clearPublicCatalogCache, listPublicCatalogFoods, loadPublicCatalog } from "@/modules/nutrition/catalog/load-public-catalog";

describe("public catalog loader", () => {
  beforeEach(() => {
    clearPublicCatalogCache();
  });

  it("loads the generated public catalog artifact from disk", async () => {
    const catalog = await loadPublicCatalog();
    const foods = await listPublicCatalogFoods();

    expect(catalog.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(foods.length).toBeGreaterThan(100);
    expect(foods.some((food) => food.brand === "Integralmedica")).toBe(true);
    expect(foods.some((food) => food.brand === "Dr. Peanut")).toBe(true);
    expect(foods.some((food) => food.brand === "NatureBarr")).toBe(true);
    expect(foods.some((food) => food.brand === "Neonutri")).toBe(true);
    expect(foods.some((food) => food.brand === "Leader Nutrition")).toBe(true);
    expect(foods.some((food) => food.brand === "Profit Labs")).toBe(true);
    expect(foods.some((food) => food.brand === "Shark Pro")).toBe(true);
    expect(foods.some((food) => food.brand === "Synthesize")).toBe(true);
    expect(foods.some((food) => food.brand === "MidWay")).toBe(true);
    expect(foods.some((food) => food.brand === "Power Supplements")).toBe(true);
    expect(foods.some((food) => food.brand === "Fisionutri")).toBe(true);
    expect(foods.some((food) => food.brand === "Nutri Sport")).toBe(true);
    expect(foods.some((food) => food.brand === "X-Pharma")).toBe(true);
    expect(foods.some((food) => food.brand === "Bionutri")).toBe(true);
    expect(foods.some((food) => food.brand === "Bio Power")).toBe(true);
    expect(foods.some((food) => food.brand === "Strong Nutri")).toBe(true);
    expect(foods.some((food) => food.brand === "Biovera")).toBe(true);
    expect(foods.some((food) => food.brand === "DNA Design Nutrition")).toBe(true);
    expect(foods.some((food) => food.brand === "Vortex Nutrition")).toBe(true);
    expect(foods.some((food) => food.brand === "Farma Forma")).toBe(true);
    expect(foods.some((food) => (food.displayName ?? food.name).includes("4Plus"))).toBe(true);
    expect(foods.some((food) => (food.displayName ?? food.name).includes("Brain Power"))).toBe(true);
    expect(foods.some((food) => (food.displayName ?? food.name).includes("Brutal Force"))).toBe(true);
    expect(foods.some((food) => (food.displayName ?? food.name).includes("Gourmet Whey"))).toBe(true);
    expect(
      foods.some(
        (food) =>
          food.displayName?.includes("Mais Mu") ||
          food.brand === "+MU" ||
          food.brand === "Mais Mu" ||
          food.brand === "Mu",
      ),
    ).toBe(true);
  });
});
