import { recentFoodsQuerySchema } from "@/modules/nutrition/validators";

describe("recentFoodsQuerySchema", () => {
  it("accepts limit up to 15", () => {
    expect(recentFoodsQuerySchema.parse({ limit: "15" })).toEqual({ limit: 15 });
  });

  it("rejects limit above 15", () => {
    expect(() => recentFoodsQuerySchema.parse({ limit: "16" })).toThrow();
  });

  it("defaults limit to 8 when omitted", () => {
    expect(recentFoodsQuerySchema.parse({})).toEqual({ limit: 8 });
  });

  it("accepts a valid mealType", () => {
    expect(
      recentFoodsQuerySchema.parse({ mealType: "breakfast" }),
    ).toEqual({ limit: 8, mealType: "breakfast" });
  });

  it("accepts a custom mealType", () => {
    expect(
      recentFoodsQuerySchema.parse({ mealType: "custom:pre-treino" }),
    ).toEqual({ limit: 8, mealType: "custom:pre-treino" });
  });

  it("rejects an invalid mealType", () => {
    expect(() =>
      recentFoodsQuerySchema.parse({ mealType: "brunch" }),
    ).toThrow();
  });

  it("treats empty mealType as omitted", () => {
    expect(recentFoodsQuerySchema.parse({ mealType: "" })).toEqual({
      limit: 8,
    });
  });
});
