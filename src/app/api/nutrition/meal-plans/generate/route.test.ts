/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getGoal: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
  listAccessibleFoods: jest.fn(),
  saveMealPlan: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/meal-plan.service", () => ({
  generateMealPlan: jest.fn(),
}));

import { POST } from "@/app/api/nutrition/meal-plans/generate/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import {
  getGoal,
  getNutritionStorageHeaders,
  listAccessibleFoods,
  saveMealPlan,
} from "@/modules/nutrition/repositories/nutrition-store";
import { generateMealPlan } from "@/modules/nutrition/services/meal-plan.service";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getGoalMock = jest.mocked(getGoal);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const listAccessibleFoodsMock = jest.mocked(listAccessibleFoods);
const saveMealPlanMock = jest.mocked(saveMealPlan);
const generateMealPlanMock = jest.mocked(generateMealPlan);

describe("POST /api/nutrition/meal-plans/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
      defaultGoal: { targetCalories: 2200, targetWaterMl: 2500, objective: "maintain" },
    } as never);
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      targetWaterMl: 2400,
      objective: "lose",
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
    listAccessibleFoodsMock.mockResolvedValue([]);
  });

  it("generates and saves a meal plan scoped to the authenticated user", async () => {
    generateMealPlanMock.mockReturnValue({
      totalCalories: 2100,
      meals: [
        {
          name: "Cafe da manha",
          mealType: "breakfast",
          targetCalories: 500,
          totalCalories: 480,
          items: [{ foodId: "food-1", name: "Banana", quantity: 1, unit: "unit" }],
        },
      ],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/nutrition/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealsPerDay: 4,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(generateMealPlanMock).toHaveBeenCalledWith(
      {
        targetCalories: 2100,
        mealsPerDay: 4,
        objective: "lose",
        restrictions: [],
        preferredFoods: [],
        excludedFoods: [],
      },
      expect.any(Array),
    );
    expect(saveMealPlanMock).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        totalCalories: 2100,
      }),
    );
  });

  it("returns 422 when generation yields no meal items", async () => {
    generateMealPlanMock.mockReturnValue({
      totalCalories: 2100,
      meals: [
        {
          name: "Cafe da manha",
          mealType: "breakfast",
          targetCalories: 500,
          totalCalories: 0,
          items: [],
        },
      ],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/nutrition/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCalories: 2100,
          mealsPerDay: 4,
          objective: "lose",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(saveMealPlanMock).not.toHaveBeenCalled();
  });

  it("rejects invalid meal plan requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/nutrition/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCalories: 400,
          mealsPerDay: 2,
          objective: "lose",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(generateMealPlanMock).not.toHaveBeenCalled();
    expect(saveMealPlanMock).not.toHaveBeenCalled();
  });
});
