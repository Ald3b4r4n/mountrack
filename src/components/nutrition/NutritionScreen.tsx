"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { SegmentButton } from "@/components/nutrition/CommonUI";
import { NutritionScreenShell } from "@/components/nutrition/NutritionScreenShell";
import { NutritionScreenPreviewGate } from "@/components/nutrition/NutritionScreenPreviewGate";
import { NutritionWorkspaceContent } from "@/components/nutrition/NutritionWorkspaceContent";
import {
  formatSearchSourceLabel,
  getDefaultFocusedMeal,
  parseInputNumber,
  roundValue,
  summarizeMealPlan,
} from "@/components/nutrition/nutrition-screen-helpers";
import {
  type NutritionScreenUiState,
  useNutritionScreenUiState,
} from "@/components/nutrition/useNutritionScreenUiState";
import { useNutritionScreenFlows } from "@/components/nutrition/useNutritionScreenFlows";
import { useNutritionScreenActions } from "@/components/nutrition/useNutritionScreenActions";
import { useAuth } from "@/contexts/AuthContext";
import { PLANNING_TABS } from "@/modules/nutrition/constants";
import {
  loadNutritionFocusedMealFromBrowser,
  saveNutritionFocusedMealToBrowser,
} from "@/modules/nutrition/client-storage";
import type {
  MealType,
  NutritionObjective,
} from "@/modules/nutrition/domain/types";
import { useHydration } from "@/modules/nutrition/hooks/useHydration";
import { useNutritionDashboard } from "@/modules/nutrition/hooks/useNutritionDashboard";
import { useNutritionSearch } from "@/modules/nutrition/hooks/useNutritionSearch";
import {
  buildMealDefinitions,
  getDefaultMealDefinitions,
} from "@/modules/nutrition/meal-helpers";
import { calculateNutritionForQuantity } from "@/modules/nutrition/services/nutrition-calc.service";
import { getTodayLocalDate } from "@/modules/expenses/utils";

const DEFAULT_WATER_TARGET = 2200;
const DIARY_PAGE_SIZE = 6;

const previewAuthUser = {
  uid: "preview-demo-user",
  getIdToken: async () => "",
  devBypass: true,
};

interface NutritionScreenContentProps {
  isPreview: boolean;
}

