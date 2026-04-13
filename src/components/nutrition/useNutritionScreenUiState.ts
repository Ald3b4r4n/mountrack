import { useReducer } from "react";
import type { GoalInputState } from "@/components/nutrition/GoalPanel";
import { getDefaultFocusedMeal } from "@/components/nutrition/nutrition-screen-helpers";
import type { NutritionArea } from "@/components/nutrition/NutritionWorkspaceNav";
import type { PlanningTabKey } from "@/modules/nutrition/constants";
import type {
  DiaryItemSnapshot,
  FoodItem,
  MealDefinition,
  MealPlan,
  MealType,
  NutritionGoal,
  NutritionObjective,
  NutritionUnit,
} from "@/modules/nutrition/domain/types";

const DEFAULT_WATER_TARGET = 2200;
const DEFAULT_GOAL_INPUTS: GoalInputState = {
  targetCalories: "2000",
  targetWaterMl: "2200",
  targetProtein: "140",
  targetCarbs: "180",
  targetFat: "65",
};

export type DiaryViewKey = "today" | "history";

export interface DiarySuccessFeedback {
  foodLabel: string;
  mealLabel: string;
  mealType: MealType;
}

export interface NutritionScreenUiState {
  planRejectedFoods: string[];
  quantity: string;
  unit: NutritionUnit;
  mealType: MealType;
  activeArea: NutritionArea;
  planningTab: PlanningTabKey;
  activeDiaryView: DiaryViewKey;
  activeDiaryMeal: MealType;
  diaryPage: number;
  todayMealsSectionOpen: boolean;
  todayDiarySectionOpen: boolean;
  isMobileLayout: boolean;
  scannerOpen: boolean;
  isSavingGoal: boolean;
  customFoodOpen: boolean;
  customMealOpen: boolean;
  editingMeal: MealDefinition | null;
  isGeneratingPlan: boolean;
  isExportingPdf: boolean;
  message: string | null;
  diarySuccessFeedback: DiarySuccessFeedback | null;
  goalInputs: GoalInputState;
  goalObjectiveDraft: NutritionObjective;
  goalInputsDirty: boolean;
  mealPlanDraft: MealPlan | null;
  planCalories: string;
  workspaceMinHeight: number;
  planningPanelMinHeight: number;
  customWaterOpen: boolean;
  isUpdatingWater: boolean;
  mealChooserOpen: boolean;
  editingCustomFood: FoodItem | null;
  copyCandidate: DiaryItemSnapshot | null;
}

type NutritionScreenUiAction =
  | {
      type: "patch";
      value: Partial<NutritionScreenUiState>;
    }
  | {
      type: "update";
      key: keyof NutritionScreenUiState;
      updater: (
        current: NutritionScreenUiState[keyof NutritionScreenUiState],
      ) => NutritionScreenUiState[keyof NutritionScreenUiState];
    }
  | {
      type: "updateGoalInput";
      key: keyof GoalInputState;
      value: string;
    }
  | {
      type: "syncGoalDraft";
      goal: NutritionGoal;
    }
  | {
      type: "maximizeHeight";
      key: "workspaceMinHeight" | "planningPanelMinHeight";
      value: number;
    };

function createInitialNutritionScreenUiState(): NutritionScreenUiState {
  const defaultFocusedMeal = getDefaultFocusedMeal();

  return {
    planRejectedFoods: [],
    quantity: "100",
    unit: "g",
    mealType: defaultFocusedMeal,
    activeArea: "today",
    planningTab: "goal",
    activeDiaryView: "today",
    activeDiaryMeal: defaultFocusedMeal,
    diaryPage: 1,
    todayMealsSectionOpen: false,
    todayDiarySectionOpen: false,
    isMobileLayout: false,
    scannerOpen: false,
    isSavingGoal: false,
    customFoodOpen: false,
    customMealOpen: false,
    editingMeal: null,
    isGeneratingPlan: false,
    isExportingPdf: false,
    message: null,
    diarySuccessFeedback: null,
    goalInputs: DEFAULT_GOAL_INPUTS,
    goalObjectiveDraft: "maintain",
    goalInputsDirty: false,
    mealPlanDraft: null,
    planCalories: "2000",
    workspaceMinHeight: 0,
    planningPanelMinHeight: 0,
    customWaterOpen: false,
    isUpdatingWater: false,
    mealChooserOpen: false,
    editingCustomFood: null,
    copyCandidate: null,
  };
}

function nutritionScreenUiReducer(
  state: NutritionScreenUiState,
  action: NutritionScreenUiAction,
): NutritionScreenUiState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.value };
    case "update":
      return {
        ...state,
        [action.key]: action.updater(state[action.key]),
      };
    case "updateGoalInput":
      return {
        ...state,
        goalInputs: {
          ...state.goalInputs,
          [action.key]: action.value,
        },
        goalInputsDirty: true,
      };
    case "syncGoalDraft":
      return {
        ...state,
        goalInputs: {
          targetCalories: String(action.goal.targetCalories ?? 2000),
          targetWaterMl: String(
            action.goal.targetWaterMl ?? DEFAULT_WATER_TARGET,
          ),
          targetProtein: String(action.goal.targetProtein ?? 140),
          targetCarbs: String(action.goal.targetCarbs ?? 180),
          targetFat: String(action.goal.targetFat ?? 65),
        },
        goalObjectiveDraft: action.goal.objective ?? "maintain",
        planCalories: String(action.goal.targetCalories ?? 2000),
      };
    case "maximizeHeight":
      return {
        ...state,
        [action.key]: Math.max(state[action.key], action.value),
      };
    default:
      return state;
  }
}

