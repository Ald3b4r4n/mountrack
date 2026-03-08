"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BarcodeScannerDialog } from "@/components/nutrition/BarcodeScannerDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearNutritionMealPlanFromBrowser,
  hasNutritionBrowserSnapshot,
  loadNutritionDashboardFromBrowser,
  loadNutritionHistoryFromBrowser,
  saveNutritionDiaryItemToBrowser,
  saveNutritionGoalToBrowser,
  saveNutritionMealPlanToBrowser,
  saveNutritionWaterToBrowser,
  seedNutritionBrowserFromDashboard,
  removeNutritionDiaryItemFromBrowser,
  type NutritionDashboardSnapshot,
  type NutritionHistorySnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch, getNutritionErrorMessage, getNutritionStorageMode } from "@/modules/nutrition/client";
import {
  downloadMealPlanPdf,
  NUTRITION_COMPANY_SIGNATURE,
} from "@/components/nutrition/meal-plan-pdf";
import type {
  DailySummary,
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  FoodItem,
  MealPlan,
  MealPlanItem,
  MealType,
  NutritionGoal,
  NutritionObjective,
  NutritionTotals,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import {
  buildNextHydrationDraft,
  buildNextWaterIntake,
  type HydrationInputMode,
} from "@/modules/nutrition/services/hydration-input";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";
import { getTodayLocalDate } from "@/modules/expenses/utils";

const DEFAULT_WATER_TARGET = 2200;
const DIARY_PAGE_SIZE = 6;
const HISTORY_PAGE_SIZE = 6;

const DEFAULT_GOAL: NutritionGoal = {
  userId: "",
  targetCalories: 2000,
  targetWaterMl: DEFAULT_WATER_TARGET,
  targetProtein: 140,
  targetCarbs: 180,
  targetFat: 65,
  objective: "maintain",
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  snack: "Lanches",
  dinner: "Jantar",
};

const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  lose: "Emagrecimento",
  maintain: "Manutencao",
  gain: "Ganho de peso",
};

const MACRO_LABELS = {
  protein: "Proteina",
  carbs: "Carboidratos",
  fat: "Gorduras",
};