function NutritionScreenContent({ isPreview }: NutritionScreenContentProps) {
  const { user } = useAuth();
  const today = useMemo(() => getTodayLocalDate(), []);
  const activeUser = user ?? (isPreview ? previewAuthUser : null);

  const {
    uiState,
    dispatchUiState,
    updateGoalInput,
    setPlanRejectedFoods,
    setQuantity,
    setUnit,
    setMealType,
    setActiveArea,
    setPlanningTab,
    setActiveDiaryView,
    setActiveDiaryMeal,
    setDiaryPage,
    setTodayMealsSectionOpen,
    setTodayDiarySectionOpen,
    setScannerOpen,
    setIsSavingGoal,
    setCustomFoodOpen,
    setCustomMealOpen,
    setEditingMeal,
    setIsGeneratingPlan,
    setIsExportingPdf,
    setMessage,
    setDiarySuccessFeedback,
    setGoalObjectiveDraft,
    setGoalInputsDirty,
    setMealPlanDraft,
    setPlanCalories,
    setCustomWaterOpen,
    setIsUpdatingWater,
  } = useNutritionScreenUiState();
  const canUseBrowserPersistence = Boolean(
    activeUser && !("devBypass" in activeUser && activeUser.devBypass),
  );

  const dashboardHook = useNutritionDashboard(
    activeUser,
    today,
    canUseBrowserPersistence,
  );
  const searchHook = useNutritionSearch(activeUser, canUseBrowserPersistence);
  const hydrationHook = useHydration();

  const { state: dState, setters: dSetters, actions: dActions } = dashboardHook;
  const { state: sState, actions: sActions } = searchHook;
  const { state: hState, setters: hSetters } = hydrationHook;

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
  const {
    setSummary,
    setMealPlan,
    setGoal,
    setDiaryMealDefinitions,
    setHistoryPage,
  } = dSetters;
  const {
    resolveRequestError,
    loadDashboard,
    loadBrowserDashboard,
    hydrateDashboard,
    loadHistory,
    loadBrowserHistory,
    hydrateHistory,
  } = dActions;

  const {
    isSearching,
    isEnrichingExternal,
    searchResults,
    resultsVisible,
    searchQuery,
    barcodeQuery,
    selectedFood,
    isComposerOpen,
    lastSearchSource,
    message: searchMessage,
  } = sState;
  const {
    handleSearchQueryChange,
    handleBarcodeQueryChange,
    handleSearch,
    handleBarcodeLookup,
    resetSearchComposer,
    applyFoodSelection,
    openSelectedFoodComposer,
    closeSelectedFoodComposer,
    reopenSearchResults,
    swapSelectedFood,
  } = sActions;

  const { waterDraft, isUpdatingWater, hydrationMode } = hState;
  const { setWaterDraft } = hSetters;

  const {
    planRejectedFoods,
    quantity,
    unit,
    mealType,
    activeArea,
    planningTab,
    activeDiaryView,
    activeDiaryMeal,
    diaryPage,
    todayMealsSectionOpen,
    todayDiarySectionOpen,
    isMobileLayout,
    scannerOpen,
    isSavingGoal,
    customFoodOpen,
    customMealOpen,
    editingMeal,
    isGeneratingPlan,
    isExportingPdf,
    message,
    diarySuccessFeedback,
    goalInputs,
    goalObjectiveDraft,
    mealPlanDraft,
    planCalories,
    workspaceMinHeight,
    planningPanelMinHeight,
    customWaterOpen,
  } = uiState;

  const activeWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const activePlanningPanelRef = useRef<HTMLDivElement | null>(null);
  const mealPreferenceReadyForUserRef = useRef<string | null>(null);

  const mealDefinitions = useMemo(
    () => buildMealDefinitions(diaryItems, diaryMealDefinitions),
    [diaryItems, diaryMealDefinitions],
  );
  const groupedDiaryItems = useMemo(() => {
    const groupedItems = Object.fromEntries(
      mealDefinitions.map((definition) => [
        definition.key,
        [] as typeof diaryItems,
      ]),
    ) as Record<string, typeof diaryItems>;

    for (const item of diaryItems) {
      if (!groupedItems[item.mealType]) {
        groupedItems[item.mealType] = [];
      }
      groupedItems[item.mealType].push(item);
    }

    return groupedItems;
  }, [diaryItems, mealDefinitions]);

  const {
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
  } = useNutritionScreenFlows({
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
    setCustomWaterOpen,
    setActiveDiaryMeal,
    setActiveArea,
    setActiveDiaryView,
    setDiaryPage,
    setTodayMealsSectionOpen,
    setTodayDiarySectionOpen,
    setDiarySuccessFeedback,
    setCustomMealOpen,
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
  });

  const {
    handleAddDiaryItem,
    handleDeleteDiaryItem,
    handleSaveGoal,
    handleSaveCustomWater,
    handleDiscardMealPlan,
    handleGenerateMealPlan,
    handleChangeMealPlanItemQuantity,
    handleRejectMealPlanItem,
    handleExportMealPlanPdf,
  } = useNutritionScreenActions({
    activeUser,
    today,
    storageMode,
    canUseBrowserPersistence,
    historyPage,
    summary,
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
    loadBrowserDashboard,
    loadBrowserHistory,
    hydrateDashboard,
    hydrateHistory,
    loadDashboard,
    loadHistory,
    resolveRequestError,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 860px)");
    const syncLayout = () => {
      dispatchUiState({
        type: "patch",
        value: { isMobileLayout: mediaQuery.matches },
      });
    };

    syncLayout();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncLayout);
      return () => mediaQuery.removeEventListener("change", syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, [dispatchUiState]);

  useEffect(() => {
    const fallbackMeal =
      mealDefinitions[0]?.key ?? getDefaultMealDefinitions()[0].key;
    const nextState: Partial<NutritionScreenUiState> = {};

    if (
      !mealDefinitions.some((definition) => definition.key === activeDiaryMeal)
    ) {
      nextState.activeDiaryMeal = fallbackMeal;
    }

    if (!mealDefinitions.some((definition) => definition.key === mealType)) {
      nextState.mealType = fallbackMeal;
    }

    if (Object.keys(nextState).length > 0) {
      dispatchUiState({ type: "patch", value: nextState });
    }
  }, [activeDiaryMeal, dispatchUiState, mealDefinitions, mealType]);

  useEffect(() => {
    if (!activeUser) return;

    setHistoryPage(1);
    dispatchUiState({ type: "patch", value: { diaryPage: 1 } });
    let cancelled = false;

    void (async () => {
      const nextMode = await loadDashboard();
      if (cancelled) return;
      await loadHistory(1, nextMode);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser, dispatchUiState, loadDashboard, loadHistory, setHistoryPage]);

  useEffect(() => {
    if (!activeUser) {
      mealPreferenceReadyForUserRef.current = null;
      return;
    }

    if (isLoading || mealPreferenceReadyForUserRef.current === activeUser.uid) {
      return;
    }

    const preferredMeal = loadNutritionFocusedMealFromBrowser(activeUser.uid);
    if (
      preferredMeal &&
      mealDefinitions.some((definition) => definition.key === preferredMeal)
    ) {
      dispatchUiState({
        type: "patch",
        value: {
          activeDiaryMeal: preferredMeal,
          mealType: preferredMeal,
        },
      });
    }

    mealPreferenceReadyForUserRef.current = activeUser.uid;
  }, [activeUser, dispatchUiState, isLoading, mealDefinitions]);

  useEffect(() => {
    if (
      !activeUser ||
      mealPreferenceReadyForUserRef.current !== activeUser.uid
    ) {
      return;
    }

    if (
      !mealDefinitions.some((definition) => definition.key === activeDiaryMeal)
    ) {
      return;
    }

    saveNutritionFocusedMealToBrowser(activeUser.uid, activeDiaryMeal);
  }, [activeDiaryMeal, activeUser, mealDefinitions]);

  useEffect(() => {
    dispatchUiState({ type: "syncGoalDraft", goal });
  }, [dispatchUiState, goal]);

  useEffect(() => {
    const node = activeWorkspaceRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      dispatchUiState({
        type: "maximizeHeight",
        key: "workspaceMinHeight",
        value: Math.ceil(node.getBoundingClientRect().height),
      });
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeArea, dispatchUiState, planningTab, isMobileLayout]);

  useEffect(() => {
    if (activeArea !== "planning") {
      return;
    }

    const node = activePlanningPanelRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      dispatchUiState({
        type: "maximizeHeight",
        key: "planningPanelMinHeight",
        value: Math.ceil(node.getBoundingClientRect().height),
      });
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeArea, dispatchUiState, planningTab, isMobileLayout]);

  useEffect(() => {
    if (!diarySuccessFeedback) {
      return;
    }

    if (diarySuccessFeedback.mealType !== activeDiaryMeal) {
      dispatchUiState({
        type: "patch",
        value: { diarySuccessFeedback: null },
      });
    }
  }, [activeDiaryMeal, diarySuccessFeedback, dispatchUiState]);

  const selectedFoodTotals = useMemo(() => {
    if (!selectedFood) return null;
    const parsedQuantity = parseInputNumber(quantity);
    if (parsedQuantity == null) return null;
    return calculateNutritionForQuantity({
      food: selectedFood,
      quantity: parsedQuantity,
      unit,
    });
  }, [selectedFood, quantity, unit]);

  const activeDiaryItems = useMemo(
    () => groupedDiaryItems[activeDiaryMeal] ?? [],
    [groupedDiaryItems, activeDiaryMeal],
  );
  const activeDiaryMealDefinition = mealDefinitions.find(
    (meal) => meal.key === activeDiaryMeal,
  ) ?? {
    key: activeDiaryMeal,
    label: String(activeDiaryMeal),
    isDefault: true,
  };
  const diaryTotalPages = Math.max(
    1,
    Math.ceil(activeDiaryItems.length / DIARY_PAGE_SIZE),
  );
  const pagedDiaryItems = useMemo(() => {
    const offset = (diaryPage - 1) * DIARY_PAGE_SIZE;
    return activeDiaryItems.slice(offset, offset + DIARY_PAGE_SIZE);
  }, [activeDiaryItems, diaryPage]);

  useEffect(() => {
    dispatchUiState({
      type: "update",
      key: "diaryPage",
      updater: (current) => Math.min(current as number, diaryTotalPages),
    });
  }, [diaryTotalPages, dispatchUiState]);

  // Sync active meal with current hour - check every minute
  useEffect(() => {
    const syncMealWithHour = () => {
      const mealtypeByHour = getDefaultFocusedMeal();
      if (
        mealtypeByHour !== activeDiaryMeal &&
        mealDefinitions.some((def) => def.key === mealtypeByHour)
      ) {
        dispatchUiState({
          type: "patch",
          value: { activeDiaryMeal: mealtypeByHour },
        });
      }
    };

    // Check immediately
    syncMealWithHour();

    // Check every minute
    const interval = setInterval(syncMealWithHour, 60000);
    return () => clearInterval(interval);
  }, [activeDiaryMeal, dispatchUiState, mealDefinitions]);

  const consumedRatio =
    summary.targetCalories > 0
      ? Math.min((summary.consumedCalories / summary.targetCalories) * 100, 100)
      : 0;
  const waterRatio =
    summary.targetWaterMl > 0
      ? Math.min((summary.waterIntakeMl / summary.targetWaterMl) * 100, 100)
      : 0;
  const displayedMealPlan = mealPlanDraft ?? mealPlan;
  const planTotals = useMemo(
    () => (displayedMealPlan ? summarizeMealPlan(displayedMealPlan) : null),
    [displayedMealPlan],
  );
  const requestedPlanCalories =
    parseInputNumber(planCalories) ?? goal.targetCalories;
  const planDelta = displayedMealPlan
    ? roundValue(displayedMealPlan.totalCalories - requestedPlanCalories)
    : 0;
  const successMealDefinition = diarySuccessFeedback
    ? (mealDefinitions.find(
        (meal) => meal.key === diarySuccessFeedback.mealType,
      ) ?? null)
    : null;
  const successMealLabel =
    successMealDefinition?.label ?? diarySuccessFeedback?.mealLabel ?? null;
  const successMealItemsCount = diarySuccessFeedback
    ? (groupedDiaryItems[diarySuccessFeedback.mealType]?.length ?? 0)
    : 0;
  const successMealCalories = diarySuccessFeedback
    ? (summary.meals[diarySuccessFeedback.mealType] ?? 0)
    : 0;
  const activeMealRecentlyLoggedFoodLabel =
    diarySuccessFeedback?.mealType === activeDiaryMeal
      ? diarySuccessFeedback.foodLabel
      : null;
  const searchCatalogBadge =
    storageMode === "database"
      ? "Catálogo sincronizado"
      : storageMode === "checking"
        ? "Preparando catálogo"
        : "Somente neste aparelho";
  const syncWarningMessage =
    !isPreview && (storageMode === "volatile" || storageMode === "memory")
      ? "Sincronização indisponível. Os lançamentos da nutrição estão sendo salvos apenas neste aparelho até a base de dados responder normalmente."
      : null;
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
                ? "Procurando no catálogo"
                : "Busque um alimento",
          text:
            isSearching || isEnrichingExternal
              ? "Estou procurando no catálogo e preparando novas referências quando fizer sentido."
              : (searchMessage ??
                "Digite um nome, use um código de barras ou crie um alimento manual para começar."),
        };
  const planningTabs = (
    <div className="flex flex-wrap gap-[0.55rem]">
      {PLANNING_TABS.map((tab) => (
        <SegmentButton
          key={tab.key}
          active={planningTab === tab.key}
          label={tab.label}
          meta={
            tab.key === "goal" ? undefined : displayedMealPlan?.meals.length
          }
          onClick={() => setPlanningTab(tab.key)}
        />
      ))}
    </div>
  );
  const todayWorkspaceProps = {
    activeDiaryView,
    onChangeDiaryView: setActiveDiaryView,
    onChangeDiaryPage: setDiaryPage,
    summary,
    waterRatio,
    isMobileLayout,
    onAdjustWater: (amount: number) => {
      void handleSaveCustomWater(amount, "increment");
    },
    onOpenCustomWater: () => setCustomWaterOpen(true),
    isUpdatingWater,
    mealDefinitions,
    activeDiaryMeal,
    onChangeActiveDiaryMeal: setActiveDiaryMeal,
    onOpenMeal: (meal: MealType) => {
      setActiveDiaryMeal(meal);
      if (isMobileLayout) {
        focusTodayDashboard({ openDiaryPanel: true });
        return;
      }
      handleChangeArea("today");
      setActiveDiaryView("today");
      setDiaryPage(1);
    },
    onOpenSearchForMeal: openSearchForMeal,
    onOpenMealChooser: handleOpenMealChooser,
    groupedDiaryItems,
    activeDiaryItems,
    diaryPage,
    diaryTotalPages,
    isLoading,
    pagedDiaryItems,
    onDeleteDiaryItem: handleDeleteDiaryItem,
    isHistoryLoading,
    historyEntries,
    historyPage,
    historyTotalPages,
    onLoadHistory: (page: number) => void loadHistory(page),
    onManageMeal: openManageMealDialog,
    recentlyLoggedFoodLabel:
      activeArea === "today" && isMobileLayout
        ? activeMealRecentlyLoggedFoodLabel
        : null,
    mealsSectionOpen: todayMealsSectionOpen,
    onMealsSectionOpenChange: handleTodayMealsSectionOpenChange,
    mealsSectionRef: todayMealsSectionRef,
    diarySectionOpen: todayDiarySectionOpen,
    onDiarySectionOpenChange: handleTodayDiarySectionOpenChange,
    diarySectionRef: todayDiarySectionRef,
    onAddMeal: openCreateMealDialog,
  };
  const searchWorkspaceProps = {
    storageMode,
    isMobileLayout,
    mealDefinitions,
    searchQuery,
    onSearchQueryChange: handleSearchQueryChange,
    onSearch: () => void handleSearch(),
    isSearching,
    isEnrichingExternal,
    barcodeQuery,
    onBarcodeQueryChange: handleBarcodeQueryChange,
    onBarcodeLookup: (value: string) => void handleBarcodeLookup(value),
    onOpenScanner: () => setScannerOpen(true),
    searchSourceLabel,
    searchFeedback: searchMessage,
    resultsVisible,
    searchResults,
    resultState,
    onApplyFoodSelection: applyFoodSelection,
    onCustomFoodOpen: () => setCustomFoodOpen(true),
    onClearSearch: () => {
      resetSearchComposer();
      setMessage(null);
    },
    selectedFood,
    isComposerOpen,
    selectedFoodTotals,
    onOpenComposer: openSelectedFoodComposer,
    onCloseComposer: closeSelectedFoodComposer,
    onReopenSearchResults: reopenSearchResults,
    onSwapFoodSelection: swapSelectedFood,
    quantity,
    onQuantityChange: setQuantity,
    unit,
    onUnitChange: setUnit,
    mealType,
    onMealTypeChange: (value: MealType) => {
      setMealType(value);
      setActiveDiaryMeal(value);
    },
    onAddDiaryItem: () => void handleAddDiaryItem(),
    searchCatalogBadge,
  };
  const planningWorkspaceProps = {
    isMobileLayout,
    planningTabs,
    planningPanelMinHeight,
    activePlanningPanelRef,
    planningTab,
    displayedMealPlan,
    goalPanelProps: {
      goal,
      summary,
      goalInputs,
      goalObjectiveDraft,
      isSavingGoal,
      defaultWaterTarget: DEFAULT_WATER_TARGET,
      onUpdateGoalInput: updateGoalInput,
      onChangeObjective: (objective: NutritionObjective) => {
        setGoalInputsDirty(true);
        setGoalObjectiveDraft(objective);
      },
      onSaveGoal: () => void handleSaveGoal(),
    },
    mealPlanPanelProps: {
      displayedMealPlan,
      planTotals,
      planCalories,
      requestedPlanCalories,
      planDelta,
      planRejectedFoods,
      isGeneratingPlan,
      isExportingPdf,
      isMobileLayout,
      onPlanCaloriesChange: setPlanCalories,
      onGenerateMealPlan: () => void handleGenerateMealPlan(),
      onUseGoalCalories: () => setPlanCalories(String(goal.targetCalories)),
      onExportPdf: () => void handleExportMealPlanPdf(),
      onDiscardMealPlan: () => void handleDiscardMealPlan(),
      onClearRejections: () => setPlanRejectedFoods([]),
      onChangeQuantity: handleChangeMealPlanItemQuantity,
      onRejectItem: handleRejectMealPlanItem,
    },
  };

  const workspaceContent = (
    <NutritionWorkspaceContent
      activeArea={activeArea}
      isMobileLayout={isMobileLayout}
      workspaceMinHeight={workspaceMinHeight}
      activeWorkspaceRef={activeWorkspaceRef}
      todayProps={todayWorkspaceProps}
      searchProps={searchWorkspaceProps}
      planningProps={planningWorkspaceProps}
    />
  );

  return (
    <NutritionScreenShell
      isPreview={isPreview}
      isMobileLayout={isMobileLayout}
      workspaceContent={workspaceContent}
      barcodeScannerProps={{
        open: scannerOpen,
        onClose: () => setScannerOpen(false),
        onDetected: (code) => {
          setScannerOpen(false);
          window.setTimeout(() => {
            void handleBarcodeLookup(code);
          }, 180);
        },
      }}
      customMealDialogKey={`${editingMeal?.key ?? "new"}:${customMealOpen ? "open" : "closed"}`}
      customMealDialogProps={{
        open: customMealOpen,
        onClose: closeCustomMealDialog,
        initialLabel: editingMeal?.label,
        title: editingMeal ? "Gerenciar refeição" : "Nova refeição",
        description: editingMeal
          ? "Atualize o nome da refeição extra ou exclua a refeição com todos os itens lançados nela."
          : "Nomeie uma refeição extra, como Pré-treino, Ceia ou Sobremesa.",
        confirmLabel: editingMeal ? "Salvar nome" : "Continuar",
        deleteAction: editingMeal
          ? {
              onDelete: () => {
                void handleDeleteCustomMeal();
              },
              label:
                (groupedDiaryItems[editingMeal.key]?.length ?? 0) > 0
                  ? "Excluir refeição e itens"
                  : "Excluir refeição",
              hint:
                (groupedDiaryItems[editingMeal.key]?.length ?? 0) > 0
                  ? `Excluir também remove ${groupedDiaryItems[editingMeal.key]?.length ?? 0} item(ns) registrados nela.`
                  : "Excluir remove essa refeição extra do diário de hoje.",
            }
          : undefined,
        onCreate: (label) => {
          if (editingMeal) {
            void handleRenameCustomMeal(label);
            return;
          }

          void handleCreateCustomMeal(label);
        },
      }}
      customFoodDialogProps={{
        authUser: activeUser,
        open: customFoodOpen,
        onClose: () => setCustomFoodOpen(false),
        onCreated: (food) => {
          setCustomFoodOpen(false);
          setDiarySuccessFeedback(null);
          setMessage(`Alimento ${food.name} cadastrado.`);
          applyFoodSelection(food);
        },
      }}
      customWaterDialogProps={{
        open: customWaterOpen,
        onClose: () => setCustomWaterOpen(false),
        onSave: (amount, mode) => {
          void handleSaveCustomWater(amount, mode);
        },
        isSaving: isUpdatingWater,
        initialMode: "increment",
      }}
      headerProps={{
        isMobileLayout,
        isPreview,
        summary,
        goal,
        waterRatio,
        consumedRatio,
        activeMealLabel: activeDiaryMealDefinition.label,
        activeMealCalories: summary.meals[activeDiaryMeal] ?? 0,
        recentlyLoggedFoodLabel:
          activeArea === "today" && isMobileLayout
            ? activeMealRecentlyLoggedFoodLabel
            : null,
        onOpenConsumedSummary: isMobileLayout
          ? handleOpenConsumedSummary
          : undefined,
        onAddToActiveMeal: isMobileLayout
          ? () => {
              openSearchForMeal(activeDiaryMeal);
            }
          : undefined,
        onAdjustWater: (amount) => {
          void handleSaveCustomWater(amount, "increment");
        },
        onOpenCustomWater: () => setCustomWaterOpen(true),
      }}
      navProps={{
        activeArea,
        isMobileLayout,
        onChangeArea: handleChangeArea,
      }}
      statusBannersProps={{
        isMobileLayout,
        message,
        syncWarningMessage,
        successFeedback:
          !isMobileLayout && activeArea === "today" && diarySuccessFeedback
            ? {
                foodLabel: diarySuccessFeedback.foodLabel,
                mealLabel: diarySuccessFeedback.mealLabel,
              }
            : null,
        successMealLabel,
        successMealItemsCount,
        successMealCalories,
        onOpenSuccessMeal: () => {
          if (!diarySuccessFeedback) {
            return;
          }
          setActiveDiaryMeal(diarySuccessFeedback.mealType);
          focusTodayDashboard({ openDiaryPanel: true });
          setDiarySuccessFeedback(null);
        },
        onRegisterMore: () => {
          if (!diarySuccessFeedback) {
            return;
          }
          openSearchForMeal(diarySuccessFeedback.mealType);
        },
      }}
    />
  );
}

export function NutritionScreen() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04101c]" />}>
      <NutritionScreenPreviewGate
        render={(isPreview) => <NutritionScreenContent isPreview={isPreview} />}
      />
    </Suspense>
  );
}
