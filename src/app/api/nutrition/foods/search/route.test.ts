/** @jest-environment node */

jest.mock("@/modules/nutrition/auth/require-user", () => ({
  requireNutritionUser: jest.fn(),
}));

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getNutritionStorageHeaders: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/catalog-search.service", () => ({
  searchNutritionCatalog: jest.fn(),
}));

import { GET } from "@/app/api/nutrition/foods/search/route";
import { requireNutritionUser } from "@/modules/nutrition/auth/require-user";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { searchNutritionCatalog } from "@/modules/nutrition/services/catalog-search.service";

const requireNutritionUserMock = jest.mocked(requireNutritionUser);
const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const searchNutritionCatalogMock = jest.mocked(searchNutritionCatalog);

describe("GET /api/nutrition/foods/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireNutritionUserMock.mockResolvedValue({
      user: { uid: "user-123" },
    } as never);
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  it("returns an empty payload for short queries without touching search services", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/search?q=%20a%20"),
    );

    expect(response.status).toBe(200);
    expect(searchNutritionCatalogMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      results: [],
      source: "none",
      externalPending: false,
    });
  });

  it("searches the catalog with the authenticated user scope for valid queries", async () => {
    searchNutritionCatalogMock.mockResolvedValue({
      results: [{ id: "food-1", name: "Banana prata" }],
      source: "catalog",
      externalPending: false,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/search?q=%20banana%20"),
    );

    expect(response.status).toBe(200);
    expect(searchNutritionCatalogMock).toHaveBeenCalledWith("user-123", "banana", "all");
    await expect(response.json()).resolves.toEqual({
      results: [{ id: "food-1", name: "Banana prata" }],
      source: "catalog",
      externalPending: false,
    });
  });

  // T009 — invalid source value must return 400
  it("returns 400 for an invalid source filter value", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/search?q=banana&source=invalid_source"),
    );

    expect(response.status).toBe(400);
    expect(searchNutritionCatalogMock).not.toHaveBeenCalled();
  });

  // T009b — valid source value passes through to catalog search
  it("passes source filter to catalog search when a valid source is provided", async () => {
    searchNutritionCatalogMock.mockResolvedValue({
      results: [],
      source: "none",
      externalPending: false,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/search?q=frango&source=custom"),
    );

    expect(response.status).toBe(200);
    expect(searchNutritionCatalogMock).toHaveBeenCalledWith("user-123", "frango", "custom");
  });
});
