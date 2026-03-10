/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getGoal: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
  saveGoal: jest.fn(),
}));

import { GET, PUT } from "@/app/api/nutrition/goals/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { getGoal, getNutritionStorageHeaders, saveGoal } from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getGoalMock = jest.mocked(getGoal);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const saveGoalMock = jest.mocked(saveGoal);

describe("nutrition goals route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
      defaultGoal: { targetCalories: 2200, targetWaterMl: 2500, objective: "maintain" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  it("returns the authenticated users goal", async () => {
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      targetWaterMl: 2400,
      objective: "lose",
    });

    const response = await GET(new Request("http://localhost/api/nutrition/goals"));

    expect(response.status).toBe(200);
    expect(getGoalMock).toHaveBeenCalledWith("user-123", {
      targetCalories: 2200,
      targetWaterMl: 2500,
      objective: "maintain",
    });
    await expect(response.json()).resolves.toEqual({
      goal: expect.objectContaining({
        userId: "user-123",
        targetCalories: 2100,
      }),
    });
  });

  it("saves a goal with user scope and default water fallback", async () => {
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      objective: "maintain",
    } as never);
    saveGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 1950,
      targetWaterMl: 2500,
      targetProtein: 150,
      targetCarbs: 180,
      targetFat: 55,
      objective: "lose",
    } as never);

    const response = await PUT(
      new Request("http://localhost/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCalories: 1950,
          targetProtein: 150,
          targetCarbs: 180,
          targetFat: 55,
          objective: "lose",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(saveGoalMock).toHaveBeenCalledWith({
      userId: "user-123",
      targetCalories: 1950,
      targetWaterMl: 2500,
      targetProtein: 150,
      targetCarbs: 180,
      targetFat: 55,
      objective: "lose",
    });
  });

  it("rejects invalid goal payloads", async () => {
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      targetWaterMl: 2400,
      objective: "maintain",
    } as never);

    const response = await PUT(
      new Request("http://localhost/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCalories: 100,
          objective: "lose",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(saveGoalMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      code: "nutrition_invalid_payload",
    });
  });
});
