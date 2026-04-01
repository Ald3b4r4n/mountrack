import type { Ref } from "react";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import { TodayWorkspace } from "@/components/nutrition/TodayWorkspace";
import type {
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";

interface NutritionTodayWorkspaceSectionProps {
  activeDiaryView: "today" | "history";
  onChangeDiaryView: (view: "today" | "history") => void;
  onChangeDiaryPage: (page: number) => void;
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Record<string, number>;
    protein: number;
    carbs: number;
    fat: number;
    consumedCalories: number;
  };
  waterRatio: number;
  isMobileLayout: boolean;
  onAdjustWater: (amount: number) => void;
  onOpenCustomWater: () => void;
  isUpdatingWater: boolean;
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  onChangeActiveDiaryMeal: (meal: MealType) => void;
  onOpenMeal: (meal: MealType) => void;
  onOpenSearchForMeal: (meal: MealType) => void;
  onOpenMealChooser: () => void;
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
  activeDiaryItems: DiaryItemSnapshot[];
  diaryPage: number;
  diaryTotalPages: number;
  isLoading: boolean;
  pagedDiaryItems: DiaryItemSnapshot[];
  onUpdateDiaryItem: (input: {
    itemId: string;
    quantity: number;
    mealType: MealType;
  }) => Promise<void> | void;
  onDeleteDiaryItem: (id: string) => void;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  onLoadHistory: (page: number) => void;
  onManageMeal: (meal: MealDefinition) => void;
  recentlyLoggedFoodLabel: string | null;
  mealsSectionOpen?: boolean;
  onMealsSectionOpenChange?: (open: boolean) => void;
  mealsSectionRef?: Ref<HTMLElement>;
  diarySectionOpen?: boolean;
  onDiarySectionOpenChange?: (open: boolean) => void;
  diarySectionRef?: Ref<HTMLElement>;
  onAddMeal: () => void;
}

export function NutritionTodayWorkspaceSection({
  activeDiaryView,
  onChangeDiaryView,
  onChangeDiaryPage,
  summary,
  waterRatio,
  isMobileLayout,
  onAdjustWater,
  onOpenCustomWater,
  isUpdatingWater,
  mealDefinitions,
  activeDiaryMeal,
  onChangeActiveDiaryMeal,
  onOpenMeal,
  onOpenSearchForMeal,
  onOpenMealChooser,
  groupedDiaryItems,
  activeDiaryItems,
  diaryPage,
  diaryTotalPages,
  isLoading,
  pagedDiaryItems,
  onUpdateDiaryItem,
  onDeleteDiaryItem,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  onLoadHistory,
  onManageMeal,
  recentlyLoggedFoodLabel,
  mealsSectionOpen,
  onMealsSectionOpenChange,
  mealsSectionRef,
  diarySectionOpen,
  onDiarySectionOpenChange,
  diarySectionRef,
  onAddMeal,
}: NutritionTodayWorkspaceSectionProps) {
  return (
    <TodayWorkspace
      activeDiaryMeal={activeDiaryMeal}
      groupedDiaryItems={groupedDiaryItems}
      mealDefinitions={mealDefinitions}
      mealSummary={summary.meals}
      embedded={!isMobileLayout}
      isMobileLayout={isMobileLayout}
      mealsSectionOpen={isMobileLayout ? mealsSectionOpen : undefined}
      onMealsSectionOpenChange={
        isMobileLayout ? onMealsSectionOpenChange : undefined
      }
      mealsSectionRef={isMobileLayout ? mealsSectionRef : undefined}
      onOpenMeal={onOpenMeal}
      onOpenSearchForMeal={onOpenSearchForMeal}
      onUpdateDiaryItem={onUpdateDiaryItem}
      onDeleteDiaryItem={onDeleteDiaryItem}
      onManageMeal={onManageMeal}
      onAddMeal={onAddMeal}
    >
      <DiaryPanel
        activeDiaryView={activeDiaryView}
        setActiveDiaryView={onChangeDiaryView}
        setDiaryPage={onChangeDiaryPage}
        summary={summary}
        waterRatio={waterRatio}
        isMobileLayout={isMobileLayout}
        handleAdjustWater={onAdjustWater}
        onOpenCustomWater={onOpenCustomWater}
        isUpdatingWater={isUpdatingWater}
        mealDefinitions={mealDefinitions}
        activeDiaryMeal={activeDiaryMeal}
        setActiveDiaryMeal={onChangeActiveDiaryMeal}
        onOpenSearchForMeal={onOpenSearchForMeal}
        onOpenMealChooser={onOpenMealChooser}
        groupedDiaryItems={groupedDiaryItems}
        activeDiaryItems={activeDiaryItems}
        diaryPage={diaryPage}
        diaryTotalPages={diaryTotalPages}
        isLoading={isLoading}
        pagedDiaryItems={pagedDiaryItems}
        handleDeleteDiaryItem={onDeleteDiaryItem}
        isHistoryLoading={isHistoryLoading}
        historyEntries={historyEntries}
        historyPage={historyPage}
        historyTotalPages={historyTotalPages}
        loadHistory={onLoadHistory}
        onManageMeal={onManageMeal}
        recentlyLoggedFoodLabel={recentlyLoggedFoodLabel}
        open={isMobileLayout ? diarySectionOpen : undefined}
        onOpenChange={isMobileLayout ? onDiarySectionOpenChange : undefined}
        sectionRef={isMobileLayout ? diarySectionRef : undefined}
      />
    </TodayWorkspace>
  );
}
