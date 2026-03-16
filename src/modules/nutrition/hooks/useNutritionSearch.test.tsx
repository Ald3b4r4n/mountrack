import { act, renderHook, waitFor } from "@testing-library/react";
import { useNutritionSearch } from "@/modules/nutrition/hooks/useNutritionSearch";
import { authorizedNutritionFetch, getNutritionErrorMessage } from "@/modules/nutrition/client";

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
    authorizedNutritionFetchMock.mockResolvedValue(createMockResponse({ item: null, source: "none" }, 404));

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
    authorizedNutritionFetchMock.mockResolvedValue(createMockResponse({ item: null, source: "none" }, 404));

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
      await result.current.actions.handleBarcodeLookup("https://example.com/promo");
    });

    expect(authorizedNutritionFetchMock).not.toHaveBeenCalled();
    expect(result.current.state.message).toContain("barra");
    expect(result.current.state.message).toContain("v");
  });
});
