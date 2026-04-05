/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getNutritionStorageHeaders: jest.fn(),
  saveUserCustomFood: jest.fn(),
}));

import { POST } from "@/app/api/nutrition/foods/custom/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { getNutritionStorageHeaders, saveUserCustomFood } from "@/modules/nutrition/repositories/nutrition-store";
import type { FoodItem } from "@/modules/nutrition/domain/types";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const saveUserCustomFoodMock = jest.mocked(saveUserCustomFood);

describe("POST /api/nutrition/foods/custom", () => {
  const randomUuidSpy = jest.spyOn(globalThis.crypto, "randomUUID");

  beforeEach(() => {
    jest.clearAllMocks();
    randomUuidSpy.mockReturnValue("food-uuid");
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  afterAll(() => {
    randomUuidSpy.mockRestore();
  });

  it("creates a private custom food with per-serving values normalized to per-100g", async () => {
    saveUserCustomFoodMock.mockImplementation(async (_userId, food) => food);

    // User enters values per 90g serving; backend normalizes to per 100g
    const response = await POST(
      new Request("http://localhost/api/nutrition/foods/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "  Pao de queijo  ",
          brand: "  Padaria Central ",
          caloriesPer100: 320,
          proteinPer100: 8,
          carbsPer100: 28,
          fatPer100: 18,
          servingGrams: 90,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(saveUserCustomFoodMock).toHaveBeenCalledTimes(1);

    const [userId, food] = saveUserCustomFoodMock.mock.calls[0] as [string, FoodItem];
    expect(userId).toBe("user-123");
    expect(food).toMatchObject({
      id: "custom_food-uuid",
      source: "custom",
      name: "Pao de queijo",
      displayName: "Pao de queijo",
      brand: "Padaria Central",
      baseUnit: "g",
      caloriesPer100: Number((320 * 100 / 90).toFixed(2)),
      proteinPer100: Number((8 * 100 / 90).toFixed(2)),
      carbsPer100: Number((28 * 100 / 90).toFixed(2)),
      fatPer100: Number((18 * 100 / 90).toFixed(2)),
      fiberPer100: 0,
      sodiumPer100: 0,
      servingGrams: 90,
      confidenceScore: 3,
    });

    await expect(response.json()).resolves.toEqual({
      item: expect.objectContaining({
        id: "custom_food-uuid",
        name: "Pao de queijo",
      }),
    });
  });

  it("rejects invalid payloads before touching persistence", async () => {
    const response = await POST(
      new Request("http://localhost/api/nutrition/foods/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "   ",
          caloriesPer100: -10,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(saveUserCustomFoodMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      code: "nutrition_invalid_payload",
    });
  });
});
