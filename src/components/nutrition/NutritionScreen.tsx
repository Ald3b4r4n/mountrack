"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BarcodeScannerDialog } from "@/components/nutrition/BarcodeScannerDialog";
import { SegmentButton } from "@/components/nutrition/CommonUI";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import { GoalPanel, type GoalInputState } from "@/components/nutrition/GoalPanel";
import { MealPlanPanel } from "@/components/nutrition/MealPlanPanel";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { NutritionLayout } from "@/components/nutrition/NutritionLayout";
import { NutritionWorkspaceFrame } from "@/components/nutrition/NutritionWorkspaceFrame";
import { CustomMealDialog } from "@/components/nutrition/CustomMealDialog";
import {
  NutritionWorkspaceNav,
  type NutritionArea,
} from "@/components/nutrition/NutritionWorkspaceNav";
import { TodayWorkspace } from "@/components/nutrition/TodayWorkspace";
import { CustomFoodDialog } from "./CustomFoodDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearNutritionMealPlanFromBrowser,
  removeNutritionDiaryItemFromBrowser,
  saveNutritionDiaryItemToBrowser,
  saveNutritionGoalToBrowser,
  saveNutritionMealDefinitionsToBrowser,
  saveNutritionMealPlanToBrowser,
  saveNutritionWaterToBrowser,
  type NutritionDashboardSnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import { PLANNING_TABS, type PlanningTabKey } from "@/modules/nutrition/constants";
