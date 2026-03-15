/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getGoal: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
  listDiaryHistory: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/daily-calories.service", () => ({
  buildDailySummary: jest.fn(),
}));

import { GET } from "@/app/api/nutrition/history/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { buildDailySummary } from "@/modules/nutrition/services/daily-calories.service";
import { getGoal, getNutritionStorageHeaders, listDiaryHistory } from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getGoalMock = jest.mocked(getGoal);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const listDiaryHistoryMock = jest.mocked(listDiaryHistory);
const buildDailySummaryMock = jest.mocked(buildDailySummary);

describe("GET /api/nutrition/history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
      defaultGoal: { targetCalories: 2100, targetWaterMl: 2400, objective: "maintain" },
    } as never);
    getGoalMock.mockResolvedValue({
      userId: "user-123",
      targetCalories: 2100,
      targetWaterMl: 2400,
      objective: "maintain",
    });
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
    buildDailySummaryMock.mockReturnValue({
      date: "2026-03-09",
      targetCalories: 2100,
      targetWaterMl: 2400,
      consumedCalories: 900,
      remainingCalories: 1200,
      waterIntakeMl: 700,
      calories: 900,
      protein: 50,
      carbs: 80,
      fat: 30,
      fiber: 12,
      sodium: 500,
      meals: {},
    });
  });

  it("falls back to safe paging defaults when query params are invalid", async () => {
    listDiaryHistoryMock.mockResolvedValue({
      diaries: [
        {
          id: "diary-1",
          userId: "user-123",
          date: "2026-03-09",
          targetCalories: 2100,
          targetWaterMl: 2400,
          waterIntakeMl: 700,
          items: [],
          mealDefinitions: [],
        },
      ],
      total: 1,
    });

    const response = await GET(
      new Request("http://localhost/api/nutrition/history?page=abc&pageSize=999"),
    );

    expect(response.status).toBe(200);
    expect(listDiaryHistoryMock).toHaveBeenCalledWith("user-123", {
      limit: 6,
      offset: 0,
      excludeDate: undefined,
    });

    await expect(response.json()).resolves.toEqual({
      entries: [
        {
          date: "2026-03-09T12:00:00.000Z",
          itemCount: 0,
          summary: expect.objectContaining({
            targetCalories: 2100,
            targetWaterMl: 2400,
          }),
        },
      ],
      page: 1,
      pageSize: 6,
      total: 1,
      totalPages: 1,
    });
  });

  it("forwards the excluded date so history only returns closed days", async () => {
    listDiaryHistoryMock.mockResolvedValue({
      diaries: [],
      total: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/nutrition/history?page=1&pageSize=6&excludeDate=2026-03-15"),
    );

    expect(response.status).toBe(200);
    expect(listDiaryHistoryMock).toHaveBeenCalledWith("user-123", {
      limit: 6,
      offset: 0,
      excludeDate: "2026-03-15",
    });
  });
});