export function useNutritionScreenUiState() {
  const [uiState, dispatchUiState] = useReducer(
    nutritionScreenUiReducer,
    undefined,
    createInitialNutritionScreenUiState,
  );

  const setUiStateField = <K extends keyof NutritionScreenUiState>(
    key: K,
    value:
      | NutritionScreenUiState[K]
      | ((current: NutritionScreenUiState[K]) => NutritionScreenUiState[K]),
  ) => {
    if (typeof value === "function") {
      dispatchUiState({
        type: "update",
        key,
        updater: value as unknown as (
          current: NutritionScreenUiState[keyof NutritionScreenUiState],
        ) => NutritionScreenUiState[keyof NutritionScreenUiState],
      });
      return;
    }

    dispatchUiState({
      type: "patch",
      value: {
        [key]: value,
      } as Partial<NutritionScreenUiState>,
    });
  };

  return {
    uiState,
    dispatchUiState,
    updateGoalInput: (key: keyof GoalInputState, value: string) =>
      dispatchUiState({ type: "updateGoalInput", key, value }),
    setPlanRejectedFoods: (
      value: string[] | ((current: string[]) => string[]),
    ) => setUiStateField("planRejectedFoods", value),
    setQuantity: (value: string | ((current: string) => string)) =>
      setUiStateField("quantity", value),
    setUnit: (
      value: NutritionUnit | ((current: NutritionUnit) => NutritionUnit),
    ) => setUiStateField("unit", value),
    setMealType: (value: MealType | ((current: MealType) => MealType)) =>
      setUiStateField("mealType", value),
    setActiveArea: (
      value: NutritionArea | ((current: NutritionArea) => NutritionArea),
    ) => setUiStateField("activeArea", value),
    setPlanningTab: (
      value: PlanningTabKey | ((current: PlanningTabKey) => PlanningTabKey),
    ) => setUiStateField("planningTab", value),
    setActiveDiaryView: (
      value: DiaryViewKey | ((current: DiaryViewKey) => DiaryViewKey),
    ) => setUiStateField("activeDiaryView", value),
    setActiveDiaryMeal: (value: MealType | ((current: MealType) => MealType)) =>
      setUiStateField("activeDiaryMeal", value),
    setDiaryPage: (value: number | ((current: number) => number)) =>
      setUiStateField("diaryPage", value),
    setTodayMealsSectionOpen: (
      value: boolean | ((current: boolean) => boolean),
    ) => setUiStateField("todayMealsSectionOpen", value),
    setTodayDiarySectionOpen: (
      value: boolean | ((current: boolean) => boolean),
    ) => setUiStateField("todayDiarySectionOpen", value),
    setScannerOpen: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("scannerOpen", value),
    setIsSavingGoal: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("isSavingGoal", value),
    setCustomFoodOpen: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("customFoodOpen", value),
    setCustomMealOpen: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("customMealOpen", value),
    setEditingMeal: (
      value:
        | MealDefinition
        | null
        | ((current: MealDefinition | null) => MealDefinition | null),
    ) => setUiStateField("editingMeal", value),
    setIsGeneratingPlan: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("isGeneratingPlan", value),
    setIsExportingPdf: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("isExportingPdf", value),
    setMessage: (
      value: string | null | ((current: string | null) => string | null),
    ) => setUiStateField("message", value),
    setDiarySuccessFeedback: (
      value:
        | DiarySuccessFeedback
        | null
        | ((
            current: DiarySuccessFeedback | null,
          ) => DiarySuccessFeedback | null),
    ) => setUiStateField("diarySuccessFeedback", value),
    setGoalObjectiveDraft: (
      value:
        | NutritionObjective
        | ((current: NutritionObjective) => NutritionObjective),
    ) => setUiStateField("goalObjectiveDraft", value),
    setGoalInputsDirty: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("goalInputsDirty", value),
    setMealPlanDraft: (
      value: MealPlan | null | ((current: MealPlan | null) => MealPlan | null),
    ) => setUiStateField("mealPlanDraft", value),
    setPlanCalories: (value: string | ((current: string) => string)) =>
      setUiStateField("planCalories", value),
    setCustomWaterOpen: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("customWaterOpen", value),
    setIsUpdatingWater: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("isUpdatingWater", value),
    setMealChooserOpen: (value: boolean | ((current: boolean) => boolean)) =>
      setUiStateField("mealChooserOpen", value),
    setEditingCustomFood: (
      value: FoodItem | null | ((current: FoodItem | null) => FoodItem | null),
    ) => setUiStateField("editingCustomFood", value),
    setCopyCandidate: (
      value:
        | DiaryItemSnapshot
        | null
        | ((current: DiaryItemSnapshot | null) => DiaryItemSnapshot | null),
    ) => setUiStateField("copyCandidate", value),
  };
}
