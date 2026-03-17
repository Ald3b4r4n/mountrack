import { useRef } from "react";
import {
  removeNutritionDiaryItemFromBrowser,
  saveNutritionMealDefinitionsToBrowser,
  type NutritionDashboardSnapshot,
  type NutritionHistorySnapshot,
} from "@/modules/nutrition/client-storage";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import type {
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import type { NutritionUiStorageMode } from "@/modules/nutrition/hooks/useNutritionDashboard";
import {
  buildMealDefinitions,
  createCustomMealDefinition,
  getDefaultMealDefinitions,
  getMealLabel,
  isDefaultMealType,
} from "@/modules/nutrition/meal-helpers";
import type { DiarySuccessFeedback } from "@/components/nutrition/useNutritionScreenUiState";

type ActiveNutritionUser = Parameters<typeof authorizedNutritionFetch>[0];

interface NutritionScreenFlowsDeps {
  activeUser: ActiveNutritionUser | null;
  canUseBrowserPersistence: boolean;
  storageMode: string;
  today: string;
  goal: NutritionGoal;
  mealDefinitions: MealDefinition[];
  diaryItems: DiaryItemSnapshot[];
  diaryMealDefinitions: MealDefinition[];
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
  editingMeal: MealDefinition | null;
  activeDiaryMeal: MealType;
  mealType: MealType;
  historyPage: number;
  setMealType: (value: MealType | ((current: MealType) => MealType)) => void;
  setActiveDiaryMeal: (value: MealType | ((current: MealType) => MealType)) => void;
  setActiveArea: (value: "none" | "today" | "search" | "planning" | ((current: "none" | "today" | "search" | "planning") => "none" | "today" | "search" | "planning")) => void;
  setActiveDiaryView: (value: "today" | "history" | ((current: "today" | "history") => "today" | "history")) => void;
  setDiaryPage: (value: number | ((current: number) => number)) => void;
  setTodayMealsSectionOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setTodayDiarySectionOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setDiarySuccessFeedback: (
    value:
      | DiarySuccessFeedback
      | null
      | ((current: DiarySuccessFeedback | null) => DiarySuccessFeedback | null),
  ) => void;
  setCustomMealOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setCustomWaterOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setEditingMeal: (
    value: MealDefinition | null | ((current: MealDefinition | null) => MealDefinition | null),
  ) => void;
  setMessage: (value: string | null | ((current: string | null) => string | null)) => void;
  loadBrowserDashboard: () => NutritionDashboardSnapshot | null;
  hydrateDashboard: (snapshot: Partial<NutritionDashboardSnapshot>) => void;
  setDiaryMealDefinitions: (definitions: MealDefinition[]) => void;
  resolveRequestError: (response: Response, fallbackMessage: string) => Promise<string>;
  loadBrowserHistory: (page: number) => NutritionHistorySnapshot | null;
  hydrateHistory: (snapshot: Partial<NutritionHistorySnapshot>) => void;
  loadDashboard: () => Promise<string>;
  loadHistory: (page: number, modeOverride?: NutritionUiStorageMode) => Promise<void>;
}

export function useNutritionScreenFlows({
  activeUser,
  canUseBrowserPersistence,
  storageMode,
  today,
  goal,
  mealDefinitions,
  diaryItems,
  diaryMealDefinitions,
  groupedDiaryItems,
  editingMeal,
  activeDiaryMeal,
  mealType,
  historyPage,
  setMealType,
  setActiveDiaryMeal,
  setActiveArea,
  setActiveDiaryView,
  setDiaryPage,
  setTodayMealsSectionOpen,
  setTodayDiarySectionOpen,
  setDiarySuccessFeedback,
  setCustomMealOpen,
  setCustomWaterOpen,
  setEditingMeal,
  setMessage,
  loadBrowserDashboard,
  hydrateDashboard,
  setDiaryMealDefinitions,
  resolveRequestError,
  loadBrowserHistory,
  hydrateHistory,
  loadDashboard,
  loadHistory,
}: NutritionScreenFlowsDeps) {
  const todayMealsSectionRef = useRef<HTMLElement | null>(null);
  const todayDiarySectionRef = useRef<HTMLElement | null>(null);

  function getActiveMealDefinition(selectedMealType: MealType): MealDefinition {
    return (
      mealDefinitions.find((definition) => definition.key === selectedMealType) ?? {
        key: selectedMealType,
        label: getMealLabel(selectedMealType),
      }
    );
  }

  function handleChangeArea(nextArea: "none" | "today" | "search" | "planning") {
    setActiveArea((current) => {
      if (current === nextArea) {
        return "none";
      }
      if (nextArea !== "today") {
        setDiarySuccessFeedback(null);
      }
      return nextArea;
    });
  }

  function scrollNutritionViewToTop() {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  function queueNutritionScroll(callback: () => void) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback);
    });
  }

  function focusTodayDashboard(options?: { openMealsSummary?: boolean; openDiaryPanel?: boolean }) {
    const openMealsSummary = options?.openMealsSummary ?? false;
    const openDiaryPanel = options?.openDiaryPanel ?? false;

    handleChangeArea("today");
    setActiveDiaryView("today");
    setDiaryPage(1);
    setTodayMealsSectionOpen(openMealsSummary);
    setTodayDiarySectionOpen(openDiaryPanel);

    if (openMealsSummary) {
      queueNutritionScroll(() => {
        todayMealsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    if (openDiaryPanel) {
      queueNutritionScroll(() => {
        todayDiarySectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    queueNutritionScroll(() => {
      scrollNutritionViewToTop();
    });
  }

  function handleTodayMealsSectionOpenChange(open: boolean) {
    setTodayMealsSectionOpen(open);
    if (open) {
      setTodayDiarySectionOpen(false);
    }
  }

  function handleTodayDiarySectionOpenChange(open: boolean) {
    setTodayDiarySectionOpen(open);
    if (open) {
      setTodayMealsSectionOpen(false);
    }
  }

  function handleOpenConsumedSummary() {
    focusTodayDashboard({ openDiaryPanel: true });
  }

  function handleOpenMealChooser() {
    setDiarySuccessFeedback(null);
    focusTodayDashboard({ openMealsSummary: true });
  }

  function announceDiarySuccess(foodLabel: string, mealDefinition: MealDefinition) {
    setMessage(null);
    setDiarySuccessFeedback({
      foodLabel,
      mealLabel: mealDefinition.label,
      mealType: mealDefinition.key,
    });
  }

  function openSearchForMeal(nextMealType?: MealType) {
    if (nextMealType) {
      setMealType(nextMealType);
      setActiveDiaryMeal(nextMealType);
    }
    setDiarySuccessFeedback(null);
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

  async function persistMealDefinitions(nextMealDefinitions: MealDefinition[], failureMessage: string): Promise<boolean> {
    if (!activeUser) {
      return false;
    }

    if (storageMode === "volatile" && canUseBrowserPersistence) {
      saveNutritionMealDefinitionsToBrowser(
        activeUser.uid,
        today,
        {
          ...goal,
          userId: activeUser.uid,
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
      const saved = await persistMealDefinitions(nextMealDefinitions, "Não foi possível criar a nova refeição agora.");
      if (!saved) {
        return;
      }

      setMealType(nextDefinition.key);
      setActiveDiaryMeal(nextDefinition.key);
      closeCustomMealDialog();
      handleChangeArea("search");
      setMessage(`${nextDefinition.label} pronta para receber itens.`);
    } catch {
      setMessage((current) => current ?? "Não foi possível criar a nova refeição agora.");
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
      setMessage("Já existe uma refeição com esse nome.");
      return;
    }

    const nextMealDefinitions = mealDefinitions.map((definition) =>
      definition.key === targetMeal.key ? { ...definition, label: normalizedLabel } : definition,
    );

    try {
      const saved = await persistMealDefinitions(nextMealDefinitions, "Não foi possível renomear a refeição agora.");
      if (!saved) {
        return;
      }

      setActiveDiaryMeal(targetMeal.key);
      closeCustomMealDialog();
      setMessage(`Refeição atualizada para ${normalizedLabel}.`);
    } catch {
      setMessage((current) => current ?? "Não foi possível renomear a refeição agora.");
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

        const saved = await persistMealDefinitions(nextMealDefinitions, "Não foi possível excluir a refeição agora.");
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
            await resolveRequestError(response, "Não foi possível excluir a refeição agora.");
            return;
          }
        }

        const saved = await persistMealDefinitions(nextMealDefinitions, "Não foi possível excluir a refeição agora.");
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
          ? `${targetMeal.label} e ${targetMealItems.length} item(ns) foram removidos do diário de hoje.`
          : `${targetMeal.label} removida do diário de hoje.`,
      );
    } catch {
      setMessage((current) => current ?? "Não foi possível excluir a refeição agora.");
    }
  }

  return {
    todayMealsSectionRef,
    todayDiarySectionRef,
    getActiveMealDefinition,
    handleChangeArea,
    focusTodayDashboard,
    handleTodayMealsSectionOpenChange,
    handleTodayDiarySectionOpenChange,
    handleOpenConsumedSummary,
    handleOpenMealChooser,
    announceDiarySuccess,
    openSearchForMeal,
    closeCustomMealDialog,
    openCreateMealDialog,
    openManageMealDialog,
    handleCreateCustomMeal,
    handleRenameCustomMeal,
    handleDeleteCustomMeal,
  };
}
