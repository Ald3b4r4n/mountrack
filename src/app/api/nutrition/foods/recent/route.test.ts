/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getNutritionStorageHeaders: jest.fn(),
  listRecentConsumedFoods: jest.fn(),
}));

import { GET } from "@/app/api/nutrition/foods/recent/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { createUnauthorizedNutritionError } from "@/modules/nutrition/http/route-error";
import {
  getNutritionStorageHeaders,
  listRecentConsumedFoods,
} from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const listRecentConsumedFoodsMock = jest.mocked(listRecentConsumedFoods);

describe("GET /api/nutrition/foods/recent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
    listRecentConsumedFoodsMock.mockResolvedValue([
      {
        sourceItemId: "item-1",
        foodId: "food-1",
        foodName: "Banana",
        quantity: 1,
        unit: "unit",
        calories: 105,
        lastConsumedAt: "2026-03-15T08:00:00.000Z",
        lastMealType: "breakfast",
        lastMealLabel: "Café da manhã",
      },
    ] as never);
  });

  it("returns recent foods for the authenticated user with a validated limit", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/recent?limit=12"),
    );

    expect(response.status).toBe(200);
    expect(listRecentConsumedFoodsMock).toHaveBeenCalledWith("user-123", {
      limit: 12,
    });
    await expect(response.json()).resolves.toEqual({
      foods: [
        expect.objectContaining({
          sourceItemId: "item-1",
          foodName: "Banana",
          lastMealType: "breakfast",
        }),
      ],
    });
  });

  it("uses the default limit when the query omits limit", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/recent"),
    );

    expect(response.status).toBe(200);
    expect(listRecentConsumedFoodsMock).toHaveBeenCalledWith("user-123", {
      limit: 8,
    });
  });

  it("rejects limits outside the allowed interval", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/recent?limit=99"),
    );

    expect(response.status).toBe(400);
    expect(listRecentConsumedFoodsMock).not.toHaveBeenCalled();
  });

  it("accepts limit up to 15", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/recent?limit=15"),
    );

    expect(response.status).toBe(200);
    expect(listRecentConsumedFoodsMock).toHaveBeenCalledWith("user-123", {
      limit: 15,
    });
  });

  it("forwards mealType to the store when provided", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/nutrition/foods/recent?limit=15&mealType=breakfast",
      ),
    );

    expect(response.status).toBe(200);
    expect(listRecentConsumedFoodsMock).toHaveBeenCalledWith("user-123", {
      limit: 15,
      mealType: "breakfast",
    });
  });

  it("rejects an invalid mealType", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/nutrition/foods/recent?mealType=brunch",
      ),
    );

    expect(response.status).toBe(400);
    expect(listRecentConsumedFoodsMock).not.toHaveBeenCalled();
  });

  it("requires an authenticated nutrition user", async () => {
    requireNutritionUserMock.mockRejectedValue(createUnauthorizedNutritionError());

    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/recent"),
    );

    expect(response.status).toBe(401);
    expect(listRecentConsumedFoodsMock).not.toHaveBeenCalled();
  });
});
