/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  deleteMealPlan: jest.fn(),
  getNutritionStorageHeaders: jest.fn(),
}));

import { DELETE } from "@/app/api/nutrition/meal-plans/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { deleteMealPlan, getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const deleteMealPlanMock = jest.mocked(deleteMealPlan);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);

describe("DELETE /api/nutrition/meal-plans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  it("deletes only the authenticated users meal plan", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/nutrition/meal-plans", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(deleteMealPlanMock).toHaveBeenCalledWith("user-123");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