type WorkspaceTabKey = "diary" | "goal" | "plan";
type ActiveSurface = "search" | "workspace";
type DiaryViewKey = "today" | "history";
type NutritionUiStorageMode = "checking" | "database" | "memory" | "volatile";
type NutritionSearchSource = "catalog" | "external" | "fallback" | "none" | "openfoodfacts" | null;
type GoalInputState = {
  targetCalories: string;
  targetWaterMl: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

const WORKSPACE_TABS: Array<{ key: WorkspaceTabKey; label: string }> = [
  { key: "diary", label: "Diario" },
  { key: "goal", label: "Meta" },
  { key: "plan", label: "Cardapio" },
];

const previewAuthUser = {
  uid: "preview-demo-user",
  getIdToken: async () => "",
  devBypass: true,
};

function createEmptySummary(date: string): DailySummary {
  return {
    date,
    targetCalories: DEFAULT_GOAL.targetCalories,
    targetWaterMl: DEFAULT_WATER_TARGET,
    consumedCalories: 0,
    remainingCalories: DEFAULT_GOAL.targetCalories,
    waterIntakeMl: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    meals: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
  };
}

function getFoodLabel(food: FoodItem): string {
  return food.displayName ?? food.name;
}

function getFoodDefaultUnit(food: FoodItem): NutritionUnit {
  if (food.servingGrams) return "serving";
  if (food.baseUnit === "unit") return "unit";
  return food.baseUnit === "ml" ? "ml" : "g";
}

function getFoodDefaultQuantity(food: FoodItem): string {
  if (food.baseUnit === "unit") return "1";
  return food.servingGrams ? "1" : "100";
}

function formatCalories(value: number): string {
  return `${value.toFixed(0)} kcal`;
}

function formatGrams(value: number): string {
  return `${value.toFixed(0)} g`;
}

function formatMilliliters(value: number): string {
  return `${value.toFixed(0)} ml`;
}

function formatDeltaCalories(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(0)} kcal`;
}

function roundValue(value: number): number {
  return Number(value.toFixed(2));
}

function parseInputNumber(value: string): number | null {
  const parsedValue = Number(value.replace(",", "."));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseNonNegativeInputNumber(value: string): number | null {
  const normalizedValue = value.replace(",", ".").trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function cloneMealPlan(plan: MealPlan | null): MealPlan | null {
  if (!plan) return null;
  return {
    totalCalories: plan.totalCalories,
    meals: plan.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((item) => ({ ...item })),
    })),
  };
}

function normalizeMealPlan(plan: MealPlan): MealPlan {
  const meals = plan.meals.map((meal) => ({
    ...meal,
    totalCalories: roundValue(meal.items.reduce((total, item) => total + item.calories, 0)),
  }));

  return {
    totalCalories: roundValue(meals.reduce((total, meal) => total + meal.totalCalories, 0)),
    meals,
  };
}

function summarizeMealPlan(plan: MealPlan): Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat"> {
  return plan.meals.reduce(
    (totals, meal) => {
      for (const item of meal.items) {
        totals.calories += item.calories;
        totals.protein += item.protein;
        totals.carbs += item.carbs;
        totals.fat += item.fat;
      }
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function scaleMealPlanItem(item: MealPlanItem, ratio: number, quantity: number): MealPlanItem {
  return {
    ...item,
    quantity,
    calories: roundValue(item.calories * ratio),
    protein: roundValue(item.protein * ratio),
    carbs: roundValue(item.carbs * ratio),
    fat: roundValue(item.fat * ratio),
    fiber: roundValue(item.fiber * ratio),
    sodium: roundValue(item.sodium * ratio),
  };
}

function formatHistoryDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", weekday: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatSearchSourceLabel(source: NutritionSearchSource): string | null {
  switch (source) {
    case "catalog":
      return "Catalogo local";
    case "external":
      return "Fonte externa";
    case "fallback":
      return "Fallback interno";
    case "openfoodfacts":
      return "Open Food Facts";
    case "none":
      return "Sem match";
    default:
      return null;
  }
}

function resolveUiStorageMode(
  response: Response,
  canUseBrowserPersistence: boolean,
): NutritionUiStorageMode {
  if (getNutritionStorageMode(response) === "memory") {
    return canUseBrowserPersistence ? "volatile" : "memory";
  }

  return "database";
}

function createGoalInputState(sourceGoal: NutritionGoal): GoalInputState {
  return {
    targetCalories: String(sourceGoal.targetCalories),
    targetWaterMl: String(sourceGoal.targetWaterMl ?? DEFAULT_WATER_TARGET),
    targetProtein: String(sourceGoal.targetProtein ?? 0),
    targetCarbs: String(sourceGoal.targetCarbs ?? 0),
    targetFat: String(sourceGoal.targetFat ?? 0),
  };
}

export function NutritionScreen() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const today = useMemo(() => getTodayLocalDate(), []);
  const isPreview = process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1";
  const activeUser = user ?? (isPreview ? previewAuthUser : null);

  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [lastSearchSource, setLastSearchSource] = useState<NutritionSearchSource>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [diaryItems, setDiaryItems] = useState<DiaryItemSnapshot[]>([]);
  const [summary, setSummary] = useState<DailySummary>(() => createEmptySummary(today));
  const [goal, setGoal] = useState<NutritionGoal>(DEFAULT_GOAL);
  const [goalInputs, setGoalInputs] = useState<GoalInputState>(() => createGoalInputState(DEFAULT_GOAL));
  const [goalObjectiveDraft, setGoalObjectiveDraft] = useState<NutritionObjective>(DEFAULT_GOAL.objective);
  const [goalInputsDirty, setGoalInputsDirty] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealPlanDraft, setMealPlanDraft] = useState<MealPlan | null>(null);
  const [planCalories, setPlanCalories] = useState(String(DEFAULT_GOAL.targetCalories));
  const [planRejectedFoods, setPlanRejectedFoods] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<NutritionUnit>("g");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [waterDraft, setWaterDraft] = useState("");
  const [hydrationMode, setHydrationMode] = useState<HydrationInputMode>("increment");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceTabKey>("diary");
  const [activeSurface, setActiveSurface] = useState<ActiveSurface>("search");
  const [activeDiaryView, setActiveDiaryView] = useState<DiaryViewKey>("today");
  const [activeDiaryMeal, setActiveDiaryMeal] = useState<MealType>("breakfast");
  const [diaryPage, setDiaryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyEntries, setHistoryEntries] = useState<DiaryHistoryEntry[]>([]);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isUpdatingWater, setIsUpdatingWater] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<NutritionUiStorageMode>("checking");
  const goalRef = useRef(goal);
  const storageModeRef = useRef(storageMode);

  useEffect(() => {
    goalRef.current = goal;
  }, [goal]);

  useEffect(() => {
    storageModeRef.current = storageMode;
  }, [storageMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const syncLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
      setActiveSurface((current) => (mediaQuery.matches ? current : "search"));
    };

    syncLayout();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncLayout);
      return () => mediaQuery.removeEventListener("change", syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  useEffect(() => {
    if (goalInputsDirty) return;
    setGoalInputs(createGoalInputState(goal));
    setGoalObjectiveDraft(goal.objective);
  }, [goal, goalInputsDirty]);

  useEffect(() => {
    setStorageMode("checking");
  }, [activeUser?.uid]);

  const canUseBrowserPersistence = Boolean(activeUser && !("devBypass" in activeUser && activeUser.devBypass));

  const resolveRequestError = useCallback(async (response: Response, fallbackMessage: string) => {
    const nextMessage = await getNutritionErrorMessage(response, fallbackMessage);
    setMessage(nextMessage);
    return nextMessage;
  }, []);

  function updateGoalInput(field: keyof GoalInputState, value: string) {
    setGoalInputsDirty(true);
    setGoalInputs((current) => ({ ...current, [field]: value }));
  }

  const hydrateDashboard = useCallback(
    (payload: Partial<NutritionDashboardSnapshot>) => {
      const nextGoal = {
        ...DEFAULT_GOAL,
        ...(payload.goal ?? {}),
        userId: payload.goal?.userId ?? activeUser?.uid ?? "",
        targetWaterMl: payload.goal?.targetWaterMl ?? DEFAULT_WATER_TARGET,
      } satisfies NutritionGoal;
      const nextSummary = payload.summary ?? createEmptySummary(today);
      const nextMealPlan = payload.mealPlan ?? null;

      setDiaryItems(payload.diary?.items ?? []);
      setSummary({
        ...createEmptySummary(today),
        ...nextSummary,
        targetWaterMl: nextSummary.targetWaterMl ?? nextGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
      });
      setGoal(nextGoal);
      setMealPlan(nextMealPlan);
      setMealPlanDraft(cloneMealPlan(nextMealPlan));
      setPlanCalories(String(nextGoal.targetCalories));
    },
    [activeUser?.uid, today],
  );

  const hydrateHistory = useCallback((payload: Partial<NutritionHistorySnapshot>) => {
    const totalPages = Math.max(1, payload.totalPages ?? 1);
    const safePage = Math.min(payload.page ?? 1, totalPages);
    setHistoryEntries(payload.entries ?? []);
    setHistoryTotalPages(totalPages);
    setHistoryPage(safePage);
  }, []);

  const loadBrowserDashboard = useCallback(() => {
    if (!activeUser) return null;
    const currentGoal = goalRef.current;

    return loadNutritionDashboardFromBrowser(activeUser.uid, today, {
      ...DEFAULT_GOAL,
      ...currentGoal,
      userId: activeUser.uid,
      targetWaterMl: currentGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
    });
  }, [activeUser, today]);

  const loadBrowserHistory = useCallback(
    (page: number) => {
      if (!activeUser) return null;
      const currentGoal = goalRef.current;

      return loadNutritionHistoryFromBrowser(
        activeUser.uid,
        {
          ...DEFAULT_GOAL,
          ...currentGoal,
          userId: activeUser.uid,
          targetWaterMl: currentGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        },
        page,
        HISTORY_PAGE_SIZE,
      );
    },
    [activeUser],
  );

  const loadDashboard = useCallback(async (): Promise<NutritionUiStorageMode> => {
    if (!activeUser) return "checking";
    const currentGoal = goalRef.current;

    setIsLoading(true);
    try {
      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diaries/${today}`);
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel carregar o painel de nutricao agora.");
        if (canUseBrowserPersistence && hasNutritionBrowserSnapshot(activeUser.uid)) {
          setStorageMode("volatile");
          const browserDashboard = loadBrowserDashboard();
          if (browserDashboard) {
            hydrateDashboard(browserDashboard);
            return "volatile";
          }
        }
        return "memory";
      }

      const nextStorageMode = resolveUiStorageMode(response, canUseBrowserPersistence);
      setStorageMode(nextStorageMode);

      const payload = (await response.json()) as Partial<NutritionDashboardSnapshot>;

      if (nextStorageMode === "volatile" && canUseBrowserPersistence) {
        if (!hasNutritionBrowserSnapshot(activeUser.uid)) {
          seedNutritionBrowserFromDashboard(activeUser.uid, today, payload, {
            ...DEFAULT_GOAL,
            ...currentGoal,
            userId: activeUser.uid,
            targetWaterMl: currentGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          });
        }

        const browserDashboard = loadBrowserDashboard();
        if (browserDashboard) {
          hydrateDashboard(browserDashboard);
          return nextStorageMode;
        }
      }

      hydrateDashboard(payload);
      return nextStorageMode;
    } catch {
      if (canUseBrowserPersistence && activeUser && hasNutritionBrowserSnapshot(activeUser.uid)) {
        setStorageMode("volatile");
        const browserDashboard = loadBrowserDashboard();
        if (browserDashboard) {
          hydrateDashboard(browserDashboard);
          return "volatile";
        }
      }

      setMessage((current) => current ?? "Nao foi possivel carregar o painel de nutricao agora.");
      return canUseBrowserPersistence ? "volatile" : "memory";
    } finally {
      setIsLoading(false);
    }
  }, [
    activeUser,
    canUseBrowserPersistence,
    hydrateDashboard,
    loadBrowserDashboard,
    resolveRequestError,
    today,
  ]);

  const loadHistory = useCallback(
    async (nextPage: number, modeOverride?: NutritionUiStorageMode) => {
      if (!activeUser) return;

      setIsHistoryLoading(true);
      try {
        const resolvedMode = modeOverride ?? storageModeRef.current;
        if (resolvedMode === "volatile" && canUseBrowserPersistence) {
          const browserHistory = loadBrowserHistory(nextPage);
          if (browserHistory) {
            hydrateHistory(browserHistory);
            return;
          }
        }

        const response = await authorizedNutritionFetch(
          activeUser,
          `/api/nutrition/history?page=${nextPage}&pageSize=${HISTORY_PAGE_SIZE}`,
        );
        if (!response.ok) {
          await resolveRequestError(response, "Nao foi possivel carregar o historico agora.");
          return;
        }

        const nextStorageMode = resolveUiStorageMode(response, canUseBrowserPersistence);
        setStorageMode(nextStorageMode);
        if (nextStorageMode === "volatile" && canUseBrowserPersistence) {
          const browserHistory = loadBrowserHistory(nextPage);
          if (browserHistory) {
            hydrateHistory(browserHistory);
            return;
          }
        }

        const payload = (await response.json()) as Partial<NutritionHistorySnapshot>;
        hydrateHistory(payload);
      } catch {
        if (canUseBrowserPersistence && activeUser && hasNutritionBrowserSnapshot(activeUser.uid)) {
          setStorageMode("volatile");
          const browserHistory = loadBrowserHistory(nextPage);
          if (browserHistory) {
            hydrateHistory(browserHistory);
            return;
          }
        }

        setMessage((current) => current ?? "Nao foi possivel carregar o historico agora.");
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [activeUser, canUseBrowserPersistence, hydrateHistory, loadBrowserHistory, resolveRequestError],
  );

  useEffect(() => {
    if (!activeUser) return;

    setHistoryPage(1);
    setDiaryPage(1);
    let cancelled = false;

    void (async () => {
      const nextMode = await loadDashboard();
      if (cancelled) return;
      await loadHistory(1, nextMode);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser, loadDashboard, loadHistory]);

  function clearSearchResults() {
    setSearchResults([]);
    setLastSearchSource(null);
    setResultsVisible(false);
  }

  function clearSelectedFood() {
    setSelectedFood(null);
    setQuantity("100");
    setUnit("g");
  }

  function resetSearchComposer(clearInputs = false) {
    clearSearchResults();
    clearSelectedFood();
    if (clearInputs) {
      setSearchQuery("");
      setBarcodeQuery("");
    }
  }

  function applyFoodSelection(food: FoodItem, collapseResults = true) {
    setSelectedFood(food);
    setUnit(getFoodDefaultUnit(food));
    setQuantity(getFoodDefaultQuantity(food));
    if (collapseResults) setResultsVisible(false);
  }

  function reopenSearchResults() {
    setSelectedFood(null);
    setResultsVisible(searchResults.length > 0);
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  function handleBarcodeQueryChange(value: string) {
    setBarcodeQuery(value);
    if (searchResults.length || selectedFood) {
      clearSearchResults();
      clearSelectedFood();
    }
    setMessage(null);
  }

  async function handleSearch() {
    if (!activeUser) return;

    const query = searchQuery.trim();
    if (!query) {
      resetSearchComposer();
      return;
    }

    setIsSearching(true);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/foods/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel buscar alimentos agora.");
        return;
      }
      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as { results?: FoodItem[]; source?: NutritionSearchSource };
      const results = payload.results ?? [];
      const nextSource = payload.source ?? (results.length ? "catalog" : "none");

      setSearchResults(results);
      setLastSearchSource(nextSource);
      setResultsVisible(results.length > 0);

      if (results.length === 1) {
        applyFoodSelection(results[0]);
        setMessage(`${getFoodLabel(results[0])} pronto para lancamento.`);
      } else if (!results.length) {
        setMessage("Nenhum alimento encontrado para essa busca.");
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel buscar alimentos agora.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleBarcodeLookup(code: string) {
    if (!activeUser || !code.trim()) return;

    setBarcodeQuery(code);
    setIsSearching(true);
    setMessage(null);
    resetSearchComposer();

    try {
      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/foods/barcode/${encodeURIComponent(code)}`,
      );
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel consultar esse codigo de barras.");
        return;
      }
      setStorageMode(resolveUiStorageMode(response, canUseBrowserPersistence));
      const payload = (await response.json()) as { item?: FoodItem | null; source?: NutritionSearchSource };
      const foundItem = payload.item ?? null;

      if (foundItem) {
        setSearchResults([foundItem]);
        setLastSearchSource(payload.source ?? "openfoodfacts");
        applyFoodSelection(foundItem);
        setMessage(`Produto encontrado: ${getFoodLabel(foundItem)}`);
      } else {
        setLastSearchSource(payload.source ?? "none");
        setMessage("Nenhum item encontrado para esse codigo de barras.");
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel consultar esse codigo de barras.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddDiaryItem() {
    if (!activeUser || !selectedFood) return;

    const parsedQuantity = parseInputNumber(quantity);
    if (parsedQuantity == null) {
      setMessage("Informe uma quantidade valida.");
      return;
    }

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        const snapshot = createDiaryItemSnapshot({
          diaryId: `${activeUser.uid}:${today}`,
          food: selectedFood,
          quantity: parsedQuantity,
          unit,
          mealType,
          consumedAt: new Date().toISOString(),
        });

        saveNutritionDiaryItemToBrowser(activeUser.uid, today, {
          ...DEFAULT_GOAL,
          ...goal,
          userId: activeUser.uid,
          targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        }, snapshot);

        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(1);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);

        setActiveWorkspace("diary");
        setActiveDiaryView("today");
        setActiveSurface("workspace");
        setActiveDiaryMeal(mealType);
        setHistoryPage(1);
        setMessage(`${getFoodLabel(selectedFood)} adicionado ao diario.`);
        resetSearchComposer(true);
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/diary-items", {
        method: "POST",
        body: JSON.stringify({
          date: today,
          foodId: selectedFood.id,
          quantity: parsedQuantity,
          unit,
          mealType,
          consumedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel registrar esse alimento.");
        return;
      }

      setActiveWorkspace("diary");
      setActiveDiaryView("today");
      setActiveSurface("workspace");
      setActiveDiaryMeal(mealType);
      setHistoryPage(1);
      setMessage(`${getFoodLabel(selectedFood)} adicionado ao diario.`);
      resetSearchComposer(true);
      await Promise.all([loadDashboard(), loadHistory(1)]);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel registrar esse alimento.");
    }
  }

  async function handleDeleteDiaryItem(itemId: string) {
    if (!activeUser) return;

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        removeNutritionDiaryItemFromBrowser(activeUser.uid, itemId);
        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(historyPage);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diary-items/${itemId}`, { method: "DELETE" });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel remover esse item do diario.");
        return;
      }
      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel remover esse item do diario.");
    }
  }

  function resolveGoalFromInputs(): NutritionGoal | null {
    const targetCalories = parseNonNegativeInputNumber(goalInputs.targetCalories);
    const targetWaterMl = parseNonNegativeInputNumber(goalInputs.targetWaterMl);
    const targetProtein = parseNonNegativeInputNumber(goalInputs.targetProtein);
    const targetCarbs = parseNonNegativeInputNumber(goalInputs.targetCarbs);
    const targetFat = parseNonNegativeInputNumber(goalInputs.targetFat);

    if (targetCalories == null || targetCalories <= 0) {
      return null;
    }

    if (targetWaterMl == null || targetProtein == null || targetCarbs == null || targetFat == null) {
      return null;
    }

    return {
      ...goal,
      userId: activeUser?.uid ?? goal.userId,
      targetCalories,
      targetWaterMl,
      targetProtein,
      targetCarbs,
      targetFat,
      objective: goalObjectiveDraft,
    };
  }

  async function handleSaveGoal() {
    if (!activeUser) return;

    const requestedGoal = resolveGoalFromInputs();
    if (!requestedGoal) {
      setMessage("Preencha uma meta valida antes de salvar.");
      return;
    }

    setIsSavingGoal(true);
    setMessage(null);
    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        saveNutritionGoalToBrowser(activeUser.uid, requestedGoal);
        setGoalInputsDirty(false);
        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(historyPage);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);
        setActiveWorkspace("goal");
        setActiveSurface("workspace");
        setMessage("Meta nutricional atualizada.");
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/goals", {
        method: "PUT",
        body: JSON.stringify({
          targetCalories: requestedGoal.targetCalories,
          targetWaterMl: requestedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          targetProtein: requestedGoal.targetProtein,
          targetCarbs: requestedGoal.targetCarbs,
          targetFat: requestedGoal.targetFat,
          objective: requestedGoal.objective,
        }),
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel atualizar a meta nutricional.");
        return;
      }
      const payload = (await response.json()) as { goal?: NutritionGoal };
      const savedGoal = {
        ...requestedGoal,
        ...(payload.goal ?? {}),
        userId: payload.goal?.userId ?? activeUser.uid,
        targetWaterMl: payload.goal?.targetWaterMl ?? requestedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
      } satisfies NutritionGoal;

      setGoalInputsDirty(false);
      setGoal(savedGoal);
      setPlanCalories(String(savedGoal.targetCalories));
      setSummary((current) => ({
        ...current,
        targetCalories: savedGoal.targetCalories,
        targetWaterMl: savedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        remainingCalories: roundValue(savedGoal.targetCalories - current.consumedCalories),
      }));
      setActiveWorkspace("goal");
      setActiveSurface("workspace");
      setMessage("Meta nutricional atualizada.");
      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel atualizar a meta nutricional.");
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleSaveWater() {
    if (!activeUser) return;

    const nextWaterIntake = buildNextWaterIntake(summary.waterIntakeMl, waterDraft, hydrationMode);
    if (nextWaterIntake == null) {
      setMessage(
        hydrationMode === "absolute"
          ? "Informe o total correto de agua antes de salvar."
          : "Informe quantos ml deseja adicionar antes de salvar.",
      );
      return;
    }

    setIsUpdatingWater(true);
    setMessage(null);
    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        saveNutritionWaterToBrowser(activeUser.uid, today, {
          ...DEFAULT_GOAL,
          ...goal,
          userId: activeUser.uid,
          targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        }, nextWaterIntake);

        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(historyPage);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);
        setWaterDraft(hydrationMode === "absolute" ? String(Math.round(nextWaterIntake)) : "");
        setMessage(hydrationMode === "absolute" ? "Total de agua corrigido." : "Ingestao de agua atualizada.");
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diaries/${today}`, {
        method: "PATCH",
        body: JSON.stringify({ waterIntakeMl: nextWaterIntake }),
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel atualizar a agua do dia.");
        return;
      }
      const payload = (await response.json()) as Partial<NutritionDashboardSnapshot>;
      hydrateDashboard(payload);
      setWaterDraft(hydrationMode === "absolute" ? String(Math.round(nextWaterIntake)) : "");
      setMessage(hydrationMode === "absolute" ? "Total de agua corrigido." : "Ingestao de agua atualizada.");
      await loadHistory(historyPage);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel atualizar a agua do dia.");
    } finally {
      setIsUpdatingWater(false);
    }
  }

  function handleAdjustWater(delta: number) {
    setHydrationMode("increment");
    setWaterDraft((currentValue) => buildNextHydrationDraft(currentValue, delta));
  }

  function handleSelectHydrationMode(nextMode: HydrationInputMode) {
    if (nextMode === hydrationMode) return;

    setHydrationMode(nextMode);
    setWaterDraft(nextMode === "absolute" ? String(Math.round(summary.waterIntakeMl)) : "");
  }

  async function handleGenerateMealPlan() {
    if (!activeUser) return;

    const requestedCalories = parseInputNumber(planCalories);
    if (requestedCalories == null) {
      setMessage("Informe uma meta calorica valida para o cardapio.");
      return;
    }

    setIsGeneratingPlan(true);
    setMessage(null);
    try {
      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/meal-plans/generate", {
        method: "POST",
        body: JSON.stringify({
          targetCalories: requestedCalories,
          mealsPerDay: 4,
          objective: goalObjectiveDraft,
          preferredFoods: selectedFood ? [getFoodLabel(selectedFood)] : [],
          excludedFoods: planRejectedFoods,
          restrictions: [],
        }),
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel gerar o cardapio agora.");
        return;
      }
      const payload = (await response.json()) as { mealPlan?: MealPlan };
      if (payload.mealPlan) {
        const nextPlan = normalizeMealPlan(payload.mealPlan);

        if (storageMode === "volatile" && canUseBrowserPersistence) {
          saveNutritionMealPlanToBrowser(activeUser.uid, nextPlan);
        }

        startTransition(() => {
          setMealPlan(nextPlan);
          setMealPlanDraft(cloneMealPlan(nextPlan));
        });
        setActiveWorkspace("plan");
        setActiveSurface("workspace");
        setMessage(planRejectedFoods.length ? "Cardapio recalculado com as rejeicoes aplicadas." : "Cardapio atualizado.");
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel gerar o cardapio agora.");
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function handleDiscardMealPlan() {
    if (!activeUser) return;

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        clearNutritionMealPlanFromBrowser(activeUser.uid);
        setMealPlan(null);
        setMealPlanDraft(null);
        setPlanRejectedFoods([]);
        setMessage("Cardapio descartado.");
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/meal-plans", { method: "DELETE" });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel descartar o cardapio agora.");
        return;
      }
      setMealPlan(null);
      setMealPlanDraft(null);
      setPlanRejectedFoods([]);
      setMessage("Cardapio descartado.");
    } catch {
      setMessage((current) => current ?? "Nao foi possivel descartar o cardapio agora.");
    }
  }

  function handleChangeMealPlanItemQuantity(mealIndex: number, itemIndex: number, nextQuantityValue: number) {
    if (!Number.isFinite(nextQuantityValue) || nextQuantityValue <= 0) return;

    setMealPlanDraft((currentPlan) => {
      if (!currentPlan) return currentPlan;
      const currentItem = currentPlan.meals[mealIndex]?.items[itemIndex];
      if (!currentItem || currentItem.quantity <= 0) return currentPlan;

      const resolvedQuantity = currentItem.unit === "serving" || currentItem.unit === "unit"
        ? Number(nextQuantityValue.toFixed(1))
        : Number(nextQuantityValue.toFixed(0));
      const ratio = resolvedQuantity / currentItem.quantity;
      if (!Number.isFinite(ratio) || ratio <= 0) return currentPlan;

      const nextMeals = currentPlan.meals.map((meal, currentMealIndex) => {
        if (currentMealIndex !== mealIndex) return meal;
        return {
          ...meal,
          items: meal.items.map((item, currentItemIndex) => (
            currentItemIndex === itemIndex ? scaleMealPlanItem(item, ratio, resolvedQuantity) : item
          )),
        };
      });

      const nextPlan = normalizeMealPlan({ ...currentPlan, meals: nextMeals });
      if (storageMode === "volatile" && canUseBrowserPersistence && activeUser) {
        saveNutritionMealPlanToBrowser(activeUser.uid, nextPlan);
      }

      return nextPlan;
    });
  }

  function handleRejectMealPlanItem(mealIndex: number, itemIndex: number) {
    const itemName = mealPlanDraft?.meals[mealIndex]?.items[itemIndex]?.name;
    if (itemName) {
      setPlanRejectedFoods((currentItems) => (currentItems.includes(itemName) ? currentItems : [...currentItems, itemName]));
    }

    setMealPlanDraft((currentPlan) => {
      if (!currentPlan) return currentPlan;
      const nextMeals = currentPlan.meals.map((meal, currentMealIndex) => {
        if (currentMealIndex !== mealIndex) return meal;
        return { ...meal, items: meal.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex) };
      });
      const nextPlan = normalizeMealPlan({ ...currentPlan, meals: nextMeals });
      if (storageMode === "volatile" && canUseBrowserPersistence && activeUser) {
        saveNutritionMealPlanToBrowser(activeUser.uid, nextPlan);
      }

      return nextPlan;
    });
  }

  async function handleExportMealPlanPdf() {
    if (!mealPlanDraft) return;
    setIsExportingPdf(true);
    setMessage(null);

    try {
      await downloadMealPlanPdf({
        filename: `cardapio-nutricao-${today}.pdf`,
        plan: mealPlanDraft,
        targetCalories: parseInputNumber(planCalories) ?? goal.targetCalories,
        objective: goalObjectiveDraft,
        dateLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date()),
        totals: summarizeMealPlan(mealPlanDraft),
      });
      setMessage("PDF gerado com sucesso.");
    } catch {
      setMessage("Nao foi possivel gerar o PDF agora.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  const selectedFoodTotals = useMemo(() => {
    if (!selectedFood) return null;
    const parsedQuantity = parseInputNumber(quantity);
    if (parsedQuantity == null) return null;
    return calculateNutritionForQuantity({ food: selectedFood, quantity: parsedQuantity, unit });
  }, [selectedFood, quantity, unit]);

  const groupedDiaryItems = useMemo(
    () => ({
      breakfast: diaryItems.filter((item) => item.mealType === "breakfast"),
      lunch: diaryItems.filter((item) => item.mealType === "lunch"),
      snack: diaryItems.filter((item) => item.mealType === "snack"),
      dinner: diaryItems.filter((item) => item.mealType === "dinner"),
    }),
    [diaryItems],
  );

  const activeDiaryItems = useMemo(() => groupedDiaryItems[activeDiaryMeal] ?? [], [groupedDiaryItems, activeDiaryMeal]);
  const diaryTotalPages = Math.max(1, Math.ceil(activeDiaryItems.length / DIARY_PAGE_SIZE));
  const pagedDiaryItems = useMemo(() => {
    const offset = (diaryPage - 1) * DIARY_PAGE_SIZE;
    return activeDiaryItems.slice(offset, offset + DIARY_PAGE_SIZE);
  }, [activeDiaryItems, diaryPage]);

  useEffect(() => {
    setDiaryPage((current) => Math.min(current, diaryTotalPages));
  }, [diaryTotalPages]);

  const consumedRatio = summary.targetCalories > 0 ? Math.min((summary.consumedCalories / summary.targetCalories) * 100, 100) : 0;
  const waterRatio = summary.targetWaterMl > 0 ? Math.min((summary.waterIntakeMl / summary.targetWaterMl) * 100, 100) : 0;
  const displayedMealPlan = mealPlanDraft ?? mealPlan;
  const planTotals = useMemo(() => (displayedMealPlan ? summarizeMealPlan(displayedMealPlan) : null), [displayedMealPlan]);
  const requestedPlanCalories = parseInputNumber(planCalories) ?? goal.targetCalories;
  const planDelta = displayedMealPlan ? roundValue(displayedMealPlan.totalCalories - requestedPlanCalories) : 0;
  const searchCatalogBadge =
    storageMode === "database"
      ? "Catalogo persistente"
      : storageMode === "checking"
        ? "Verificando storage"
        : "Sem DB ativo";
  const searchSourceLabel = formatSearchSourceLabel(lastSearchSource);
  const resultState = selectedFood && !resultsVisible
    ? { title: "Resultados recolhidos", text: "Selecao pronta. Limpe ou faca outra busca para trocar o alimento." }
    : { title: "Nenhum alimento listado", text: isSearching ? "Consultando fontes de alimentos..." : "Faca uma busca para ver resultados aqui." };

  const pageContent = (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div style={{ position: isMobileLayout ? "absolute" : "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {!isMobileLayout ? (
          <Image
            src="/images/nutrition-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center center", opacity: 0.42 }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: isMobileLayout ? "linear-gradient(180deg, rgba(7, 16, 31, 0.92) 0%, rgba(7, 16, 31, 0.97) 34%, rgba(4, 10, 22, 1) 100%)" : "linear-gradient(180deg, rgba(4, 10, 22, 0.42) 0%, rgba(4, 10, 22, 0.86) 58%, rgba(4, 10, 22, 0.96) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: isMobileLayout ? "radial-gradient(circle at 50% -5%, rgba(52, 211, 153, 0.12), transparent 38%)" : "radial-gradient(circle at 85% 10%, rgba(34, 211, 238, 0.12), transparent 24%)" }} />
      </div>

      <main className="container" style={{ position: "relative", zIndex: 1, paddingTop: isMobileLayout ? "1.25rem" : "2rem", paddingBottom: "3rem" }}>
        <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={(code) => void handleBarcodeLookup(code)} />
        <header className="glass-panel static-panel anim-enter" style={{ padding: isMobileLayout ? "0.95rem" : "1.2rem", marginBottom: "0.9rem", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(6, 182, 212, 0.03) 45%, rgba(8, 14, 26, 0) 100%)" }} />
          {!isMobileLayout ? <div style={{ position: "absolute", top: "-3.5rem", right: "-4rem", width: "15rem", height: "15rem", borderRadius: "999px", background: "radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%)", filter: "blur(10px)" }} /> : null}
          <div style={{ position: "relative", display: "grid", gap: isMobileLayout ? "0.75rem" : "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: isMobileLayout ? "0.75rem" : "1rem", flexWrap: "wrap" }}>
              <div style={{ maxWidth: "42rem" }}>
                <span className="badge badge-success" style={{ marginBottom: isMobileLayout ? "0.5rem" : "0.75rem" }}>Nutricao</span>
                <h1 className="glow-text" style={{ fontSize: isMobileLayout ? "clamp(1.75rem, 7vw, 2.15rem)" : "clamp(2rem, 4vw, 3rem)", marginBottom: "0.25rem" }}>Diario nutricional</h1>
                <p className="page-subtitle" style={{ maxWidth: "58ch" }}>
                  {isMobileLayout ? "Registre refeicoes, acompanhe macros, agua e historico do dia sem friccao." : "Registre refeicoes, acompanhe agua, ajuste metas e monte o cardapio do dia sem empilhar logs enormes."}
                </p>
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.7rem" }}>
                  <span className="badge badge-success" style={{ background: "rgba(15, 23, 42, 0.38)", color: "#d1fae5", borderColor: "rgba(52, 211, 153, 0.18)" }}>{NUTRITION_COMPANY_SIGNATURE}</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>Assinatura oficial do modulo nutricional</span>
                </div>
                {!isMobileLayout && isPreview ? <p style={{ color: "var(--accent-secondary)", marginTop: "0.55rem", fontSize: "0.85rem" }}>Preview local ativo. O fluxo real continua disponivel com login normal.</p> : null}
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignSelf: "flex-start", width: isMobileLayout ? "100%" : "auto" }}>
                <Link href="/" className="nav-pill" style={{ flex: isMobileLayout ? 1 : undefined, justifyContent: "center" }}>Dashboard</Link>
              </div>
            </div>

            <div style={{ display: "grid", gap: isMobileLayout ? "0.55rem" : "0.7rem", gridTemplateColumns: isMobileLayout ? "repeat(2, minmax(0, 1fr))" : "repeat(12, minmax(0, 1fr))" }}>
              <div style={{ gridColumn: isMobileLayout ? "span 1" : "span 3" }}><CompactMetricCard label="Meta diaria" value={formatCalories(summary.targetCalories)} accent="var(--accent-primary)" /></div>
              <div style={{ gridColumn: isMobileLayout ? "span 1" : "span 3" }}><CompactMetricCard label="Consumido" value={formatCalories(summary.consumedCalories)} accent="var(--accent-warm)" /></div>
              <div style={{ gridColumn: isMobileLayout ? "span 1" : "span 3" }}><CompactMetricCard label="Restante" value={formatCalories(summary.remainingCalories)} accent="var(--accent-secondary)" /></div>
              <div style={{ gridColumn: isMobileLayout ? "1 / -1" : "span 3" }}><HydrationMetricCard current={summary.waterIntakeMl} target={summary.targetWaterMl} ratio={waterRatio} /></div>
              <div style={{ gridColumn: "1 / -1" }}><MacroHeroCard summary={summary} goal={goal} consumedRatio={consumedRatio} /></div>
            </div>
          </div>
        </header>

        {message ? <div className="glass-panel static-panel anim-enter" style={{ padding: "0.9rem 1rem", marginBottom: "1rem", borderColor: "rgba(52, 211, 153, 0.18)" }}><p style={{ color: "var(--text-secondary)" }}>{message}</p></div> : null}

        {isMobileLayout ? (
          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <SegmentButton active={activeSurface === "search"} label="Busca" onClick={() => setActiveSurface("search")} />
            <SegmentButton active={activeSurface === "workspace"} label={activeWorkspace === "diary" ? "Diario" : activeWorkspace === "goal" ? "Meta" : "Cardapio"} onClick={() => setActiveSurface("workspace")} />
          </div>
        ) : null}

        <section style={{ display: "grid", gap: isMobileLayout ? "0.85rem" : "1rem", gridTemplateColumns: isMobileLayout ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", alignItems: "start" }}>
          {(!isMobileLayout || activeSurface === "search") ? (
            <section className="glass-panel static-panel" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                <PanelHeader title="Busca rapida" subtitle="Pesquise por nome ou codigo de barras e registre o alimento em poucos passos." />
                <span className="badge badge-success" style={{ alignSelf: "flex-start" }}>{searchCatalogBadge}</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "0.9rem" }}>
                {storageMode === "database"
                  ? "Busca com catalogo persistido e reforco por fontes externas quando necessario."
                  : storageMode === "checking"
                    ? "Validando o modo de armazenamento deste ambiente."
                    : "Fontes externas ativas, mas sem conexao Postgres o catalogo nao persiste no Supabase neste ambiente."}
              </p>

              <div style={{ display: "grid", gap: "0.8rem", marginBottom: "0.9rem" }}>
                <Field label="Nome do alimento">
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    <input className="input-field" value={searchQuery} onChange={(event) => handleSearchQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleSearch(); } }} placeholder="Ex.: banana prata, arroz cozido, iogurte" style={{ flex: 1, minWidth: "14rem" }} />
                    <button onClick={() => void handleSearch()} className="btn-primary" disabled={isSearching}>{isSearching ? "Buscando..." : "Buscar"}</button>
                  </div>
                </Field>

                <Field label="Codigo de barras">
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    <input className="input-field" value={barcodeQuery} onChange={(event) => handleBarcodeQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleBarcodeLookup(barcodeQuery); } }} placeholder="EAN / GTIN" style={{ flex: 1, minWidth: "12rem" }} />
                    <button onClick={() => void handleBarcodeLookup(barcodeQuery)} className="btn-outline">Consultar</button>
                    {isMobileLayout ? <button onClick={() => setScannerOpen(true)} className="btn-outline">Escanear</button> : null}
                  </div>
                </Field>
              </div>

              <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "Outfit, sans-serif" }}>Resultados</strong>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {searchSourceLabel ? <span className="badge badge-success">{searchSourceLabel}</span> : null}
                      {resultsVisible && searchResults.length ? <span className="badge badge-success">{searchResults.length} itens</span> : null}
                      {searchResults.length || selectedFood ? <button onClick={() => { resetSearchComposer(); setMessage(null); }} className="btn-outline" style={{ minWidth: "auto", padding: "0.45rem 0.8rem" }}>Limpar</button> : null}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "0.7rem", maxHeight: "min(40vh, 320px)", overflowY: "auto", paddingRight: "0.25rem" }}>
                    {resultsVisible && searchResults.length ? searchResults.map((food) => {
                      const caloriesLabel = food.caloriesPer100 == null ? "--" : `${formatCalories(food.caloriesPer100)} / 100${food.baseUnit}`;
                      return <button key={food.id} onClick={() => applyFoodSelection(food)} className="glass-panel static-panel" style={{ padding: "0.85rem 0.95rem", textAlign: "left", borderColor: selectedFood?.id === food.id ? "rgba(52, 211, 153, 0.28)" : undefined, background: selectedFood?.id === food.id ? "rgba(52, 211, 153, 0.08)" : "rgba(5, 18, 39, 0.6)", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem" }}><div style={{ minWidth: 0 }}><strong style={{ display: "block", marginBottom: "0.15rem" }}>{getFoodLabel(food)}</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", display: "block" }}>{food.brand ? `${food.brand} · ` : ""}{caloriesLabel}</span></div><span style={{ color: "var(--text-muted)", fontSize: "0.76rem", whiteSpace: "nowrap", textTransform: "uppercase" }}>{food.source}</span></div></button>;
                    }) : <EmptyState title={resultState.title} text={resultState.text} compact />}
                  </div>
                </div>

                <div className="glass-panel static-panel" style={{ padding: "0.95rem", background: "rgba(6, 22, 45, 0.62)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    <div><strong style={{ display: "block" }}>Compositor</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>Selecione o alimento, ajuste unidade e registre no horario desejado.</span></div>
                    {selectedFood ? <button onClick={reopenSearchResults} className="btn-outline" style={{ minWidth: "auto", padding: "0.45rem 0.8rem" }}>Trocar alimento</button> : null}
                  </div>

                  {selectedFood ? (
                    <div style={{ display: "grid", gap: "0.85rem" }}>
                      <div className="glass-panel static-panel" style={{ padding: "0.9rem", background: "rgba(4, 15, 32, 0.72)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.55rem" }}><div><strong style={{ display: "block" }}>{getFoodLabel(selectedFood)}</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{selectedFood.brand ? `${selectedFood.brand} · ` : ""}{selectedFood.source.toUpperCase()}</span></div><span className="badge badge-success">{selectedFood.caloriesPer100 != null ? `${formatCalories(selectedFood.caloriesPer100)} / 100${selectedFood.baseUnit}` : "Sem kcal base"}</span></div>
                        {selectedFoodTotals ? <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}><MacroValue label="Proteina" value={formatGrams(selectedFoodTotals.protein)} accent="#34d399" compact /><MacroValue label="Carbo" value={formatGrams(selectedFoodTotals.carbs)} accent="#22d3ee" compact /><MacroValue label="Gordura" value={formatGrams(selectedFoodTotals.fat)} accent="#fb7185" compact /></div> : null}
                      </div>

                      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                        <Field label="Quantidade"><input className="input-field" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" /></Field>
                        <Field label="Unidade"><select className="input-field" value={unit} onChange={(event) => setUnit(event.target.value as NutritionUnit)}><option value="g">Gramas</option><option value="ml">Mililitros</option><option value="serving">Porcao</option><option value="unit">Unidade</option></select></Field>
                        <Field label="Refeicao"><select className="input-field" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{MEAL_ORDER.map((value) => <option key={value} value={value}>{MEAL_LABELS[value]}</option>)}</select></Field>
                      </div>

                      <button onClick={() => void handleAddDiaryItem()} className="btn-primary" style={{ width: "100%" }}>Adicionar ao diario</button>
                    </div>
                  ) : <EmptyState title="Nenhum alimento selecionado" text="Escolha um resultado da busca para liberar o lancamento no diario." compact />}
                </div>
              </div>
            </section>
          ) : null}
          {(!isMobileLayout || activeSurface === "workspace") ? (
            <section style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                {WORKSPACE_TABS.map((tab) => (
                  <SegmentButton
                    key={tab.key}
                    active={activeWorkspace === tab.key}
                    label={tab.label}
                    meta={tab.key === "diary" ? diaryItems.length : tab.key === "plan" && displayedMealPlan ? displayedMealPlan.meals.length : undefined}
                    onClick={() => setActiveWorkspace(tab.key)}
                  />
                ))}
              </div>

              {activeWorkspace === "diary" ? (
                <div className="glass-panel static-panel" style={{ padding: "1rem", background: "rgba(6, 22, 45, 0.64)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.95rem" }}>
                    <div>
                      <strong style={{ display: "block" }}>Historico e diario</strong>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>O diario de hoje e o historico agora ficam paginados para nao alongar a sessao.</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                      <SegmentButton active={activeDiaryView === "today"} label="Hoje" onClick={() => { setActiveDiaryView("today"); setDiaryPage(1); }} />
                      <SegmentButton active={activeDiaryView === "history"} label="Historico" onClick={() => { setActiveDiaryView("history"); setDiaryPage(1); }} />
                    </div>
                  </div>

                  {activeDiaryView === "today" ? (
                    <div style={{ display: "grid", gap: "0.85rem" }}>
                      <div className="glass-panel static-panel" style={{ padding: "0.95rem", background: "rgba(4, 15, 32, 0.72)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
                          <div>
                            <strong style={{ display: "block" }}>Agua do dia</strong>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>Meta {formatMilliliters(summary.targetWaterMl)} · Atual {formatMilliliters(summary.waterIntakeMl)}</span>
                          </div>
                          <span className="badge badge-success">{Math.round(waterRatio)}% da meta</span>
                        </div>
                        <div className="progress-track" style={{ marginBottom: "0.75rem" }}><div className="progress-fill" style={{ width: `${waterRatio}%`, background: "linear-gradient(135deg, #38bdf8, #22d3ee)" }} /></div>
                        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
                          <SegmentButton active={hydrationMode === "increment"} label="Adicionar" onClick={() => handleSelectHydrationMode("increment")} />
                          <SegmentButton active={hydrationMode === "absolute"} label="Corrigir total" onClick={() => handleSelectHydrationMode("absolute")} />
                        </div>
                        {hydrationMode === "absolute" ? (
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.7rem" }}>
                            Use este modo para corrigir o total do dia quando houver erro no lancamento.
                          </p>
                        ) : null}
                        <div
                          style={{
                            display: "grid",
                            gap: "0.6rem",
                            gridTemplateColumns: hydrationMode === "increment"
                              ? (isMobileLayout ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))")
                              : (isMobileLayout ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 2fr) minmax(220px, 1fr)"),
                            alignItems: "end",
                          }}
                        >
                          {hydrationMode === "increment" ? <button onClick={() => handleAdjustWater(250)} className="btn-outline" style={{ width: "100%" }}>+250 ml</button> : null}
                          {hydrationMode === "increment" ? <button onClick={() => handleAdjustWater(500)} className="btn-outline" style={{ width: "100%" }}>+500 ml</button> : null}
                          <div
                            style={{
                              gridColumn: hydrationMode === "increment"
                                ? (isMobileLayout ? "1 / -1" : "auto")
                                : "auto",
                              minWidth: 0,
                            }}
                          >
                            <Field label={hydrationMode === "absolute" ? "Total correto do dia (ml)" : "Adicionar (ml)"}>
                              <input
                                className="input-field"
                                value={waterDraft}
                                onChange={(event) => setWaterDraft(event.target.value)}
                                inputMode="decimal"
                                placeholder={hydrationMode === "absolute" ? "Ex.: 1800" : "Ex.: 250"}
                              />
                            </Field>
                          </div>
                          <div style={{ gridColumn: isMobileLayout ? "1 / -1" : "auto", display: "grid" }}>
                            <button onClick={() => void handleSaveWater()} className="btn-primary" style={{ width: "100%", minHeight: "3rem" }} disabled={isUpdatingWater}>
                              {isUpdatingWater ? "Salvando..." : hydrationMode === "absolute" ? "Salvar total" : "Adicionar agua"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                        {MEAL_ORDER.map((meal) => (
                          <SegmentButton key={meal} active={activeDiaryMeal === meal} label={MEAL_LABELS[meal]} meta={groupedDiaryItems[meal].length} onClick={() => { setActiveDiaryMeal(meal); setDiaryPage(1); }} />
                        ))}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <div>
                          <strong style={{ display: "block" }}>{MEAL_LABELS[activeDiaryMeal]}</strong>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{activeDiaryItems.length} item(ns) · {formatCalories(summary.meals[activeDiaryMeal] ?? 0)}</span>
                        </div>
                        <span className="badge badge-success">Pagina {diaryPage}/{diaryTotalPages}</span>
                      </div>

                      {isLoading ? <p style={{ color: "var(--text-secondary)" }}>Carregando diario...</p> : null}
                      {!isLoading && activeDiaryItems.length === 0 ? <EmptyState title="Sem itens nesta refeicao" text="Escolha um alimento na coluna ao lado e registre no horario desejado." compact /> : null}
                      {!isLoading && pagedDiaryItems.length > 0 ? (
                        <div style={{ display: "grid", gap: "0.65rem", maxHeight: "min(36vh, 310px)", overflowY: "auto", paddingRight: "0.25rem" }}>
                          {pagedDiaryItems.map((item) => (
                            <div key={item.id} className="glass-panel static-panel" style={{ padding: "0.8rem 0.9rem", display: "flex", justifyContent: "space-between", gap: "0.85rem", alignItems: "center" }}>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ display: "block", marginBottom: "0.15rem" }}>{item.foodName}</strong>
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{item.quantity} {item.unit} · {formatCalories(item.calories)}</span>
                              </div>
                              <button onClick={() => void handleDeleteDiaryItem(item.id)} className="btn-outline" style={{ minWidth: "auto", padding: "0.55rem 0.8rem" }}>Remover</button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {activeDiaryItems.length > 0 ? <PaginationControls page={diaryPage} totalPages={diaryTotalPages} onPageChange={setDiaryPage} /> : null}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {isHistoryLoading ? <p style={{ color: "var(--text-secondary)" }}>Carregando historico...</p> : null}
                      {!isHistoryLoading && historyEntries.length === 0 ? <EmptyState title="Sem historico ainda" text="Os dias registrados aparecerao aqui, com paginacao pronta para navegacao." compact /> : null}
                      {!isHistoryLoading && historyEntries.length > 0 ? <div style={{ display: "grid", gap: "0.7rem", maxHeight: "min(44vh, 380px)", overflowY: "auto", paddingRight: "0.25rem" }}>{historyEntries.map((entry) => <HistoryEntryCard key={entry.date} entry={entry} />)}</div> : null}
                      <PaginationControls page={historyPage} totalPages={historyTotalPages} onPageChange={(page) => void loadHistory(page)} />
                    </div>
                  )}
                </div>
              ) : null}

              {activeWorkspace === "goal" ? (
                <div className="glass-panel static-panel" style={{ padding: "1rem", background: "rgba(6, 22, 45, 0.64)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.95rem" }}>
                    <div><strong style={{ display: "block" }}>Meta nutricional</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Calorias, macros e agua diaria refletem no topo da sessao e no diario.</span></div>
                    <span className="badge badge-success">{OBJECTIVE_LABELS[goalObjectiveDraft]}</span>
                  </div>
                  <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                    <Field label="Calorias"><input className="input-field" inputMode="numeric" value={goalInputs.targetCalories} onChange={(event) => updateGoalInput("targetCalories", event.target.value)} /></Field>
                    <Field label="Agua (ml)"><input className="input-field" inputMode="numeric" value={goalInputs.targetWaterMl} onChange={(event) => updateGoalInput("targetWaterMl", event.target.value)} /></Field>
                    <Field label="Proteina"><input className="input-field" inputMode="decimal" value={goalInputs.targetProtein} onChange={(event) => updateGoalInput("targetProtein", event.target.value)} /></Field>
                    <Field label="Carbo"><input className="input-field" inputMode="decimal" value={goalInputs.targetCarbs} onChange={(event) => updateGoalInput("targetCarbs", event.target.value)} /></Field>
                    <Field label="Gordura"><input className="input-field" inputMode="decimal" value={goalInputs.targetFat} onChange={(event) => updateGoalInput("targetFat", event.target.value)} /></Field>
                    <Field label="Objetivo"><select className="input-field" value={goalObjectiveDraft} onChange={(event) => { setGoalInputsDirty(true); setGoalObjectiveDraft(event.target.value as NutritionObjective); }}><option value="lose">Emagrecimento</option><option value="maintain">Manutencao</option><option value="gain">Ganho de peso</option></select></Field>
                  </div>
                  <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", marginTop: "1rem", marginBottom: "1rem" }}>
                    <MiniValue label="Meta" value={formatCalories(goal.targetCalories)} accent="var(--accent-secondary)" />
                    <MiniValue label="Agua" value={formatMilliliters(goal.targetWaterMl ?? DEFAULT_WATER_TARGET)} accent="#38bdf8" />
                    <MiniValue label="Hoje" value={formatCalories(summary.consumedCalories)} accent="var(--accent-primary)" />
                    <MiniValue label="Proteina" value={formatGrams(summary.protein)} accent="#34d399" />
                    <MiniValue label="Carbo" value={formatGrams(summary.carbs)} accent="#22d3ee" />
                    <MiniValue label="Gordura" value={formatGrams(summary.fat)} accent="#fb7185" />
                  </div>
                  <button onClick={() => void handleSaveGoal()} className="btn-primary" style={{ width: "100%" }} disabled={isSavingGoal}>{isSavingGoal ? "Salvando..." : "Salvar meta"}</button>
                </div>
              ) : null}
              {activeWorkspace === "plan" ? (
                <div className="glass-panel static-panel" style={{ padding: "1rem", background: "rgba(6, 22, 45, 0.64)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.95rem" }}>
                    <div><strong style={{ display: "block" }}>Cardapio diario</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Meta calorica respeitada, botoes alinhados no desktop e edicao de quantidades sem deformar o layout.</span></div>
                    {displayedMealPlan ? <span className="badge badge-success">{displayedMealPlan.meals.length} refeicoes</span> : null}
                  </div>
                  <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(0, 170px) minmax(0, 1fr)" }}>
                    <Field label="Calorias do cardapio"><input className="input-field" type="number" value={planCalories} onChange={(event) => setPlanCalories(event.target.value)} /></Field>
                    <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", alignItems: "stretch" }}>
                      <button onClick={() => void handleGenerateMealPlan()} className="btn-primary" style={{ width: "100%", minHeight: "3rem" }} disabled={isGeneratingPlan}>{isGeneratingPlan ? "Gerando..." : "Gerar cardapio"}</button>
                      <button onClick={() => setPlanCalories(String(goal.targetCalories))} className="btn-outline" style={{ width: "100%", minHeight: "3rem" }}>Usar meta</button>
                      <button onClick={() => void handleExportMealPlanPdf()} className="btn-outline" style={{ width: "100%", minHeight: "3rem" }} disabled={!mealPlanDraft || isExportingPdf}>{isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}</button>
                      <button onClick={() => void handleDiscardMealPlan()} className="btn-outline" style={{ width: "100%", minHeight: "3rem" }} disabled={!displayedMealPlan}>Descartar</button>
                    </div>
                  </div>
                  {planRejectedFoods.length ? <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem", marginBottom: "0.25rem" }}><span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Rejeicoes ativas: {planRejectedFoods.join(", ")}</span><button onClick={() => setPlanRejectedFoods([])} className="btn-outline" style={{ minWidth: "auto", padding: "0.45rem 0.8rem" }}>Limpar rejeicoes</button></div> : null}
                  {displayedMealPlan && planTotals ? <div style={{ display: "grid", gap: "0.8rem", marginTop: "1rem" }}><div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}><MiniValue label="Alvo" value={formatCalories(requestedPlanCalories)} accent="var(--accent-secondary)" /><MiniValue label="Planejado" value={formatCalories(displayedMealPlan.totalCalories)} accent="var(--accent-primary)" /><MiniValue label="Delta" value={formatDeltaCalories(planDelta)} accent={Math.abs(planDelta) <= 10 ? "#34d399" : "#fb7185"} /><MiniValue label="Proteina" value={formatGrams(planTotals.protein)} accent="#34d399" /><MiniValue label="Carbo" value={formatGrams(planTotals.carbs)} accent="#22d3ee" /><MiniValue label="Gordura" value={formatGrams(planTotals.fat)} accent="#fb7185" /></div><div style={{ display: "grid", gap: "0.7rem", maxHeight: isMobileLayout ? "none" : "min(46vh, 420px)", overflowY: isMobileLayout ? "visible" : "auto", paddingRight: isMobileLayout ? 0 : "0.25rem" }}>{displayedMealPlan.meals.map((meal, index) => <MealPlanEditorDisclosure key={`${meal.mealType}-${meal.name}`} meal={meal} mealIndex={index} defaultOpen={index === 0} onChangeQuantity={handleChangeMealPlanItemQuantity} onRejectItem={handleRejectMealPlanItem} />)}</div></div> : <div style={{ marginTop: "1rem" }}><EmptyState title="Nenhum cardapio gerado" text="Digite as calorias desejadas e gere um cardapio para editar ou exportar depois." compact /></div>}
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );

  if (isPreview) return pageContent;
  return <ProtectedRoute>{pageContent}</ProtectedRoute>;
}

function CompactMetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <article className="glass-panel static-panel" style={{ padding: "0.95rem 1rem", borderTop: `3px solid ${accent}`, background: "rgba(6, 22, 45, 0.54)", minHeight: "100%" }}><p className="stat-label" style={{ marginBottom: "0.6rem" }}>{label}</p><strong style={{ fontSize: "1.32rem", color: "var(--text-primary)", display: "block" }}>{value}</strong></article>;
}

function HydrationMetricCard({ current, target, ratio }: { current: number; target: number; ratio: number }) {
  return <article className="glass-panel static-panel" style={{ padding: "0.95rem 1rem", background: "linear-gradient(145deg, rgba(6, 22, 45, 0.68), rgba(13, 37, 61, 0.82))", minHeight: "100%", minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.6rem", flexWrap: "wrap" }}><div style={{ minWidth: 0, flex: "1 1 10rem" }}><p className="stat-label" style={{ marginBottom: "0.35rem" }}>Agua hoje</p><strong style={{ fontSize: "clamp(1.05rem, 4vw, 1.22rem)", color: "#e0f2fe", display: "block", lineHeight: 1.15 }}>{formatMilliliters(current)}</strong></div><span className="badge badge-success" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{formatMilliliters(target)}</span></div><div className="progress-track" style={{ marginBottom: "0.45rem" }}><div className="progress-fill" style={{ width: `${ratio}%`, background: "linear-gradient(135deg, #38bdf8, #22d3ee)" }} /></div><span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", display: "block" }}>{Math.round(ratio)}% da meta diaria</span></article>;
}

function MacroHeroCard({ summary, goal, consumedRatio }: { summary: DailySummary; goal: NutritionGoal; consumedRatio: number }) {
  return <article className="glass-panel static-panel" style={{ padding: "0.95rem 1rem", background: "linear-gradient(135deg, rgba(5, 18, 39, 0.86), rgba(11, 31, 55, 0.92))", borderColor: "rgba(52, 211, 153, 0.18)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "0.75rem" }}><div><p className="stat-label" style={{ marginBottom: "0.35rem" }}>Macros do dia</p><strong style={{ fontSize: "1.24rem", color: "var(--text-primary)", display: "block" }}>Painel de distribuicao nutricional</strong></div><span className="badge badge-success">{Math.round(consumedRatio)}% da meta kcal</span></div><div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}><MacroStatusCard label={MACRO_LABELS.protein} current={summary.protein} target={goal.targetProtein ?? 0} accent="#34d399" /><MacroStatusCard label={MACRO_LABELS.carbs} current={summary.carbs} target={goal.targetCarbs ?? 0} accent="#22d3ee" /><MacroStatusCard label={MACRO_LABELS.fat} current={summary.fat} target={goal.targetFat ?? 0} accent="#fb7185" /></div></article>;
}

function MacroStatusCard({ label, current, target, accent }: { label: string; current: number; target: number; accent: string }) {
  const ratio = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return <div className="glass-panel static-panel" style={{ padding: "0.8rem 0.85rem", background: "rgba(2, 11, 28, 0.76)", minHeight: "100%" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", marginBottom: "0.45rem" }}><span style={{ color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span><span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{target > 0 ? `${formatGrams(target)} alvo` : "Sem alvo"}</span></div><strong style={{ display: "block", color: accent, fontSize: "1rem", marginBottom: "0.5rem" }}>{formatGrams(current)}</strong><div className="progress-track" style={{ marginBottom: "0.35rem", height: "0.42rem" }}><div className="progress-fill" style={{ width: `${ratio}%`, background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.92))` }} /></div><span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{Math.round(ratio)}% do objetivo</span></div>;
}
function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.2rem" }}>{title}</h2><p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "38ch" }}>{subtitle}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: "0.45rem" }}><span className="label">{label}</span>{children}</label>;
}

