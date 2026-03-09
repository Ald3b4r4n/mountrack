"use client";


import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BarcodeScannerDialog } from "@/components/nutrition/BarcodeScannerDialog";
import { CustomFoodDialog } from "./CustomFoodDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearNutritionMealPlanFromBrowser,
  saveNutritionDiaryItemToBrowser,
  saveNutritionGoalToBrowser,
  saveNutritionMealPlanToBrowser,
  saveNutritionWaterToBrowser,
  removeNutritionDiaryItemFromBrowser,
  type NutritionDashboardSnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import { getFoodLabel } from "@/modules/nutrition/ui-helpers";
import { downloadMealPlanPdf } from "@/components/nutrition/meal-plan-pdf";
import type {
  MealPlan,
  MealPlanItem,
  MealType,
  NutritionGoal,
  NutritionObjective,
  NutritionTotals,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import { useNutritionDashboard } from "@/modules/nutrition/hooks/useNutritionDashboard";
import { useNutritionSearch } from "@/modules/nutrition/hooks/useNutritionSearch";
import { useHydration, buildNextWaterIntake } from "@/modules/nutrition/hooks/useHydration";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { SegmentButton } from "@/components/nutrition/CommonUI";
import { WORKSPACE_TABS, ActiveWorkspace } from "@/modules/nutrition/constants";
import { FoodSearchPanel } from "@/components/nutrition/FoodSearchPanel";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import { GoalPanel } from "@/components/nutrition/GoalPanel";
import { MealPlanPanel } from "@/components/nutrition/MealPlanPanel";
import { NutritionLayout } from "@/components/nutrition/NutritionLayout";
import { getTodayLocalDate } from "@/modules/expenses/utils";

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

type ActiveSurface = "search" | "workspace";
type DiaryViewKey = "today" | "history";
type NutritionSearchSource = "catalog" | "external" | "fallback" | "none" | "openfoodfacts" | null;
type GoalInputState = {
  targetCalories: string;
  targetWaterMl: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
};

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
  
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>("diary");
  const [activeSurface, setActiveSurface] = useState<ActiveSurface>("search");
  const [activeDiaryView, setActiveDiaryView] = useState<DiaryViewKey>("today");
  const [activeDiaryMeal, setActiveDiaryMeal] = useState<MealType>("breakfast");
  const [diaryPage, setDiaryPage] = useState(1);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const canUseBrowserPersistence = Boolean(activeUser && !("devBypass" in activeUser && activeUser.devBypass));
  
  const dashboardHook = useNutritionDashboard(activeUser, today, canUseBrowserPersistence);
  const searchHook = useNutritionSearch(activeUser, canUseBrowserPersistence);
  const hydrationHook = useHydration();
  
  const {  state: dState, setters: dSetters, actions: dActions } = dashboardHook;
  const { state: sState, setters: sSetters, actions: sActions } = searchHook;
  const { state: hState, setters: hSetters, actions: hActions } = hydrationHook;

  const { summary, diaryItems, mealPlan, goal, isLoading, storageMode, historyPage, historyEntries, isHistoryLoading, historyTotalPages } = dState;
  const { setSummary, setMealPlan, setGoal, setHistoryPage } = dSetters;
  const { resolveRequestError, loadDashboard, loadBrowserDashboard, hydrateDashboard, loadHistory, loadBrowserHistory, hydrateHistory } = dActions;

  const { isSearching, searchResults, resultsVisible, searchQuery, barcodeQuery, selectedFood, lastSearchSource } = sState;
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

  function updateGoalInput(key: keyof GoalInputState, value: string) {
    setGoalInputs((current) => ({ ...current, [key]: value }));
    setGoalInputsDirty(true);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser]);





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
        setMessage(`${getFoodLabel(selectedFood)} adicionado ao diário.`);
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
      setMessage(`${getFoodLabel(selectedFood)} adicionado ao diário.`);
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
        await resolveRequestError(response, "Não foi possível remover esse item do diário.");
        return;
      }
      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
    } catch {
      setMessage((current) => current ?? "Não foi possível remover esse item do diário.");
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
      setMessage((current: string | null) => current ?? "Nao foi possivel descartar o cardapio agora.");
    }
  }

  async function handleGenerateMealPlan() {
    if (!activeUser) return;
    const requestedCalories = parseInputNumber(planCalories);
    if (!requestedCalories || requestedCalories < 500 || requestedCalories > 10000) {
      setMessage("Informe uma meta calórica válida (500 a 10000).");
      return;
    }
    
    setIsGeneratingPlan(true);
    setMessage(null);
    try {
      const response = await authorizedNutritionFetch(activeUser, "/api/nutrition/meal-plans/generate", {
        method: "POST",
        body: JSON.stringify({ 
          targetCalories: requestedCalories, 
          objective: goalObjectiveDraft,
          rejectedFoods: planRejectedFoods
        }),
      });
      
      if (!response.ok) {
        await resolveRequestError(response, "Não foi possível gerar opções de cardápio agora.");
        return;
      }
      
      const payload = (await response.json()) as { plan?: MealPlan };
      if (!payload.plan) {
        setMessage("Serviço retornou um cardápio vazio.");
        return;
      }
      
      const normalized = normalizeMealPlan(payload.plan);
      setMealPlanDraft(normalized);
      setMessage("Novas opções de cardápio geradas! Ajuste as quantidades se desejar.");
      
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        saveNutritionMealPlanToBrowser(activeUser.uid, normalized);
        const browserDashboard = loadBrowserDashboard();
        if (browserDashboard) hydrateDashboard(browserDashboard);
      }
    } catch {
      setMessage((current: string | null) => current ?? "Não foi possível gerar opções de cardápio agora.");
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
        ? "Verificando base de dados"
        : "Base de dados inativa";
  const searchSourceLabel = formatSearchSourceLabel(lastSearchSource);
  const resultState = selectedFood && !resultsVisible
    ? { title: "Resultados recolhidos", text: "Selecao pronta. Limpe ou faca outra busca para trocar o alimento." }
    : { title: "Nenhum alimento listado", text: isSearching ? "Consultando fontes de alimentos..." : "Faca uma busca para ver resultados aqui." };

  const pageContent = (
    <NutritionLayout isMobileLayout={isMobileLayout}>
        <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => { setScannerOpen(false); void handleBarcodeLookup(code); }}
      />
      <CustomFoodDialog
        open={customFoodOpen}
        onClose={() => setCustomFoodOpen(false)}
        onCreated={(food) => {
          setCustomFoodOpen(false);
          setMessage(`Alimento ${food.name} cadastrado!`);
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

        {message ? <div className="glass-panel static-panel anim-enter p-[0.9rem_1rem] mb-4 border-[#34d399]/20"><p className="text-[var(--text-secondary)]">{message}</p></div> : null}

        {isMobileLayout ? (
          <div className="flex gap-[0.55rem] flex-wrap mb-4">
            <SegmentButton active={activeSurface === "search"} label="Busca" onClick={() => setActiveSurface("search")} />
            <SegmentButton active={activeSurface === "workspace"} label={activeWorkspace === "diary" ? "Diário" : activeWorkspace === "goal" ? "Meta" : "Cardápio"} onClick={() => setActiveSurface("workspace")} />
          </div>
        ) : null}

        <section className={`grid items-start ${isMobileLayout ? "gap-[0.85rem] grid-cols-1" : "gap-4 grid-cols-2"}`}>
          {(!isMobileLayout || activeSurface === "search") ? (
          <FoodSearchPanel
            storageMode={storageMode}
            isMobileLayout={isMobileLayout}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            onSearch={() => void handleSearch()}
            isSearching={isSearching}
            barcodeQuery={barcodeQuery}
            onBarcodeQueryChange={handleBarcodeQueryChange}
            onBarcodeLookup={(val) => void handleBarcodeLookup(val)}
            onOpenScanner={() => setScannerOpen(true)}
            searchSourceLabel={searchSourceLabel}
            resultsVisible={resultsVisible}
            searchResults={searchResults}
            resultState={resultState}
            onApplyFoodSelection={applyFoodSelection}
            onCustomFoodOpen={() => setCustomFoodOpen(true)}
            onClearSearch={() => { resetSearchComposer(); setMessage(null); }}
            selectedFood={selectedFood}
            selectedFoodTotals={selectedFoodTotals}
            onReopenSearchResults={reopenSearchResults}
            quantity={quantity}
            onQuantityChange={setQuantity}
            unit={unit}
            onUnitChange={setUnit}
            mealType={mealType}
            onMealTypeChange={setMealType}
            onAddDiaryItem={() => void handleAddDiaryItem()}
            searchCatalogBadge={searchCatalogBadge}
          />
          ) : null}
          {(!isMobileLayout || activeSurface === "workspace") ? (
            <section className="grid gap-[0.85rem]">
              <div className="flex gap-[0.55rem] flex-wrap">
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
                  loadHistory={loadHistory}
                />
              ) : null}

              {activeWorkspace === "goal" ? (
                <GoalPanel
                  goal={goal}
                  summary={summary}
                  goalInputs={goalInputs}
                  goalObjectiveDraft={goalObjectiveDraft}
                  isSavingGoal={isSavingGoal}
                  defaultWaterTarget={DEFAULT_WATER_TARGET}
                  onUpdateGoalInput={updateGoalInput}
                  onChangeObjective={(objective) => { setGoalInputsDirty(true); setGoalObjectiveDraft(objective); }}
                  onSaveGoal={() => void handleSaveGoal()}
                />
              ) : null}
              {activeWorkspace === "plan" ? (
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
              ) : null}
            </section>
          ) : null}
        </section>
    </NutritionLayout>
  );

  if (isPreview) return pageContent;
  return <ProtectedRoute>{pageContent}</ProtectedRoute>;
}

