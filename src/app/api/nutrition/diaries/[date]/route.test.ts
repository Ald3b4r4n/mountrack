/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getGoal: jest.fn(),
  getMealPlan: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
  getOrCreateDiary: jest.fn(),
  updateDiaryMealDefinitions: jest.fn(),
  updateDiaryWater: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/daily-calories.service", () => ({
  buildDailySummary: jest.fn(),
}));

import { GET, PATCH } from "@/app/api/nutrition/diaries/[date]/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { buildDailySummary } from "@/modules/nutrition/services/daily-calories.service";
import {
  getGoal,
  getMealPlan,
  getNutritionStorageHeaders,
  getOrCreateDiary,
  updateDiaryMealDefinitions,
  updateDiaryWater,
} from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const buildDailySummaryMock = jest.mocked(buildDailySummary);
const getGoalMock = jest.mocked(getGoal);
const getMealPlanMock = jest.mocked(getMealPlan);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const getOrCreateDiaryMock = jest.mocked(getOrCreateDiary);
const updateDiaryMealDefinitionsMock = jest.mocked(updateDiaryMealDefinitions);
const updateDiaryWaterMock = jest.mocked(updateDiaryWater);

describe("diary by date route", () => {
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
    getMealPlanMock.mockResolvedValue(null as never);
    getOrCreateDiaryMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 600,
      items: [],
      mealDefinitions: [],
    } as never);
    updateDiaryMealDefinitionsMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 600,
      items: [],
      mealDefinitions: [
        { key: "breakfast", label: "Café da manhã", isDefault: true },
        { key: "lunch", label: "Almoço", isDefault: true },
        { key: "snack", label: "Lanche", isDefault: true },
        { key: "dinner", label: "Jantar", isDefault: true },
      ],
    } as never);
    updateDiaryWaterMock.mockResolvedValue({
      id: "user-123:2026-03-09",
      userId: "user-123",
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      waterIntakeMl: 1200,
      items: [],
      mealDefinitions: [],
    } as never);
    buildDailySummaryMock.mockReturnValue({
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2300,
      consumedCalories: 0,
      remainingCalories: 2100,
      waterIntakeMl: 1200,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      meals: {},
    });
  });

  it("rejects malformed diary dates", async () => {
    const response = await GET(new Request("http://localhost/api/nutrition/diaries/09-03-2026"), {
      params: Promise.resolve({ date: "09-03-2026" }),
    });

    expect(response.status).toBe(400);
    expect(getOrCreateDiaryMock).not.toHaveBeenCalled();
  });

  it("loads the authenticated users diary for a valid date", async () => {
    const response = await GET(new Request("http://localhost/api/nutrition/diaries/2026-03-09"), {
      params: Promise.resolve({ date: "2026-03-09" }),
    });

    expect(response.status).toBe(200);
    expect(getOrCreateDiaryMock).toHaveBeenCalledWith("user-123", "2026-03-09", 2100, 2300);
  });

  it("updates hydration using only the authenticated users diary scope", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/nutrition/diaries/2026-03-09", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waterIntakeMl: 1200,
        }),
      }),
      {
        params: Promise.resolve({ date: "2026-03-09" }),
      },
    );

    expect(response.status).toBe(200);
    expect(updateDiaryWaterMock).toHaveBeenCalledWith("user-123", "2026-03-09", 2100, 2300, 1200);
  });
});
