import {
  clearNutritionMealPlanFromBrowser,
  copyNutritionDiaryItemInBrowser,
  removeNutritionDiaryItemFromBrowser,
  replaceNutritionDiaryItemInBrowser,
  saveNutritionDiaryItemToBrowser,
  saveNutritionGoalToBrowser,
  saveNutritionMealPlanToBrowser,
  saveNutritionWaterToBrowser,
  type NutritionDashboardSnapshot,
  type NutritionHistorySnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import type {
  DailySummary,
  FoodItem,
  MealDefinition,
  MealPlan,
  MealType,
  NutritionGoal,
  NutritionObjective,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";
import { buildNextWaterIntake } from "@/modules/nutrition/hooks/useHydration";
import type { NutritionUiStorageMode } from "@/modules/nutrition/hooks/useNutritionDashboard";
import { createDiaryItemSnapshot } from "@/modules/nutrition/services/daily-calories.service";
import { getFoodLabel } from "@/modules/nutrition/ui-helpers";
import { downloadMealPlanPdf } from "@/components/nutrition/meal-plan-pdf";
import type { GoalInputState } from "@/components/nutrition/GoalPanel";
import type { PlanningTabKey } from "@/modules/nutrition/constants";
import {
  normalizeMealPlan,
  parseInputNumber,
  parseNonNegativeInputNumber,
  roundValue,
  scaleMealPlanItem,
  summarizeMealPlan,
} from "@/components/nutrition/nutrition-screen-helpers";
import { toast } from "sonner";

const DEFAULT_WATER_TARGET = 2200;

type ActiveNutritionUser = Parameters<typeof authorizedNutritionFetch>[0];
type StateSetter<T> = (value: T | ((current: T) => T)) => void;
type HydrationMode = "increment" | "absolute";

interface NutritionScreenActionsDeps {
  activeUser: ActiveNutritionUser | null;
  today: string;
  searchTargetDate?: string | null;
  storageMode: NutritionUiStorageMode;
  canUseBrowserPersistence: boolean;
  historyPage: number;
  summary: DailySummary;
  diaryItems: ReturnType<typeof createDiaryItemSnapshot>[];
  goal: NutritionGoal;
  goalInputs: GoalInputState;
  goalObjectiveDraft: NutritionObjective;
  selectedFood: FoodItem | null;
  quantity: string;
  unit: NutritionUnit;
  mealType: MealType;
  waterDraft: string;
  hydrationMode: HydrationMode;
  planRejectedFoods: string[];
  planCalories: string;
  mealPlan: MealPlan | null;
  mealPlanDraft: MealPlan | null;
  getActiveMealDefinition: (mealType: MealType) => MealDefinition;
  focusTodayDashboard: (options?: {
    openMealsSummary?: boolean;
    openDiaryPanel?: boolean;
  }) => void;
  announceDiarySuccess: (
    foodLabel: string,
    mealDefinition: MealDefinition,
  ) => void;
  resetSearchComposer: (clearInputs?: boolean) => void;
  handleChangeArea: (nextArea: "today" | "search" | "planning") => void;
  setActiveDiaryMeal: StateSetter<MealType>;
  setHistoryPage: StateSetter<number>;
  setMessage: StateSetter<string | null>;
  setGoal: StateSetter<NutritionGoal>;
  setSummary: StateSetter<DailySummary>;
  setPlanningTab: StateSetter<PlanningTabKey>;
  setGoalInputsDirty: StateSetter<boolean>;
  setIsSavingGoal: StateSetter<boolean>;
  setIsUpdatingWater: StateSetter<boolean>;
  setWaterDraft: StateSetter<string>;
  setMealPlan: StateSetter<MealPlan | null>;
  setMealPlanDraft: StateSetter<MealPlan | null>;
  setPlanRejectedFoods: StateSetter<string[]>;
  setIsGeneratingPlan: StateSetter<boolean>;
  setIsExportingPdf: StateSetter<boolean>;
  setCustomWaterOpen: StateSetter<boolean>;
  setSearchTargetDate?: StateSetter<string | null>;
  loadBrowserDashboard: () => NutritionDashboardSnapshot | null;
  loadBrowserHistory: (page: number) => NutritionHistorySnapshot | null;
  hydrateDashboard: (snapshot: Partial<NutritionDashboardSnapshot>) => void;
  hydrateHistory: (snapshot: Partial<NutritionHistorySnapshot>) => void;
  loadDashboard: () => Promise<NutritionUiStorageMode | string>;
  loadHistory: (
    page: number,
    modeOverride?: NutritionUiStorageMode,
  ) => Promise<void>;
  resolveRequestError: (
    response: Response,
    fallbackMessage: string,
  ) => Promise<string>;
  loadRecentFoods?: () => Promise<void> | void;
}

export function useNutritionScreenActions({
  activeUser,
  today,
  searchTargetDate,
  storageMode,
  canUseBrowserPersistence,
  historyPage,
  summary,
  diaryItems,
  goal,
  goalInputs,
  goalObjectiveDraft,
  selectedFood,
  quantity,
  unit,
  mealType,
  waterDraft,
  hydrationMode,
  planRejectedFoods,
  planCalories,
  mealPlan,
  mealPlanDraft,
  getActiveMealDefinition,
  focusTodayDashboard,
  announceDiarySuccess,
  resetSearchComposer,
  handleChangeArea,
  setActiveDiaryMeal,
  setHistoryPage,
  setMessage,
  setGoal,
  setSummary,
  setPlanningTab,
  setGoalInputsDirty,
  setIsSavingGoal,
  setIsUpdatingWater,
  setWaterDraft,
  setMealPlan,
  setMealPlanDraft,
  setPlanRejectedFoods,
  setIsGeneratingPlan,
  setIsExportingPdf,
  setCustomWaterOpen,
  setSearchTargetDate,
  loadBrowserDashboard,
  loadBrowserHistory,
  hydrateDashboard,
  hydrateHistory,
  loadDashboard,
  loadHistory,
  resolveRequestError,
  loadRecentFoods,
}: NutritionScreenActionsDeps) {
  function scaleDiaryItemSnapshotQuantity(
    currentItem: ReturnType<typeof createDiaryItemSnapshot>,
    nextQuantity: number,
    nextMealType: MealType,
    nextMealLabel: string,
  ) {
    const currentQuantity = currentItem.quantity > 0 ? currentItem.quantity : 1;
    const ratio = nextQuantity / currentQuantity;
    const scaleValue = (value: number) => Number((value * ratio).toFixed(2));

    return {
      ...currentItem,
      quantity: nextQuantity,
      mealType: nextMealType,
      mealLabel: nextMealLabel,
      calories: scaleValue(currentItem.calories),
      protein: scaleValue(currentItem.protein),
      carbs: scaleValue(currentItem.carbs),
      fat: scaleValue(currentItem.fat),
      fiber: scaleValue(currentItem.fiber),
      sodium: scaleValue(currentItem.sodium),
    };
  }

  function resolveGoalFromInputs(): NutritionGoal | null {
    const targetCalories = parseNonNegativeInputNumber(
      goalInputs.targetCalories,
    );
    const targetWaterMl = parseNonNegativeInputNumber(goalInputs.targetWaterMl);
    const targetProtein = parseNonNegativeInputNumber(goalInputs.targetProtein);
    const targetCarbs = parseNonNegativeInputNumber(goalInputs.targetCarbs);
    const targetFat = parseNonNegativeInputNumber(goalInputs.targetFat);

    if (targetCalories == null || targetCalories <= 0) {
      return null;
    }

    if (
      targetWaterMl == null ||
      targetProtein == null ||
      targetCarbs == null ||
      targetFat == null
    ) {
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

  async function handleAddDiaryItem() {
    if (!activeUser || !selectedFood) return;
    const activeMealDefinition = getActiveMealDefinition(mealType);
    const targetDate = searchTargetDate ?? today;

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
          targetDate,
          {
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
        void loadRecentFoods?.();

        if (targetDate === today) {
          focusTodayDashboard();
          setActiveDiaryMeal(mealType);
          setHistoryPage(1);
          announceDiarySuccess(
            getFoodLabel(selectedFood),
            activeMealDefinition,
          );
        } else {
          handleChangeArea("today");
          setMessage(`Alimento registrado em ${targetDate}.`);
        }
        resetSearchComposer(true);
        if (targetDate !== today) {
          setSearchTargetDate?.(null);
        }
        return;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        "/api/nutrition/diary-items",
        {
          method: "POST",
          body: JSON.stringify({
            date: targetDate,
            foodId: selectedFood.id,
            foodSnapshot: selectedFood,
            quantity: parsedQuantity,
            unit,
            mealType,
            mealLabel: activeMealDefinition.label,
            consumedAt: new Date().toISOString(),
          }),
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível registrar esse alimento.",
        );
        return;
      }

      if (targetDate === today) {
        focusTodayDashboard();
        setActiveDiaryMeal(mealType);
        setHistoryPage(1);
        announceDiarySuccess(getFoodLabel(selectedFood), activeMealDefinition);
      } else {
        handleChangeArea("today");
        setMessage(`Alimento registrado em ${targetDate}.`);
      }
      resetSearchComposer(true);
      if (targetDate !== today) {
        setSearchTargetDate?.(null);
      }
      await Promise.all([loadDashboard(), loadHistory(1)]);
      void loadRecentFoods?.();
    } catch {
      setMessage(
        (current) => current ?? "Não foi possível registrar esse alimento.",
      );
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
        setMessage(null);
        toast.success("Item removido do diário.");
        return;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/diary-items/${itemId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível remover esse item do diário.",
        );
        return;
      }

      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
      setMessage(null);
      toast.success("Item removido do diário.");
    } catch {
      setMessage(
        (current) => current ?? "Não foi possível remover esse item do diário.",
      );
    }
  }

  async function handleCopyDiaryItem({
    itemId,
    targetMealType,
    targetDate,
    successMessage,
  }: {
    itemId: string;
    targetMealType: MealType;
    targetDate?: string | null;
    successMessage?: string;
  }): Promise<boolean> {
    if (!activeUser) return false;

    const resolvedTargetDate = targetDate ?? searchTargetDate ?? today;
    const targetMealDefinition = getActiveMealDefinition(targetMealType);
    const consumedAt = new Date().toISOString();

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        const copiedItem = copyNutritionDiaryItemInBrowser(
          activeUser.uid,
          itemId,
          {
            ...goal,
            userId: activeUser.uid,
            targetWaterMl: goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          },
          {
            targetDate: resolvedTargetDate,
            targetMealType,
            targetMealLabel: targetMealDefinition.label,
            consumedAt,
          },
        );

        if (!copiedItem) {
          setMessage("Não foi possível copiar esse alimento agora.");
          return false;
        }

        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(resolvedTargetDate === today ? 1 : historyPage);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);
        void loadRecentFoods?.();

        if (resolvedTargetDate === today) {
          setActiveDiaryMeal(targetMealType);
          setHistoryPage(1);
          focusTodayDashboard();
        } else {
          handleChangeArea("today");
        }

        const messageText =
          successMessage ?? `Alimento copiado para ${targetMealDefinition.label}.`;
        setMessage(messageText);
        toast.success(messageText);
        return true;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/diary-items/${itemId}/copy`,
        {
          method: "POST",
          body: JSON.stringify({
            targetDate: resolvedTargetDate,
            targetMealType,
            targetMealLabel: targetMealDefinition.label,
            consumedAt,
          }),
        },
      );

      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível copiar esse alimento agora.",
        );
        return false;
      }

      if (resolvedTargetDate === today) {
        setActiveDiaryMeal(targetMealType);
        setHistoryPage(1);
        focusTodayDashboard();
      } else {
        handleChangeArea("today");
      }

      const historyToLoad = resolvedTargetDate === today ? 1 : historyPage;
      await Promise.all([loadDashboard(), loadHistory(historyToLoad)]);
      void loadRecentFoods?.();

      const messageText =
        successMessage ?? `Alimento copiado para ${targetMealDefinition.label}.`;
      setMessage(messageText);
      toast.success(messageText);
      return true;
    } catch {
      setMessage(
        (current) => current ?? "Não foi possível copiar esse alimento agora.",
      );
      return false;
    }
  }

  async function handleUpdateDiaryItem({
    itemId,
    quantity: nextQuantity,
    mealType: nextMealType,
  }: {
    itemId: string;
    quantity: number;
    mealType: MealType;
  }): Promise<boolean> {
    if (!activeUser) return false;

    const currentItem = diaryItems.find((item) => item.id === itemId);
    if (!currentItem) {
      setMessage("Nao foi possivel localizar esse item do diario.");
      return false;
    }

    const nextMealDefinition = getActiveMealDefinition(nextMealType);

    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        replaceNutritionDiaryItemInBrowser(
          activeUser.uid,
          itemId,
          scaleDiaryItemSnapshotQuantity(
            currentItem,
            nextQuantity,
            nextMealType,
            nextMealDefinition.label,
          ),
        );
        const browserDashboard = loadBrowserDashboard();
        const browserHistory = loadBrowserHistory(historyPage);
        if (browserDashboard) hydrateDashboard(browserDashboard);
        if (browserHistory) hydrateHistory(browserHistory);
        setActiveDiaryMeal(nextMealType);
        setMessage("Item da refeicao atualizado.");
        return true;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/diary-items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            date: today,
            foodId: currentItem.foodId,
            quantity: nextQuantity,
            unit: currentItem.unit,
            mealType: nextMealType,
            mealLabel: nextMealDefinition.label,
            consumedAt: currentItem.consumedAt,
          }),
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Nao foi possivel atualizar esse item do diario.",
        );
        return false;
      }

      setActiveDiaryMeal(nextMealType);
      setMessage("Item da refeicao atualizado.");
      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
      return true;
    } catch {
      setMessage(
        (current) =>
          current ?? "Nao foi possivel atualizar esse item do diario.",
      );
      return false;
    }
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

      const response = await authorizedNutritionFetch(
        activeUser,
        "/api/nutrition/goals",
        {
          method: "PUT",
          body: JSON.stringify({
            targetCalories: requestedGoal.targetCalories,
            targetWaterMl: requestedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
            targetProtein: requestedGoal.targetProtein,
            targetCarbs: requestedGoal.targetCarbs,
            targetFat: requestedGoal.targetFat,
            objective: requestedGoal.objective,
          }),
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível atualizar a meta nutricional.",
        );
        return;
      }

      const payload = (await response.json()) as { goal?: NutritionGoal };
      const savedGoal = {
        ...requestedGoal,
        ...(payload.goal ?? {}),
        userId: payload.goal?.userId ?? activeUser.uid,
        targetWaterMl:
          payload.goal?.targetWaterMl ??
          requestedGoal.targetWaterMl ??
          DEFAULT_WATER_TARGET,
      } satisfies NutritionGoal;

      setGoalInputsDirty(false);
      setGoal(savedGoal);
      setSummary((current) => ({
        ...current,
        targetCalories: savedGoal.targetCalories,
        targetWaterMl: savedGoal.targetWaterMl ?? DEFAULT_WATER_TARGET,
        remainingCalories: roundValue(
          savedGoal.targetCalories - current.consumedCalories,
        ),
      }));
      setPlanningTab("goal");
      handleChangeArea("planning");
      setMessage("Meta nutricional atualizada.");
      await Promise.all([loadDashboard(), loadHistory(historyPage)]);
    } catch {
      setMessage(
        (current) =>
          current ?? "Não foi possível atualizar a meta nutricional.",
      );
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleSaveWater() {
    if (!activeUser) return;

    const nextWaterIntake = buildNextWaterIntake(
      summary.waterIntakeMl,
      waterDraft,
      hydrationMode,
    );
    if (nextWaterIntake == null) {
      setMessage(
        hydrationMode === "absolute"
          ? "Informe o total correto de água antes de salvar."
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
        setWaterDraft(
          hydrationMode === "absolute"
            ? String(Math.round(nextWaterIntake))
            : "",
        );
        setMessage(
          hydrationMode === "absolute"
            ? "Total de água corrigido."
            : "Ingestão de água atualizada.",
        );
        return;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/diaries/${today}`,
        {
          method: "PATCH",
          body: JSON.stringify({ waterIntakeMl: nextWaterIntake }),
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível atualizar a água do dia.",
        );
        return;
      }

      const payload =
        (await response.json()) as Partial<NutritionDashboardSnapshot>;
      hydrateDashboard(payload);
      setWaterDraft(
        hydrationMode === "absolute" ? String(Math.round(nextWaterIntake)) : "",
      );
      setMessage(
        hydrationMode === "absolute"
          ? "Total de água corrigido."
          : "Ingestão de água atualizada.",
      );
      await loadHistory(historyPage);
    } catch {
      setMessage(
        (current) => current ?? "Não foi possível atualizar a água do dia.",
      );
    } finally {
      setIsUpdatingWater(false);
    }
  }

  async function handleSaveCustomWater(
    amount: number,
    mode: "increment" | "absolute",
  ) {
    if (!activeUser) return;

    let nextWaterIntake: number;
    if (mode === "absolute") {
      nextWaterIntake = amount;
    } else {
      nextWaterIntake = Math.max(0, summary.waterIntakeMl + amount);
    }

    setIsUpdatingWater(true);
    setMessage(null);
    try {
      if (storageMode === "volatile" && canUseBrowserPersistence) {
        saveNutritionWaterToBrowser(
          activeUser.uid,
          today,
          {
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
        setCustomWaterOpen(false);
        setMessage(
          mode === "absolute"
            ? "Total de água corrigido."
            : "Ingestão de água atualizada.",
        );
        return;
      }

      const response = await authorizedNutritionFetch(
        activeUser,
        `/api/nutrition/diaries/${today}`,
        {
          method: "PATCH",
          body: JSON.stringify({ waterIntakeMl: nextWaterIntake }),
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível atualizar a água do dia.",
        );
        return;
      }

      const payload =
        (await response.json()) as Partial<NutritionDashboardSnapshot>;
      hydrateDashboard(payload);
      setCustomWaterOpen(false);
      setMessage(
        mode === "absolute"
          ? "Total de água corrigido."
          : "Ingestão de água atualizada.",
      );
      await loadHistory(historyPage);
    } catch {
      setMessage("Não foi possível atualizar a água do dia.");
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

      const response = await authorizedNutritionFetch(
        activeUser,
        "/api/nutrition/meal-plans",
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível descartar o plano agora.",
        );
        return;
      }

      setMealPlan(null);
      setMealPlanDraft(null);
      setPlanRejectedFoods([]);
      setMessage("Plano alimentar descartado.");
    } catch {
      setMessage(
        (current) => current ?? "Não foi possível descartar o plano agora.",
      );
    }
  }

  async function handleGenerateMealPlan() {
    if (!activeUser) return;

    const requestedCalories = parseInputNumber(planCalories);
    if (
      !requestedCalories ||
      requestedCalories < 500 ||
      requestedCalories > 10000
    ) {
      setMessage("Informe uma meta calórica válida (500 a 10000).");
      return;
    }

    setPlanningTab("plan");
    handleChangeArea("planning");
    setIsGeneratingPlan(true);
    setMessage(null);

    try {
      const response = await authorizedNutritionFetch(
        activeUser,
        "/api/nutrition/meal-plans/generate",
        {
          method: "POST",
          body: JSON.stringify({
            targetCalories: requestedCalories,
            objective: goalObjectiveDraft,
            excludedFoods: planRejectedFoods,
          }),
        },
      );

      if (!response.ok) {
        await resolveRequestError(
          response,
          "Não foi possível gerar opções de plano agora.",
        );
        return;
      }

      const payload = (await response.json()) as {
        plan?: MealPlan;
        mealPlan?: MealPlan;
      };
      const generatedPlan = payload.plan ?? payload.mealPlan;
      if (
        !generatedPlan ||
        !generatedPlan.meals.some((meal) => meal.items.length > 0)
      ) {
        setMessage(
          "Não foi possível montar um cardápio com as escolhas atuais. Ajuste a meta ou limpe as rejeições.",
        );
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
      setMessage(
        (current) => current ?? "Não foi possível gerar opções de plano agora.",
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  function handleChangeMealPlanItemQuantity(
    mealIndex: number,
    itemIndex: number,
    nextQuantityValue: number,
  ) {
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
            currentItemIndex === itemIndex
              ? scaleMealPlanItem(item, ratio, resolvedQuantity)
              : item,
          ),
        };
      });

      const nextPlan = normalizeMealPlan({ ...currentPlan, meals: nextMeals });
      if (
        storageMode === "volatile" &&
        canUseBrowserPersistence &&
        activeUser
      ) {
        saveNutritionMealPlanToBrowser(activeUser.uid, nextPlan);
      }

      return nextPlan;
    });
  }

  function handleRejectMealPlanItem(mealIndex: number, itemIndex: number) {
    const itemName = mealPlanDraft?.meals[mealIndex]?.items[itemIndex]?.name;
    if (itemName) {
      setPlanRejectedFoods((currentItems) =>
        currentItems.includes(itemName)
          ? currentItems
          : [...currentItems, itemName],
      );
    }

    setMealPlanDraft((currentPlan) => {
      if (!currentPlan) return currentPlan;

      const nextMeals = currentPlan.meals.map((meal, currentMealIndex) => {
        if (currentMealIndex !== mealIndex) return meal;
        return {
          ...meal,
          items: meal.items.filter(
            (_, currentItemIndex) => currentItemIndex !== itemIndex,
          ),
        };
      });

      const nextPlan = normalizeMealPlan({ ...currentPlan, meals: nextMeals });
      if (
        storageMode === "volatile" &&
        canUseBrowserPersistence &&
        activeUser
      ) {
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
        dateLabel: new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "long",
        }).format(new Date()),
        totals: summarizeMealPlan(planToExport),
      });
      setMessage("PDF gerado com sucesso.");
    } catch {
      setMessage("Não foi possível gerar o PDF agora.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  return {
    handleAddDiaryItem,
    handleUpdateDiaryItem,
    handleDeleteDiaryItem,
    handleCopyDiaryItem,
    handleSaveGoal,
    handleSaveWater,
    handleDiscardMealPlan,
    handleGenerateMealPlan,
    handleChangeMealPlanItemQuantity,
    handleRejectMealPlanItem,
    handleExportMealPlanPdf,
    handleSaveCustomWater,
  };
}