import type {
  MealDefinition,
  MealPlan,
  MealPlanItem,
  MealType,
  NutritionGoal,
  NutritionObjective,
  NutritionTotals,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import { useHydration, buildNextWaterIntake } from "@/modules/nutrition/hooks/useHydration";
import { useNutritionDashboard } from "@/modules/nutrition/hooks/useNutritionDashboard";
import { useNutritionSearch, type NutritionSearchSource } from "@/modules/nutrition/hooks/useNutritionSearch";
import {
  buildMealDefinitions,
  createCustomMealDefinition,
  getDefaultMealDefinitions,
  getMealLabel,
  isDefaultMealType,
} from "@/modules/nutrition/meal-helpers";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";
import { getFoodLabel } from "@/modules/nutrition/ui-helpers";
import { getTodayLocalDate } from "@/modules/expenses/utils";
import { downloadMealPlanPdf } from "@/components/nutrition/meal-plan-pdf";

const DEFAULT_WATER_TARGET = 2200;
const DIARY_PAGE_SIZE = 6;

const DEFAULT_GOAL: NutritionGoal = {
  userId: "",
  targetCalories: 2000,
  targetWaterMl: DEFAULT_WATER_TARGET,
  targetProtein: 140,
  targetCarbs: 180,
  targetFat: 65,
  objective: "maintain",
};

type DiaryViewKey = "today" | "history";
const previewAuthUser = {
  uid: "preview-demo-user",
  getIdToken: async () => "",
  devBypass: true,
};

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

function formatSearchSourceLabel(source: NutritionSearchSource): string | null {
  switch (source) {
    case "catalog":
      return "Catalogo do app";
    case "custom":
      return "Meus alimentos";
    case "external":
      return "Novas referencias";
    case "fallback":
      return "Sugestoes do app";
    case "openfoodfacts":
      return "Catalogo aberto";
    case "none":
      return "Sem resultado";
    default:
      return null;
  }
}

export function NutritionScreen() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const today = useMemo(() => getTodayLocalDate(), []);
  const isPreview = process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1";
  const activeUser = user ?? (isPreview ? previewAuthUser : null);

  const [planRejectedFoods, setPlanRejectedFoods] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<NutritionUnit>("g");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [activeArea, setActiveArea] = useState<NutritionArea>("today");
  const [planningTab, setPlanningTab] = useState<PlanningTabKey>("goal");
  const [activeDiaryView, setActiveDiaryView] = useState<DiaryViewKey>("today");
  const [activeDiaryMeal, setActiveDiaryMeal] = useState<MealType>("breakfast");
  const [diaryPage, setDiaryPage] = useState(1);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);
  const [customMealOpen, setCustomMealOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealDefinition | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const canUseBrowserPersistence = Boolean(activeUser && !("devBypass" in activeUser && activeUser.devBypass));

  const dashboardHook = useNutritionDashboard(activeUser, today, canUseBrowserPersistence);
  const searchHook = useNutritionSearch(activeUser, canUseBrowserPersistence);
  const hydrationHook = useHydration();

  const { state: dState, setters: dSetters, actions: dActions } = dashboardHook;
  const { state: sState, setters: sSetters, actions: sActions } = searchHook;
  const { state: hState, setters: hSetters, actions: hActions } = hydrationHook;

  const {
    summary,
    diaryItems,
    diaryMealDefinitions,
    mealPlan,
    goal,
    isLoading,
    storageMode,
    historyPage,
    historyEntries,
    isHistoryLoading,
    historyTotalPages,
  } = dState;
  const { setSummary, setMealPlan, setGoal, setDiaryMealDefinitions, setHistoryPage } = dSetters;
  const { resolveRequestError, loadDashboard, loadBrowserDashboard, hydrateDashboard, loadHistory, loadBrowserHistory, hydrateHistory } = dActions;

  const { isSearching, isEnrichingExternal, searchResults, resultsVisible, searchQuery, barcodeQuery, selectedFood, lastSearchSource, message: searchMessage } = sState;
  const { setSelectedFood } = sSetters;
  const { handleSearchQueryChange, handleBarcodeQueryChange, handleSearch, handleBarcodeLookup, resetSearchComposer, applyFoodSelection, reopenSearchResults } = sActions;

  const { waterDraft, isUpdatingWater, hydrationMode } = hState;
  const { setWaterDraft, setIsUpdatingWater } = hSetters;
  const { handleSelectHydrationMode, handleAdjustWater } = hActions;

  const [message, setMessage] = useState<string | null>(null);
  const [goalInputs, setGoalInputs] = useState<GoalInputState>({
    targetCalories: "2000",
    targetWaterMl: "2200",
    targetProtein: "140",
    targetCarbs: "180",
    targetFat: "65",
  });
  const [goalObjectiveDraft, setGoalObjectiveDraft] = useState<NutritionObjective>("maintain");
  const [, setGoalInputsDirty] = useState(false);
  const [mealPlanDraft, setMealPlanDraft] = useState<MealPlan | null>(null);
  const [planCalories, setPlanCalories] = useState("2000");
  const [workspaceMinHeight, setWorkspaceMinHeight] = useState(0);
  const [planningPanelMinHeight, setPlanningPanelMinHeight] = useState(0);
  const activeWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const activePlanningPanelRef = useRef<HTMLDivElement | null>(null);

  function updateGoalInput(key: keyof GoalInputState, value: string) {
    setGoalInputs((current) => ({ ...current, [key]: value }));
    setGoalInputsDirty(true);
  }

  const mealDefinitions = useMemo(
    () => buildMealDefinitions(diaryItems, diaryMealDefinitions),
    [diaryItems, diaryMealDefinitions],
  );

  function getActiveMealDefinition(selectedMealType: MealType): MealDefinition {
    return (
      mealDefinitions.find((definition) => definition.key === selectedMealType) ?? {
        key: selectedMealType,
        label: getMealLabel(selectedMealType),
      }
    );
  }

  function openSearchForMeal(nextMealType?: MealType) {
    if (nextMealType) {
      setMealType(nextMealType);
      setActiveDiaryMeal(nextMealType);
    }
    handleChangeArea("search");
  }

  function closeCustomMealDialog() {
    setCustomMealOpen(false);
    setEditingMeal(null);
  }

  function openCreateMealDialog() {
    setEditingMeal(null);
    setCustomMealOpen(true);
  }

  function openManageMealDialog(meal: MealDefinition) {
    if (isDefaultMealType(meal.key)) {
      return;
    }

    setEditingMeal(meal);
    setCustomMealOpen(true);
  }

  function handleChangeArea(nextArea: NutritionArea) {
    setActiveArea(nextArea);
  }

  async function persistMealDefinitions(nextMealDefinitions: MealDefinition[], failureMessage: string): Promise<boolean> {
    if (!activeUser) {
      return false;
    }

    if (storageMode === "volatile" && canUseBrowserPersistence) {
      saveNutritionMealDefinitionsToBrowser(
        activeUser.uid,
        today,
        {
          ...DEFAULT_GOAL,
          ...goal,
          userId: activeUser.uid,
          targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        },
        nextMealDefinitions,
      );

      const browserDashboard = loadBrowserDashboard();
      if (browserDashboard) {
        hydrateDashboard(browserDashboard);
      }
      setDiaryMealDefinitions(nextMealDefinitions);
      return true;
    }

    const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diaries/${today}`, {
      method: "PATCH",
      body: JSON.stringify({ mealDefinitions: nextMealDefinitions }),
    });
    if (!response.ok) {
      await resolveRequestError(response, failureMessage);
      return false;
    }

    const payload = (await response.json()) as Partial<NutritionDashboardSnapshot>;
    hydrateDashboard(payload);
    setDiaryMealDefinitions(nextMealDefinitions);
    return true;
  }

  async function handleCreateCustomMeal(label: string) {
    if (!activeUser) return;

    const nextDefinition = createCustomMealDefinition(label, mealDefinitions);
    const nextMealDefinitions = buildMealDefinitions(diaryItems, [...diaryMealDefinitions, nextDefinition]);

    try {
      const saved = await persistMealDefinitions(nextMealDefinitions, "Nao foi possivel criar a nova refeicao agora.");
      if (!saved) {
        return;
      }

      setMealType(nextDefinition.key);
      setActiveDiaryMeal(nextDefinition.key);
      closeCustomMealDialog();
      handleChangeArea("search");
      setMessage(`${nextDefinition.label} pronta para receber itens.`);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel criar a nova refeicao agora.");
    }
  }

  async function handleRenameCustomMeal(label: string) {
    const targetMeal = editingMeal;
    if (!activeUser || !targetMeal || isDefaultMealType(targetMeal.key)) return;

    const normalizedLabel = label.trim().replace(/\s+/g, " ");
    const hasDuplicateLabel = mealDefinitions.some(
      (definition) =>
        definition.key !== targetMeal.key &&
        definition.label.trim().toLocaleLowerCase("pt-BR") === normalizedLabel.toLocaleLowerCase("pt-BR"),
    );
    if (hasDuplicateLabel) {
      setMessage("Ja existe uma refeicao com esse nome.");
      return;
    }

    const nextMealDefinitions = mealDefinitions.map((definition) =>
      definition.key === targetMeal.key ? { ...definition, label: normalizedLabel } : definition,
    );

    try {
      const saved = await persistMealDefinitions(nextMealDefinitions, "Nao foi possivel renomear a refeicao agora.");
      if (!saved) {
        return;
      }

      setActiveDiaryMeal(targetMeal.key);
      closeCustomMealDialog();
      setMessage(`Refeicao atualizada para ${normalizedLabel}.`);
    } catch {
      setMessage((current) => current ?? "Nao foi possivel renomear a refeicao agora.");
    }
  }

  async function handleDeleteCustomMeal() {
    const targetMeal = editingMeal;
    if (!activeUser || !targetMeal || isDefaultMealType(targetMeal.key)) return;

    const targetMealItems = groupedDiaryItems[targetMeal.key] ?? [];
    const nextMealDefinitions = mealDefinitions.filter((definition) => definition.key !== targetMeal.key);
    const fallbackMeal = nextMealDefinitions[0]?.key ?? getDefaultMealDefinitions()[0].key;

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        for (const item of targetMealItems) {
          removeNutritionDiaryItemFromBrowser(activeUser.uid, item.id);
        }

        const saved = await persistMealDefinitions(nextMealDefinitions, "Nao foi possivel excluir a refeicao agora.");
        if (!saved) {
          return;
        }

        const browserHistory = loadBrowserHistory(historyPage);
        if (browserHistory) {
          hydrateHistory(browserHistory);
        }
      } else {
        for (const item of targetMealItems) {
          const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diary-items/${item.id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            await resolveRequestError(response, "Nao foi possivel excluir a refeicao agora.");
            return;
          }
        }

        const saved = await persistMealDefinitions(nextMealDefinitions, "Nao foi possivel excluir a refeicao agora.");
        if (!saved) {
          return;
        }

        await Promise.all([loadDashboard(), loadHistory(historyPage)]);
      }

      if (activeDiaryMeal === targetMeal.key) {
        setActiveDiaryMeal(fallbackMeal);
        setDiaryPage(1);
      }
      if (mealType === targetMeal.key) {
        setMealType(fallbackMeal);
      }
      closeCustomMealDialog();
      setMessage(
        targetMealItems.length > 0
          ? `${targetMeal.label} e ${targetMealItems.length} item(ns) foram removidos do diario de hoje.`
          : `${targetMeal.label} removida do diario de hoje.`,
      );
    } catch {
      setMessage((current) => current ?? "Nao foi possivel excluir a refeicao agora.");
    }
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncLayout);
      return () => mediaQuery.removeEventListener("change", syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  useEffect(() => {
    const fallbackMeal = mealDefinitions[0]?.key ?? getDefaultMealDefinitions()[0].key;

    if (!mealDefinitions.some((definition) => definition.key === activeDiaryMeal)) {
      setActiveDiaryMeal(fallbackMeal);
    }

    if (!mealDefinitions.some((definition) => definition.key === mealType)) {
      setMealType(fallbackMeal);
    }
  }, [activeDiaryMeal, mealDefinitions, mealType]);

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
  }, [activeUser, loadDashboard, loadHistory, setHistoryPage]);

  useEffect(() => {
    setGoalInputs({
      targetCalories: String(goal.targetCalories ?? DEFAULT_GOAL.targetCalories),
      targetWaterMl: String(goal.targetWaterMl ?? DEFAULT_WATER_TARGET),
      targetProtein: String(goal.targetProtein ?? DEFAULT_GOAL.targetProtein),
      targetCarbs: String(goal.targetCarbs ?? DEFAULT_GOAL.targetCarbs),
      targetFat: String(goal.targetFat ?? DEFAULT_GOAL.targetFat),
    });
    setGoalObjectiveDraft(goal.objective ?? DEFAULT_GOAL.objective);
    setPlanCalories(String(goal.targetCalories ?? DEFAULT_GOAL.targetCalories));
  }, [goal]);

  useEffect(() => {
    const node = activeWorkspaceRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      setWorkspaceMinHeight((current) => Math.max(current, Math.ceil(node.getBoundingClientRect().height)));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeArea, planningTab, isMobileLayout]);

  useEffect(() => {
    if (activeArea !== "planning") {
      return;
    }

    const node = activePlanningPanelRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      setPlanningPanelMinHeight((current) => Math.max(current, Math.ceil(node.getBoundingClientRect().height)));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeArea, planningTab, isMobileLayout]);

  async function handleAddDiaryItem() {
    if (!activeUser || !selectedFood) return;
    const activeMealDefinition = getActiveMealDefinition(mealType);

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
          mealLabel: activeMealDefinition.label,
          consumedAt: new Date().toISOString(),
        });

        saveNutritionDiaryItemToBrowser(
          activeUser.uid,
          today,
          {
            ...DEFAULT_GOAL,
            ...goal,
            userId: activeUser.uid,
            targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          },
          snapshot,
        );

        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(1);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);

        handleChangeArea("today");
        setActiveDiaryView("today");
        setActiveDiaryMeal(mealType);
        setHistoryPage(1);
        setMessage(`${getFoodLabel(selectedFood)} adicionado em ${activeMealDefinition.label}.`);
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
          mealLabel: activeMealDefinition.label,
          consumedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel registrar esse alimento.");
        return;
      }

      handleChangeArea("today");
      setActiveDiaryView("today");
      setActiveDiaryMeal(mealType);
      setHistoryPage(1);
      setMessage(`${getFoodLabel(selectedFood)} adicionado em ${activeMealDefinition.label}.`);
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

      const response = await authorizedNutritionFetch(activeUser, `/api/nutrition/diary-items/${itemId}`, {
        method: "DELETE",
      });
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
        setPlanningTab("goal");
        handleChangeArea("planning");
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
      setSummary((current) => ({
        ...current,
        targetCalories: savedGoal.targetCalories,
        targetWaterMl: savedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        remainingCalories: roundValue(savedGoal.targetCalories - current.consumedCalories),
      }));
      setPlanningTab("goal");
      handleChangeArea("planning");
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
        saveNutritionWaterToBrowser(
          activeUser.uid,
          today,
          {
            ...DEFAULT_GOAL,
            ...goal,
            userId: activeUser.uid,
            targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          },
          nextWaterIntake,
        );

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

  async function handleDiscardMealPlan() {
    if (!activeUser) return;

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        clearNutritionMealPlanFromBrowser(activeUser.uid);
        setMealPlan(null);
        setMealPlanDraft(null);
        setPlanRejectedFoods([]);
        setMessage("Plano alimentar descartado.");
        return;
      }

      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/meal-plans", {
        method: "DELETE",
      });
      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel descartar o plano agora.");
        return;
      }

      setMealPlan(null);
      setMealPlanDraft(null);
      setPlanRejectedFoods([]);
      setMessage("Plano alimentar descartado.");
    } catch {
      setMessage((current) => current ?? "Nao foi possivel descartar o plano agora.");
    }
  }

  async function handleGenerateMealPlan() {
    if (!activeUser) return;

    const requestedCalories = parseInputNumber(planCalories);
    if (!requestedCalories || requestedCalories < 500 || requestedCalories > 10000) {
      setMessage("Informe uma meta calorica valida (500 a 10000).");
      return;
    }

    setPlanningTab("plan");
    handleChangeArea("planning");
    setIsGeneratingPlan(true);
    setMessage(null);

    try {
      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/meal-plans/generate", {
        method: "POST",
        body: JSON.stringify({
          targetCalories: requestedCalories,
          objective: goalObjectiveDraft,
          excludedFoods: planRejectedFoods,
        }),
      });

      if (!response.ok) {
        await resolveRequestError(response, "Nao foi possivel gerar opcoes de plano agora.");
        return;
      }

      const payload = (await response.json()) as { plan?: MealPlan; mealPlan?: MealPlan };
      const generatedPlan = payload.plan ?? payload.mealPlan;
      if (!generatedPlan || !generatedPlan.meals.some((meal) => meal.items.length > 0)) {
        setMessage("Nao foi possivel montar um cardapio com as escolhas atuais. Ajuste a meta ou limpe as rejeicoes.");
        return;
      }

      const normalized = normalizeMealPlan(generatedPlan);
      setMealPlanDraft(normalized);
      setMessage("Novo plano gerado. Ajuste as quantidades se desejar.");

      if (storageMode === "volatile" && canUseBrowserPersistence) {
        saveNutritionMealPlanToBrowser(activeUser.uid, normalized);
        const browserDashboard = loadBrowserDashboard();
        if (browserDashboard) hydrateDashboard(browserDashboard);
      }
    } catch {
      setMessage((current) => current ?? "Nao foi possivel gerar opcoes de plano agora.");
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  function handleChangeMealPlanItemQuantity(mealIndex: number, itemIndex: number, nextQuantityValue: number) {
    if (!Number.isFinite(nextQuantityValue) || nextQuantityValue <= 0) return;

    setMealPlanDraft((currentPlan) => {
      if (!currentPlan) return currentPlan;

      const currentItem = currentPlan.meals[mealIndex]?.items[itemIndex];
      if (!currentItem || currentItem.quantity <= 0) return currentPlan;

      const resolvedQuantity =
        currentItem.unit === "serving" || currentItem.unit === "unit"
          ? Number(nextQuantityValue.toFixed(1))
          : Number(nextQuantityValue.toFixed(0));
      const ratio = resolvedQuantity / currentItem.quantity;
      if (!Number.isFinite(ratio) || ratio <= 0) return currentPlan;

      const nextMeals = currentPlan.meals.map((meal, currentMealIndex) => {
        if (currentMealIndex !== mealIndex) return meal;

        return {
          ...meal,
          items: meal.items.map((item, currentItemIndex) =>
            currentItemIndex === itemIndex ? scaleMealPlanItem(item, ratio, resolvedQuantity) : item,
          ),
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
      setPlanRejectedFoods((currentItems) =>
        currentItems.includes(itemName) ? currentItems : [...currentItems, itemName],
      );
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
    const planToExport = mealPlanDraft ?? mealPlan;
    if (!planToExport) return;

    setIsExportingPdf(true);
    setMessage(null);

    try {
      await downloadMealPlanPdf({
        filename: `cardapio-nutricao-${today}.pdf`,
        plan: planToExport,
        targetCalories: parseInputNumber(planCalories) ?? goal.targetCalories,
        objective: goalObjectiveDraft,
        dateLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date()),
        totals: summarizeMealPlan(planToExport),
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

  const groupedDiaryItems = useMemo(() => {
    const groupedItems = Object.fromEntries(
      mealDefinitions.map((definition) => [definition.key, [] as typeof diaryItems]),
    ) as Record<string, typeof diaryItems>;

    for (const item of diaryItems) {
      if (!groupedItems[item.mealType]) {
        groupedItems[item.mealType] = [];
      }
      groupedItems[item.mealType].push(item);
    }

    return groupedItems;
  }, [diaryItems, mealDefinitions]);

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
      ? "Catalogo sincronizado"
      : storageMode === "checking"
        ? "Preparando catalogo"
        : "Catalogo da sessao";
  const searchSourceLabel = formatSearchSourceLabel(lastSearchSource);
  const resultState =
    selectedFood && !resultsVisible
      ? {
          title: "Selecao pronta",
          text:
            searchMessage ??
            "O alimento ja esta separado para registro. Use o compositor ou troque a selecao quando quiser.",
        }
      : {
          title:
            lastSearchSource === "none"
              ? "Nada encontrado"
              : isSearching
                ? "Procurando no catalogo"
                : "Busque um alimento",
          text:
            isSearching || isEnrichingExternal
              ? "Estou procurando no catalogo e preparando novas referencias quando fizer sentido."
              : searchMessage ?? "Digite um nome, use um codigo de barras ou crie um alimento manual para comecar.",
        };
  const planningTabs = (
    <div className="flex flex-wrap gap-[0.55rem]">
      {PLANNING_TABS.map((tab) => (
        <SegmentButton
          key={tab.key}
          active={planningTab === tab.key}
          label={tab.label}
          meta={tab.key === "goal" ? undefined : displayedMealPlan?.meals.length}
          onClick={() => setPlanningTab(tab.key)}
        />
      ))}
    </div>
  );
  const todayWorkspaceContent = (
    <TodayWorkspace
      activeDiaryMeal={activeDiaryMeal}
      groupedDiaryItems={groupedDiaryItems}
      mealDefinitions={mealDefinitions}
      mealSummary={summary.meals}
      embedded={!isMobileLayout}
      onOpenMeal={(meal) => {
        handleChangeArea("today");
        setActiveDiaryView("today");
        setActiveDiaryMeal(meal);
        setDiaryPage(1);
      }}
      onOpenSearchForMeal={openSearchForMeal}
      onManageMeal={openManageMealDialog}
      onAddMeal={openCreateMealDialog}
    >
      <DiaryPanel
        activeDiaryView={activeDiaryView}
        setActiveDiaryView={setActiveDiaryView}
        setDiaryPage={setDiaryPage}
        summary={summary}
        waterRatio={waterRatio}
        hydrationMode={hydrationMode}
        handleSelectHydrationMode={handleSelectHydrationMode}
        isMobileLayout={isMobileLayout}
        handleAdjustWater={handleAdjustWater}
        waterDraft={waterDraft}
        setWaterDraft={setWaterDraft}
        handleSaveWater={handleSaveWater}
        isUpdatingWater={isUpdatingWater}
        mealDefinitions={mealDefinitions}
        activeDiaryMeal={activeDiaryMeal}
        setActiveDiaryMeal={setActiveDiaryMeal}
        groupedDiaryItems={groupedDiaryItems}
        activeDiaryItems={activeDiaryItems}
        diaryPage={diaryPage}
        diaryTotalPages={diaryTotalPages}
        isLoading={isLoading}
        pagedDiaryItems={pagedDiaryItems}
        handleDeleteDiaryItem={handleDeleteDiaryItem}
        isHistoryLoading={isHistoryLoading}
        historyEntries={historyEntries}
        historyPage={historyPage}
        historyTotalPages={historyTotalPages}
        loadHistory={(page) => void loadHistory(page)}
        onManageMeal={openManageMealDialog}
      />
    </TodayWorkspace>
  );
  const searchWorkspaceContent = (
    <FoodSearchPanel
      storageMode={storageMode}
      isMobileLayout={isMobileLayout}
      embedded={!isMobileLayout}
      mealOptions={mealDefinitions}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      onSearch={() => void handleSearch()}
      isSearching={isSearching}
      isEnrichingExternal={isEnrichingExternal}
      barcodeQuery={barcodeQuery}
      onBarcodeQueryChange={handleBarcodeQueryChange}
      onBarcodeLookup={(value) => void handleBarcodeLookup(value)}
      onOpenScanner={() => setScannerOpen(true)}
      searchSourceLabel={searchSourceLabel}
      searchFeedback={searchMessage}
      resultsVisible={resultsVisible}
      searchResults={searchResults}
      resultState={resultState}
      onApplyFoodSelection={applyFoodSelection}
      onCustomFoodOpen={() => setCustomFoodOpen(true)}
      onClearSearch={() => {
        resetSearchComposer();
        setMessage(null);
      }}
      selectedFood={selectedFood}
      selectedFoodTotals={selectedFoodTotals}
      onReopenSearchResults={reopenSearchResults}
      quantity={quantity}
      onQuantityChange={setQuantity}
      unit={unit}
      onUnitChange={setUnit}
      mealType={mealType}
      onMealTypeChange={(value) => {
        setMealType(value);
        setActiveDiaryMeal(value);
      }}
      onAddDiaryItem={() => void handleAddDiaryItem()}
      searchCatalogBadge={searchCatalogBadge}
    />
  );
  const planningWorkspaceContent = (
    <section className="grid gap-4">
      {isMobileLayout ? (
        <div className="glass-panel static-panel rounded-[1.2rem] bg-[#06162d]/58 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <strong className="block font-['Outfit',sans-serif] text-[1.08rem] text-[var(--text-primary)]">
                Planejamento nutricional
              </strong>
              <span className="text-[0.88rem] text-[var(--text-secondary)]">
                Defina sua meta e monte um cardapio diario para ajustar depois.
              </span>
            </div>
            {displayedMealPlan ? <span className="badge badge-success">{displayedMealPlan.meals.length} refeicoes</span> : null}
          </div>

          {planningTabs}
        </div>
      ) : (
        <div className="glass-panel static-panel rounded-[1.2rem] bg-[#06162d]/44 p-3.5">
          {planningTabs}
        </div>
      )}

      <div
        className="min-w-0"
        style={planningPanelMinHeight > 0 ? { minHeight: `${planningPanelMinHeight}px` } : undefined}
      >
        <div ref={activePlanningPanelRef} className="min-w-0">
          {planningTab === "goal" ? (
          <GoalPanel
            goal={goal}
            summary={summary}
            goalInputs={goalInputs}
            goalObjectiveDraft={goalObjectiveDraft}
            isSavingGoal={isSavingGoal}
            defaultWaterTarget={DEFAULT_WATER_TARGET}
            onUpdateGoalInput={updateGoalInput}
            onChangeObjective={(objective) => {
              setGoalInputsDirty(true);
              setGoalObjectiveDraft(objective);
            }}
            onSaveGoal={() => void handleSaveGoal()}
          />
          ) : (
          <MealPlanPanel
            displayedMealPlan={displayedMealPlan}
            planTotals={planTotals}
            planCalories={planCalories}
            requestedPlanCalories={requestedPlanCalories}
            planDelta={planDelta}
            planRejectedFoods={planRejectedFoods}
            isGeneratingPlan={isGeneratingPlan}
            isExportingPdf={isExportingPdf}
            isMobileLayout={isMobileLayout}
            onPlanCaloriesChange={setPlanCalories}
            onGenerateMealPlan={() => void handleGenerateMealPlan()}
            onUseGoalCalories={() => setPlanCalories(String(goal.targetCalories))}
            onExportPdf={() => void handleExportMealPlanPdf()}
            onDiscardMealPlan={() => void handleDiscardMealPlan()}
            onClearRejections={() => setPlanRejectedFoods([])}
            onChangeQuantity={handleChangeMealPlanItemQuantity}
            onRejectItem={handleRejectMealPlanItem}
          />
          )}
        </div>
      </div>
    </section>
  );
  const activeWorkspaceContent =
    activeArea === "today"
      ? isMobileLayout
        ? todayWorkspaceContent
        : <NutritionWorkspaceFrame activeArea="today">{todayWorkspaceContent}</NutritionWorkspaceFrame>
      : activeArea === "search"
        ? isMobileLayout
          ? searchWorkspaceContent
          : <NutritionWorkspaceFrame activeArea="search">{searchWorkspaceContent}</NutritionWorkspaceFrame>
        : isMobileLayout
          ? planningWorkspaceContent
          : <NutritionWorkspaceFrame activeArea="planning">{planningWorkspaceContent}</NutritionWorkspaceFrame>;

  const workspaceContent = (
    <div
      className="min-w-0"
      style={workspaceMinHeight > 0 ? { minHeight: `${workspaceMinHeight}px` } : undefined}
    >
      <div ref={activeWorkspaceRef} className="min-w-0">
        {activeWorkspaceContent}
      </div>
    </div>
  );

  const pageContent = (
    <NutritionLayout isMobileLayout={isMobileLayout}>
      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          void handleBarcodeLookup(code);
        }}
      />
      <CustomMealDialog
        key={`${editingMeal?.key ?? "new"}:${customMealOpen ? "open" : "closed"}`}
        open={customMealOpen}
        onClose={closeCustomMealDialog}
        initialLabel={editingMeal?.label}
        title={editingMeal ? "Gerenciar refeicao" : "Nova refeicao"}
        description={
          editingMeal
            ? "Atualize o nome do bloco extra ou exclua a refeicao com todos os itens lancados nela."
            : "Nomeie um bloco extra como Pre treino, Ceia ou Sobremesa."
        }
        confirmLabel={editingMeal ? "Salvar nome" : "Continuar"}
        deleteAction={
          editingMeal
            ? {
                onDelete: () => {
                  void handleDeleteCustomMeal();
                },
                label:
                  (groupedDiaryItems[editingMeal.key]?.length ?? 0) > 0
                    ? "Excluir refeicao e itens"
                    : "Excluir refeicao",
                hint:
                  (groupedDiaryItems[editingMeal.key]?.length ?? 0) > 0
                    ? `Excluir tambem remove ${groupedDiaryItems[editingMeal.key]?.length ?? 0} item(ns) registrados nela.`
                    : "Excluir remove esse bloco extra do diario de hoje.",
              }
            : undefined
        }
        onCreate={(label) => {
          if (editingMeal) {
            void handleRenameCustomMeal(label);
            return;
          }

          void handleCreateCustomMeal(label);
        }}
      />
      <CustomFoodDialog
        authUser={activeUser}
        open={customFoodOpen}
        onClose={() => setCustomFoodOpen(false)}
        onCreated={(food) => {
          setCustomFoodOpen(false);
          setMessage(`Alimento ${food.name} cadastrado.`);
          setSelectedFood(food);
        }}
      />

      <NutritionHeader
        isMobileLayout={isMobileLayout}
        isPreview={isPreview}
        summary={summary}
        goal={goal}
        waterRatio={waterRatio}
        consumedRatio={consumedRatio}
      />

      <NutritionWorkspaceNav
        activeArea={activeArea}
        isMobileLayout={isMobileLayout}
        onChangeArea={handleChangeArea}
      />

      {message ? (
        <div className="glass-panel static-panel anim-enter mb-4 border-[#34d399]/20 p-[0.9rem_1rem]">
          <p className="text-[var(--text-secondary)]">{message}</p>
        </div>
      ) : null}

      {workspaceContent}
    </NutritionLayout>
  );

  if (isPreview) return pageContent;
  return <ProtectedRoute>{pageContent}</ProtectedRoute>;
}
