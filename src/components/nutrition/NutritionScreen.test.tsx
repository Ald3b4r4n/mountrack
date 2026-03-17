import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { NutritionScreen } from "@/components/nutrition/NutritionScreen";
import { NutritionWorkspaceNav } from "@/components/nutrition/NutritionWorkspaceNav";
import { useAuth } from "@/contexts/AuthContext";
import { useHydration } from "@/modules/nutrition/hooks/useHydration";
import { useNutritionDashboard } from "@/modules/nutrition/hooks/useNutritionDashboard";
import { useNutritionSearch } from "@/modules/nutrition/hooks/useNutritionSearch";
import { useNutritionScreenActions } from "@/components/nutrition/useNutritionScreenActions";
import { saveNutritionFocusedMealToBrowser } from "@/modules/nutrition/client-storage";
import type {
  DailySummary,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";

jest.mock("@/components/nutrition/NutritionScreenPreviewGate", () => ({
  NutritionScreenPreviewGate: ({
    render,
  }: {
    render: (isPreview: boolean) => React.ReactNode;
  }) => <>{render(true)}</>,
}));

jest.mock("@/components/nutrition/NutritionScreenShell", () => ({
  NutritionScreenShell: ({
    headerProps,
    navProps,
  }: {
    headerProps: React.ComponentProps<typeof NutritionHeader>;
    navProps: React.ComponentProps<typeof NutritionWorkspaceNav>;
  }) => (
    <div>
      <NutritionHeader {...headerProps} />
      <NutritionWorkspaceNav {...navProps} />
    </div>
  ),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/modules/nutrition/hooks/useNutritionDashboard", () => ({
  useNutritionDashboard: jest.fn(),
}));

jest.mock("@/modules/nutrition/hooks/useNutritionSearch", () => ({
  useNutritionSearch: jest.fn(),
}));

jest.mock("@/modules/nutrition/hooks/useHydration", () => ({
  useHydration: jest.fn(),
}));

jest.mock("@/components/nutrition/useNutritionScreenActions", () => ({
  useNutritionScreenActions: jest.fn(),
}));

const summary: DailySummary = {
  date: "2026-03-15",
  targetCalories: 2000,
  targetWaterMl: 2200,
  consumedCalories: 0,
  remainingCalories: 2000,
  waterIntakeMl: 0,
  meals: {
    breakfast: 0,
    lunch: 0,
    snack: 0,
    dinner: 0,
  },
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sodium: 0,
};

const goal: NutritionGoal = {
  userId: "preview-demo-user",
  targetCalories: 2000,
  targetWaterMl: 2200,
  targetProtein: 140,
  targetCarbs: 180,
  targetFat: 65,
  objective: "maintain",
};

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseNutritionDashboard = jest.mocked(useNutritionDashboard);
const mockedUseNutritionSearch = jest.mocked(useNutritionSearch);
const mockedUseHydration = jest.mocked(useHydration);
const mockedUseNutritionScreenActions = jest.mocked(useNutritionScreenActions);

describe("NutritionScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 15, 12, 30, 0));
    window.localStorage.clear();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 860px)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    window.scrollTo = jest.fn();

    mockedUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockedUseNutritionDashboard.mockReturnValue({
      state: {
        summary,
        diaryItems: [],
        diaryMealDefinitions: [],
        mealPlan: null,
        goal,
        isLoading: false,
        storageMode: "database",
        historyPage: 1,
        historyEntries: [],
        isHistoryLoading: false,
        historyTotalPages: 1,
      },
      setters: {
        setSummary: jest.fn(),
        setMealPlan: jest.fn(),
        setGoal: jest.fn(),
        setDiaryMealDefinitions: jest.fn(),
        setHistoryPage: jest.fn(),
      },
      actions: {
        resolveRequestError: jest.fn(async () => "erro"),
        loadDashboard: jest.fn(async () => "database"),
        loadBrowserDashboard: jest.fn(() => null),
        hydrateDashboard: jest.fn(),
        loadHistory: jest.fn(async () => {}),
        loadBrowserHistory: jest.fn(() => null),
        hydrateHistory: jest.fn(),
      },
    } as unknown as ReturnType<typeof useNutritionDashboard>);
    mockedUseNutritionSearch.mockReturnValue({
      state: {
        isSearching: false,
        isEnrichingExternal: false,
        searchResults: [],
        resultsVisible: false,
        searchQuery: "",
        barcodeQuery: "",
        selectedFood: null,
        isComposerOpen: false,
        lastSearchSource: "none",
        message: null,
      },
      actions: {
        handleSearchQueryChange: jest.fn(),
        handleBarcodeQueryChange: jest.fn(),
        handleSearch: jest.fn(),
        handleBarcodeLookup: jest.fn(async () => {}),
        resetSearchComposer: jest.fn(),
        applyFoodSelection: jest.fn(),
        openSelectedFoodComposer: jest.fn(),
        closeSelectedFoodComposer: jest.fn(),
        reopenSearchResults: jest.fn(),
        swapSelectedFood: jest.fn(),
      },
    } as unknown as ReturnType<typeof useNutritionSearch>);
    mockedUseHydration.mockReturnValue({
      state: {
        waterDraft: "",
        isUpdatingWater: false,
        hydrationMode: "absolute",
      },
      setters: {
        setWaterDraft: jest.fn(),
        setIsUpdatingWater: jest.fn(),
      },
      actions: {
        handleSelectHydrationMode: jest.fn(),
        handleAdjustWater: jest.fn(),
      },
    } as unknown as ReturnType<typeof useHydration>);
    mockedUseNutritionScreenActions.mockReturnValue({
      handleAddDiaryItem: jest.fn(async () => {}),
      handleDeleteDiaryItem: jest.fn(async () => {}),
      handleSaveGoal: jest.fn(async () => {}),
      handleSaveWater: jest.fn(async () => {}),
      handleDiscardMealPlan: jest.fn(),
      handleGenerateMealPlan: jest.fn(async () => {}),
      handleChangeMealPlanItemQuantity: jest.fn(),
      handleRejectMealPlanItem: jest.fn(),
      handleExportMealPlanPdf: jest.fn(async () => {}),
    } as unknown as ReturnType<typeof useNutritionScreenActions>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("opens with the time-based meal in focus and keeps add button in search", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<NutritionScreen />);

    expect(await screen.findByText(/Almoço em foco/i)).toBeInTheDocument();

    const addButton = await screen.findByRole("button", {
      name: /^Adicionar$/i,
    });
    expect(screen.getByRole("button", { name: "Hoje" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    // Button remains visible in search for continued food additions
    expect(
      screen.getByRole("button", { name: /^Adicionar$/i }),
    ).toBeInTheDocument();
  });

  it("prefers the last focused meal over the hour fallback", async () => {
    saveNutritionFocusedMealToBrowser("preview-demo-user", "snack");

    render(<NutritionScreen />);

    expect(await screen.findByText(/Lanche em foco/i)).toBeInTheDocument();
  });
});
