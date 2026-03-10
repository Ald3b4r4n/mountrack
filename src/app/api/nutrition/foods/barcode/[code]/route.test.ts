/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getNutritionStorageHeaders: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/catalog-search.service", () => ({
  lookupNutritionBarcode: jest.fn(),
}));

import { GET } from "@/app/api/nutrition/foods/barcode/[code]/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { lookupNutritionBarcode } from "@/modules/nutrition/services/catalog-search.service";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const lookupNutritionBarcodeMock = jest.mocked(lookupNutritionBarcode);

describe("GET /api/nutrition/foods/barcode/[code]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  it("rejects malformed barcode params before lookup", async () => {
    const response = await GET(new Request("http://localhost/api/nutrition/foods/barcode/abc"), {
      params: Promise.resolve({ code: "abc" }),
    });

    expect(response.status).toBe(400);
    expect(lookupNutritionBarcodeMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      code: "nutrition_invalid_payload",
    });
  });

  it("looks up a valid barcode for the authenticated user", async () => {
    lookupNutritionBarcodeMock.mockResolvedValue({
      item: {
        id: "food-1",
        source: "catalog",
        name: "Whey Protein",
      } as never,
      source: "catalog",
    });

    const response = await GET(new Request("http://localhost/api/nutrition/foods/barcode/7891234567890"), {
      params: Promise.resolve({ code: "7891234567890" }),
    });

    expect(response.status).toBe(200);
    expect(lookupNutritionBarcodeMock).toHaveBeenCalledWith("user-123", "7891234567890");
    await expect(response.json()).resolves.toEqual({
      item: expect.objectContaining({
        id: "food-1",
        name: "Whey Protein",
      }),
      source: "catalog",
    });
  });
});
