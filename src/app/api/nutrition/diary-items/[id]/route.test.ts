/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  findAccessibleFoodById: jest.fn(),
  findDiaryItemById: jest.fn(),
  removeDiaryItem: jest.fn(),
  replaceDiaryItem: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/daily-calories.service", () => ({
  createDiaryItemSnapshot: jest.fn(),
}));

import { DELETE, PATCH } from "@/app/api/nutrition/diary-items/[id]/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import {
  findAccessibleFoodById,
  findDiaryItemById,
  removeDiaryItem,
  replaceDiaryItem,
} from "@/modules/nutrition/repositories/nutrition-store";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const findAccessibleFoodByIdMock = jest.mocked(findAccessibleFoodById);
const findDiaryItemByIdMock = jest.mocked(findDiaryItemById);
const removeDiaryItemMock = jest.mocked(removeDiaryItem);
const replaceDiaryItemMock = jest.mocked(replaceDiaryItem);
const createDiaryItemSnapshotMock = jest.mocked(createDiaryItemSnapshot);

describe("diary item by id route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    findDiaryItemByIdMock.mockResolvedValue({
      id: "item-1",
      diaryId: "diary-1",
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
    } as never);
  });

  it("rejects malformed ids on delete before touching persistence", async () => {
    const response = await DELETE(new Request("http://localhost/api/nutrition/diary-items/%20"), {
      params: Promise.resolve({ id: "   " }),
    });

    expect(response.status).toBe(400);
    expect(removeDiaryItemMock).not.toHaveBeenCalled();
  });

  it("patches an item only with food accessible to the authenticated user", async () => {
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
      id: "generated-id",
      diaryId: "patched-item",
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
    replaceDiaryItemMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 0,
      items: [],
      mealDefinitions: [],
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/nutrition/diary-items/item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-09",
          foodId: "food-1",
          quantity: 1,
          unit: "unit",
          mealType: "breakfast",
        }),
      }),
      {
        params: Promise.resolve({ id: "item-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(findDiaryItemByIdMock).toHaveBeenCalledWith("user-123", "item-1");
    expect(findAccessibleFoodByIdMock).toHaveBeenCalledWith("user-123", "food-1");
    expect(replaceDiaryItemMock).toHaveBeenCalledWith(
      "user-123",
      "item-1",
      expect.objectContaining({ id: "item-1" }),
    );
  });

  it("falls back to the existing diary item values when the food record is missing", async () => {
    findAccessibleFoodByIdMock.mockResolvedValue(null as never);
    replaceDiaryItemMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 0,
      items: [],
      mealDefinitions: [],
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/nutrition/diary-items/item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-09",
          foodId: "food-1",
          quantity: 2,
          unit: "unit",
          mealType: "breakfast",
        }),
      }),
      {
        params: Promise.resolve({ id: "item-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(createDiaryItemSnapshotMock).not.toHaveBeenCalled();
    expect(replaceDiaryItemMock).toHaveBeenCalledWith(
      "user-123",
      "item-1",
      expect.objectContaining({
        id: "item-1",
        quantity: 2,
      }),
    );
  });

  it("deletes an item only for the authenticated user", async () => {
    removeDiaryItemMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 0,
      items: [],
      mealDefinitions: [],
    } as never);

    const response = await DELETE(new Request("http://localhost/api/nutrition/diary-items/item-1"), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(200);
    expect(removeDiaryItemMock).toHaveBeenCalledWith("user-123", "item-1");
  });
});