function MiniValue({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="glass-panel static-panel" style={{ padding: "0.72rem 0.8rem", background: "rgba(2, 11, 28, 0.7)", minHeight: "100%" }}><span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span><strong style={{ display: "block", marginTop: "0.3rem", color: accent, fontSize: "0.98rem" }}>{value}</strong></div>;
}

function MacroValue({ label, value, accent, compact = false }: { label: string; value: string; accent: string; compact?: boolean }) {
  return <div className="glass-panel static-panel" style={{ padding: compact ? "0.55rem 0.45rem" : "0.7rem 0.8rem", background: "rgba(2, 11, 28, 0.72)", textAlign: "center", minWidth: 0 }}><span style={{ display: "block", color: "var(--text-muted)", fontSize: compact ? "0.64rem" : "0.72rem", textTransform: "uppercase", letterSpacing: compact ? "0.02em" : "0.06em", whiteSpace: "normal", lineHeight: 1.2 }}>{label}</span><strong style={{ display: "block", marginTop: compact ? "0.25rem" : "0.3rem", color: accent, fontSize: compact ? "0.9rem" : "0.98rem", lineHeight: 1.15 }}>{value}</strong></div>;
}

function SegmentButton({ active, label, meta, onClick }: { active: boolean; label: string; meta?: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="nav-pill" style={{ background: active ? "rgba(52, 211, 153, 0.12)" : "rgba(10, 16, 30, 0.72)", color: active ? "var(--accent-primary)" : "var(--text-secondary)", borderColor: active ? "rgba(52, 211, 153, 0.24)" : "var(--border-glass)", gap: "0.55rem" }}><span>{label}</span>{meta != null ? <span style={{ minWidth: "1.55rem", padding: "0.1rem 0.35rem", borderRadius: "999px", background: active ? "rgba(52, 211, 153, 0.16)" : "rgba(255, 255, 255, 0.05)", color: active ? "var(--accent-primary)" : "var(--text-muted)", fontSize: "0.75rem", textAlign: "center" }}>{meta}</span> : null}</button>;
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return <div className="glass-panel static-panel" style={{ padding: compact ? "0.95rem" : "1rem", background: "rgba(2, 11, 28, 0.62)", borderStyle: "dashed", borderColor: "rgba(124, 141, 181, 0.18)" }}><strong style={{ display: "block", marginBottom: "0.25rem" }}>{title}</strong><p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{text}</p></div>;
}

function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}><button onClick={() => onPageChange(Math.max(1, page - 1))} className="btn-outline" disabled={page <= 1} style={{ minWidth: "auto", padding: "0.5rem 0.8rem" }}>Anterior</button><span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>Pagina {page} de {totalPages}</span><button onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="btn-outline" disabled={page >= totalPages} style={{ minWidth: "auto", padding: "0.5rem 0.8rem" }}>Proxima</button></div>;
}

