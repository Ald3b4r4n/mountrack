import type { User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasNutritionBrowserSnapshot,
  loadNutritionDashboardFromBrowser,
  loadNutritionHistoryFromBrowser,
  seedNutritionBrowserFromDashboard,
  type NutritionDashboardSnapshot,
  type NutritionHistorySnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch, getNutritionErrorMessage, getNutritionStorageMode } from "@/modules/nutrition/client";
import type {
  DailySummary,
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  MealDefinition,
  MealPlan,
  NutritionGoal,
  NutritionObjective,
} from "@/modules/nutrition/domain/types";
import { getDefaultMealDefinitions } from "@/modules/nutrition/meal-helpers";

const DEFAULT_WATER_TARGET = 2200;
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

export type NutritionUiStorageMode = "checking" | "database" | "memory" | "volatile";

export type GoalInputState = {
  targetCalories: string;
  targetWaterMl: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

function createEmptySummary(date: string): DailySummary {
  const baseMeals = Object.fromEntries(
    getDefaultMealDefinitions().map((definition) => [definition.key, 0]),
  ) as Record<string, number>;

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
    meals: baseMeals,
  };
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

export function resolveUiStorageMode(
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

type NutritionDashboardUser = User | { uid: string; getIdToken?: () => Promise<string>; devBypass?: boolean } | null;

export function useNutritionDashboard(
  activeUser: NutritionDashboardUser,
  today: string,
  canUseBrowserPersistence: boolean,
) {
  const [diaryItems, setDiaryItems] = useState<DiaryItemSnapshot[]>([]);
  const [diaryMealDefinitions, setDiaryMealDefinitions] = useState<MealDefinition[]>(() =>
    getDefaultMealDefinitions(),
  );
  const [summary, setSummary] = useState<DailySummary>(() => createEmptySummary(today));
  const [goal, setGoal] = useState<NutritionGoal>(DEFAULT_GOAL);
  
  // States extraídos de NutritionScreen relacionados ao dashboard
  const [goalInputs, setGoalInputs] = useState<GoalInputState>(() => createGoalInputState(DEFAULT_GOAL));
  const [goalObjectiveDraft, setGoalObjectiveDraft] = useState<NutritionObjective>(DEFAULT_GOAL.objective);
  const [goalInputsDirty, setGoalInputsDirty] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealPlanDraft, setMealPlanDraft] = useState<MealPlan | null>(null);
  const [planCalories, setPlanCalories] = useState(String(DEFAULT_GOAL.targetCalories));
  
  const [historyEntries, setHistoryEntries] = useState<DiaryHistoryEntry[]>([]);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
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
    if (goalInputsDirty) return;
    setGoalInputs(createGoalInputState(goal));
    setGoalObjectiveDraft(goal.objective);
  }, [goal, goalInputsDirty]);

  useEffect(() => {
    setStorageMode("checking");
  }, [activeUser?.uid]);

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
      setDiaryMealDefinitions(payload.diary?.mealDefinitions ?? getDefaultMealDefinitions());
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
        await resolveRequestError(response, "Não foi possível carregar o painel de nutrição agora.");
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

      setMessage((current) => current ?? "Não foi possível carregar o painel de nutrição agora.");
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
          await resolveRequestError(response, "Não foi possível carregar o histórico agora.");
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

        setMessage((current) => current ?? "Não foi possível carregar o histórico agora.");
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [activeUser, canUseBrowserPersistence, hydrateHistory, loadBrowserHistory, resolveRequestError],
  );

  return {
    state: {
      diaryItems,
      diaryMealDefinitions,
      summary,
      goal,
      goalInputs,
      goalObjectiveDraft,
      goalInputsDirty,
      mealPlan,
      mealPlanDraft,
      planCalories,
      historyEntries,
      historyTotalPages,
      historyPage,
      isLoading,
      isHistoryLoading,
      message,
      storageMode,
    },
    setters: {
      setDiaryItems,
      setDiaryMealDefinitions,
      setSummary,
      setGoal,
      setGoalInputsDirty,
      setGoalObjectiveDraft,
      setMealPlan,
      setMealPlanDraft,
      setPlanCalories,
      setHistoryPage,
      setMessage,
      setStorageMode,
      setIsLoading,
      setIsHistoryLoading,
      setHistoryEntries,
    },
    actions: {
      updateGoalInput,
      loadDashboard,
      loadHistory,
      resolveRequestError,
      loadBrowserDashboard,
      hydrateDashboard,
      loadBrowserHistory,
      hydrateHistory,
    },
  };
}
