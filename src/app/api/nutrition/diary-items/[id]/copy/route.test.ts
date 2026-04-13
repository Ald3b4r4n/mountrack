/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  copyDiaryItem: jest.fn(),
  getGoal: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
}));

import { POST } from "@/app/api/nutrition/diary-items/[id]/copy/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { createUnauthorizedNutritionError } from "@/modules/nutrition/http/route-error";
import {
  copyDiaryItem,
  getGoal,
  getNutritionStorageHeaders,
} from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const copyDiaryItemMock = jest.mocked(copyDiaryItem);
const getGoalMock = jest.mocked(getGoal);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/nutrition/diary-items/item-1/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/nutrition/diary-items/[id]/copy", () => {
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
    copyDiaryItemMock.mockResolvedValue({
      diary: {
        id: "diary-target",
        userId: "user-123",
        date: "2026-03-15",
        targetCalories: 2100,
        targetWaterMl: 2300,
        waterIntakeMl: 0,
        mealDefinitions: [],
        items: [],
      },
      item: {
        id: "copied-item",
        diaryId: "diary-target",
        foodId: "food-1",
        foodName: "Banana",
        mealType: "lunch",
        mealLabel: "Almoço",
        quantity: 1,
        unit: "unit",
        consumedAt: "2026-03-15T12:30:00.000Z",
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.3,
        fiber: 3.1,
        sodium: 1,
      },
    } as never);
  });

  it("copies a diary item for the authenticated user", async () => {
    const response = await POST(
      makeRequest({
        targetDate: "2026-03-15",
        targetMealType: "lunch",
        targetMealLabel: "Almoço",
        consumedAt: "2026-03-15T12:30:00.000Z",
      }),
      { params: Promise.resolve({ id: "item-1" }) },
    );

    expect(response.status).toBe(201);
    expect(copyDiaryItemMock).toHaveBeenCalledWith(
      "user-123",
      "item-1",
      {
        targetDate: "2026-03-15",
        targetMealType: "lunch",
        targetMealLabel: "Almoço",
        consumedAt: "2026-03-15T12:30:00.000Z",
      },
      2100,
      2300,
    );
    await expect(response.json()).resolves.toEqual({
      diary: expect.objectContaining({ id: "diary-target" }),
      item: expect.objectContaining({ id: "copied-item", mealType: "lunch" }),
    });
  });

  it("returns 404 when the source item is missing or outside the user scope", async () => {
    copyDiaryItemMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        targetDate: "2026-03-15",
        targetMealType: "lunch",
      }),
      { params: Promise.resolve({ id: "item-1" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Diary item not found" });
  });

  it("rejects invalid copy payloads before touching persistence", async () => {
    const response = await POST(
      makeRequest({
        targetDate: "15-03-2026",
        targetMealType: "brunch",
      }),
      { params: Promise.resolve({ id: "item-1" }) },
    );

    expect(response.status).toBe(400);
    expect(copyDiaryItemMock).not.toHaveBeenCalled();
  });

  it("requires an authenticated nutrition user", async () => {
    requireNutritionUserMock.mockRejectedValue(createUnauthorizedNutritionError());

    const response = await POST(
      makeRequest({
        targetDate: "2026-03-15",
        targetMealType: "lunch",
      }),
      { params: Promise.resolve({ id: "item-1" }) },
    );

    expect(response.status).toBe(401);
    expect(copyDiaryItemMock).not.toHaveBeenCalled();
  });
});
