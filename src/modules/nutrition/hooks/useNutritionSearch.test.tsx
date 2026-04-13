import { act, renderHook, waitFor } from "@testing-library/react";
import { useNutritionSearch } from "@/modules/nutrition/hooks/useNutritionSearch";
import {
  authorizedNutritionFetch,
  getNutritionErrorMessage,
} from "@/modules/nutrition/client";

jest.mock("@/modules/nutrition/client", () => ({
  authorizedNutritionFetch: jest.fn(),
  getNutritionErrorMessage: jest.fn(),
}));

jest.mock("@/modules/nutrition/hooks/useNutritionDashboard", () => ({
  resolveUiStorageMode: jest.fn(() => "memory"),
}));

const authorizedNutritionFetchMock = jest.mocked(authorizedNutritionFetch);
const getNutritionErrorMessageMock = jest.mocked(getNutritionErrorMessage);

const authUser = {
  uid: "user-1",
  getIdToken: async () => "token",
};

function createMockResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "x-nutrition-storage") {
          return "memory";
        }

        return null;
      },
    },
    clone() {
      return this;
    },
    async json() {
      return body;
    },
  } as Response;
}

describe("useNutritionSearch barcode flow", () => {
  beforeEach(() => {
    authorizedNutritionFetchMock.mockReset();
    getNutritionErrorMessageMock.mockReset();
    getNutritionErrorMessageMock.mockResolvedValue("Erro generico");
  });

  it("normalizes the barcode before requesting the lookup route", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse({ item: null, source: "none" }, 404),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup("(01) 07891000100103");
    });

    expect(authorizedNutritionFetchMock).toHaveBeenCalledWith(
      authUser,
      "/api/nutrition/foods/barcode/07891000100103",
    );
    expect(result.current.state.barcodeQuery).toBe("07891000100103");
  });

  it("treats a 404 lookup as not found instead of a generic failure", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse({ item: null, source: "none" }, 404),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup("7891000100103");
    });

    await waitFor(() => {
      expect(result.current.state.message).toContain("barra");
      expect(result.current.state.message).toContain("cat");
    });
    expect(getNutritionErrorMessageMock).not.toHaveBeenCalled();
  });

  it("blocks invalid scanner payloads before hitting the API", async () => {
    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup(
        "https://example.com/promo",
      );
    });

    expect(authorizedNutritionFetchMock).not.toHaveBeenCalled();
    expect(result.current.state.message).toContain("barra");
    expect(result.current.state.message).toContain("v");
  });

  // T011 — barcode miss exposes barcodeMissCode for "Adicionar Manualmente" CTA
  it("sets barcodeMissCode on 404 barcode lookup so the UI can show an add-manually CTA", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse({ item: null, source: "none" }, 404),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup("7891000100103");
    });

    await waitFor(() => {
      expect(result.current.state.barcodeMissCode).toBe("7891000100103");
    });
  });

  it("clears barcodeMissCode when a new search query is entered", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse({ item: null, source: "none" }, 404),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup("7891000100103");
    });

    await waitFor(() =>
      expect(result.current.state.barcodeMissCode).toBe("7891000100103"),
    );

    act(() => {
      result.current.actions.handleSearchQueryChange("frango");
    });

    expect(result.current.state.barcodeMissCode).toBeNull();
  });

  it("clears barcode feedback when composer is reset after adding an item", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse({ item: null, source: "none" }, 404),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    await act(async () => {
      await result.current.actions.handleBarcodeLookup("7891000100103");
    });

    await waitFor(() => {
      expect(result.current.state.message).toContain("código de barras");
      expect(result.current.state.barcodeMissCode).toBe("7891000100103");
    });

    act(() => {
      result.current.actions.resetSearchComposer(true);
    });

    expect(result.current.state.message).toBeNull();
    expect(result.current.state.barcodeMissCode).toBeNull();
    expect(result.current.state.searchQuery).toBe("");
    expect(result.current.state.barcodeQuery).toBe("");
  });

  it("requests server-side source filtering when source filter changes", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse(
        {
          results: [
            {
              id: "fatsecret-black-beans",
              source: "fatsecret",
              name: "Black Beans",
              baseUnit: "g",
              confidenceScore: 1,
              mealCategories: [],
            },
          ],
          source: "fatsecret-primary",
          externalPending: false,
        },
        200,
      ),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.actions.handleSearchQueryChange("feijao");
    });

    await act(async () => {
      result.current.actions.handleSourceFilterChange("fatsecret");
    });

    await waitFor(() => {
      expect(authorizedNutritionFetchMock).toHaveBeenCalled();
    });

    expect(authorizedNutritionFetchMock).toHaveBeenCalledWith(
      authUser,
      "/api/nutrition/foods/search?q=feijao&source=fatsecret",
    );
    expect(result.current.state.sourceFilter).toBe("fatsecret");
  });

  it("includes mealType context in search requests when provided", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse(
        {
          results: [],
          source: "none",
          externalPending: false,
        },
        200,
      ),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.actions.handleSearchQueryChange("ovos");
    });

    await act(async () => {
      await result.current.actions.handleSearch("all", {}, "breakfast");
    });

    expect(authorizedNutritionFetchMock).toHaveBeenCalledWith(
      authUser,
      "/api/nutrition/foods/search?q=ovos&mealType=breakfast",
    );
  });

  it("does not trigger a new request for local source filters when all results are already present", async () => {
    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.actions.handleSearchQueryChange("feijao");
      result.current.setters.setSearchResults([
        {
          id: "tbca-feijao",
          source: "tbca",
          name: "Feijao, carioca, cru",
          baseUnit: "g",
          confidenceScore: 1,
          mealCategories: [],
        },
        {
          id: "internal-feijao",
          source: "internal",
          name: "Feijao carioca cozido",
          baseUnit: "g",
          confidenceScore: 1,
          mealCategories: [],
        },
      ]);
    });

    act(() => {
      result.current.actions.handleSourceFilterChange("tbca");
    });

    expect(authorizedNutritionFetchMock).not.toHaveBeenCalled();
    expect(result.current.state.sourceFilter).toBe("tbca");
  });

  it("does not call the search API when selecting the Recentes UI filter", async () => {
    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.actions.handleSearchQueryChange("arroz");
      result.current.setters.setSearchResults([
        {
          id: "fatsecret-arroz",
          source: "fatsecret",
          name: "Arroz",
          baseUnit: "g",
          confidenceScore: 1,
          mealCategories: [],
        },
      ]);
    });

    act(() => {
      result.current.actions.handleSourceFilterChange("recent");
    });

    expect(authorizedNutritionFetchMock).not.toHaveBeenCalledWith(
      authUser,
      expect.stringContaining("source=recent"),
    );
    expect(authorizedNutritionFetchMock).not.toHaveBeenCalled();
    expect(result.current.state.sourceFilter).toBe("recent");
  });

  it("shows did-you-mean hints when search returns no results with suggestions", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse(
        {
          results: [],
          source: "none",
          externalPending: false,
          didYouMean: ["Feijao carioca cozido", "Feijao preto cozido"],
        },
        200,
      ),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.actions.handleSearchQueryChange("fejao");
    });

    await act(async () => {
      await result.current.actions.handleSearch();
    });

    expect(result.current.state.searchResults).toHaveLength(0);
    expect(result.current.state.message).toContain("Você quis dizer");
    expect(result.current.state.message).toContain("Feijao carioca cozido");
    expect(result.current.state.searchSuggestions).toEqual([
      "Feijao carioca cozido",
      "Feijao preto cozido",
    ]);
  });

  it("runs a new all-source search when selecting a suggestion", async () => {
    authorizedNutritionFetchMock.mockResolvedValue(
      createMockResponse(
        {
          results: [
            {
              id: "f1",
              source: "fatsecret",
              name: "Feijao carioca cozido",
              baseUnit: "g",
              confidenceScore: 1,
              mealCategories: [],
            },
          ],
          source: "catalog",
          externalPending: false,
        },
        200,
      ),
    );

    const { result } = renderHook(() => useNutritionSearch(authUser, false));

    act(() => {
      result.current.setters.setSourceFilter("fatsecret");
    });

    await act(async () => {
      await result.current.actions.handleSearchSuggestion(
        "Feijao carioca cozido",
      );
    });

    expect(result.current.state.searchQuery).toBe("Feijao carioca cozido");
    expect(result.current.state.sourceFilter).toBe("all");
    expect(authorizedNutritionFetchMock).toHaveBeenCalledWith(
      authUser,
      "/api/nutrition/foods/search?q=Feijao%20carioca%20cozido",
    );
  });
});