function HistoryEntryCard({ entry }: { entry: DiaryHistoryEntry }) {
  return <article className="glass-panel static-panel" style={{ padding: "0.9rem 1rem", background: "rgba(4, 15, 32, 0.72)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.65rem" }}><div><strong style={{ display: "block" }}>{formatHistoryDate(entry.date)}</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{entry.itemCount} item(ns) registrados</span></div><span className="badge badge-success">{formatCalories(entry.summary.consumedCalories)}</span></div><div style={{ display: "grid", gap: "0.55rem", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}><MiniValue label="Agua" value={formatMilliliters(entry.summary.waterIntakeMl)} accent="#38bdf8" /><MiniValue label="Proteina" value={formatGrams(entry.summary.protein)} accent="#34d399" /><MiniValue label="Carbo" value={formatGrams(entry.summary.carbs)} accent="#22d3ee" /><MiniValue label="Gordura" value={formatGrams(entry.summary.fat)} accent="#fb7185" /></div></article>;
}

function MealPlanEditorDisclosure({ meal, mealIndex, defaultOpen = false, onChangeQuantity, onRejectItem }: { meal: MealPlan["meals"][number]; mealIndex: number; defaultOpen?: boolean; onChangeQuantity: (mealIndex: number, itemIndex: number, nextQuantityValue: number) => void; onRejectItem: (mealIndex: number, itemIndex: number) => void; }) {
  return <details open={defaultOpen} className="glass-panel static-panel" style={{ padding: "0.9rem 1rem", background: "rgba(2, 11, 28, 0.72)" }}><summary style={{ cursor: "pointer", listStyle: "none" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}><div><strong style={{ display: "block" }}>{meal.name}</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{meal.items.length} itens · alvo {formatCalories(meal.targetCalories)}</span></div><span className="badge badge-success">{formatCalories(meal.totalCalories)}</span></div></summary><div style={{ display: "grid", gap: "0.65rem", marginTop: "0.85rem" }}>{meal.items.length ? meal.items.map((item: MealPlanItem, itemIndex: number) => <div key={`${meal.mealType}-${item.foodId}-${itemIndex}`} className="glass-panel static-panel" style={{ padding: "0.8rem 0.9rem", background: "rgba(5, 18, 39, 0.72)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}><div style={{ minWidth: 0 }}><strong style={{ display: "block", marginBottom: "0.15rem" }}>{item.name}</strong><span style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{formatGrams(item.protein)} prot · {formatGrams(item.carbs)} carb · {formatGrams(item.fat)} gord</span></div><span className="badge badge-success">{formatCalories(item.calories)}</span></div><div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "minmax(0, 120px) minmax(0, 1fr)", marginTop: "0.8rem", alignItems: "end" }}><Field label={`Quantidade (${item.unit})`}><input className="input-field" type="number" min={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"} step={item.unit === "serving" || item.unit === "unit" ? "0.1" : "1"} value={item.quantity} onChange={(event) => onChangeQuantity(mealIndex, itemIndex, Number(event.target.value))} /></Field><button onClick={() => onRejectItem(mealIndex, itemIndex)} className="btn-outline" style={{ width: "100%", minHeight: "3rem" }}>Rejeitar item</button></div></div>) : <EmptyState title="Sem itens restantes" text="Gere novamente para buscar outra composicao para essa refeicao." compact />}</div></details>;
}
