/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  findAccessibleFoodById: jest.fn(),
  getGoal: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
  saveDiaryItem: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/daily-calories.service", () => ({
  createDiaryItemSnapshot: jest.fn(),
}));

import { POST } from "@/app/api/nutrition/diary-items/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import {
  findAccessibleFoodById,
  getGoal,
  getNutritionStorageHeaders,
  saveDiaryItem,
} from "@/modules/nutrition/repositories/nutrition-store";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const findAccessibleFoodByIdMock = jest.mocked(findAccessibleFoodById);
const getGoalMock = jest.mocked(getGoal);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const saveDiaryItemMock = jest.mocked(saveDiaryItem);
const createDiaryItemSnapshotMock = jest.mocked(createDiaryItemSnapshot);

describe("POST /api/nutrition/diary-items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
      defaultGoal: { targetCalories: 2200, targetWaterMl: 2500, objective: "maintain" },
    } as never);
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      targetWaterMl: 2300,
      objective: "lose",
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
    findAccessibleFoodByIdMock.mockResolvedValue({
      id: "food-1",
      name: "Banana",
      displayName: "Banana",
      source: "internal",
      baseUnit: "g",
      confidenceScore: 1,
      mealCategories: [],
    } as never);
    createDiaryItemSnapshotMock.mockReturnValue({
      id: "item-1",
      diaryId: "user-123:2026-03-09",
      foodId: "food-1",
      foodName: "Banana",
      mealType: "breakfast",
      quantity: 1,
      unit: "unit",
      consumedAt: "2026-03-09T08:00:00.000Z",
      calories: 105,
      protein: 1.3,
      carbs: 27,
      fat: 0.3,
      fiber: 3.1,
      sodium: 1,
    });
    saveDiaryItemMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 0,
      items: [],
      mealDefinitions: [],
    } as never);
  });

  it("creates a diary item for the authenticated user", async () => {
    const response = await POST(
      new Request("http://localhost/api/nutrition/diary-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-09",
          foodId: "food-1",
          quantity: 1,
          unit: "unit",
          mealType: "breakfast",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(findAccessibleFoodByIdMock).toHaveBeenCalledWith("user-123", "food-1");
    expect(saveDiaryItemMock).toHaveBeenCalledWith(
      "user-123",
      "2026-03-09",
      2100,
      2300,
      expect.objectContaining({ id: "item-1" }),
    );
  });

  it("returns 404 when the selected food is not accessible to the user", async () => {
    findAccessibleFoodByIdMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/nutrition/diary-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-09",
          foodId: "food-1",
          quantity: 1,
          unit: "unit",
          mealType: "breakfast",
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(saveDiaryItemMock).not.toHaveBeenCalled();
  });

  it("falls back to the provided food snapshot when the food id is not yet accessible", async () => {
    findAccessibleFoodByIdMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/nutrition/diary-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-09",
          foodId: "barcode-food-1",
          foodSnapshot: {
            id: "barcode-food-1",
            source: "openfoodfacts",
            name: "Pao integral",
            displayName: "Pao integral",
            baseUnit: "g",
            caloriesPer100: 256,
            proteinPer100: 4.12,
            carbsPer100: 18.74,
            fatPer100: 1.08,
            confidenceScore: 1,
            mealCategories: ["breakfast"],
          },
          quantity: 39,
          unit: "g",
          mealType: "breakfast",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createDiaryItemSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        food: expect.objectContaining({
          id: "barcode-food-1",
          source: "openfoodfacts",
          name: "Pao integral",
        }),
      }),
    );
    expect(saveDiaryItemMock).toHaveBeenCalled();
  });

  it("rejects invalid diary item payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/nutrition/diary-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "09-03-2026",
          foodId: "",
          quantity: 0,
          unit: "unit",
          mealType: "breakfast",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(findAccessibleFoodByIdMock).not.toHaveBeenCalled();
    expect(saveDiaryItemMock).not.toHaveBeenCalled();
  });
});
