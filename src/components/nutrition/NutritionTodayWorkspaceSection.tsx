import type { Ref } from "react";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import type {
  DiaryHistoryEntry,
  MealType,
} from "@/modules/nutrition/domain/types";

interface NutritionTodayWorkspaceSectionProps {
  authUser?: Parameters<typeof authorizedNutritionFetch>[0] | null;
  isMobileLayout: boolean;
  todayEntry: DiaryHistoryEntry;
  onAddToToday: () => void;
  onOpenSearchForDateMeal?: (targetDate: string, meal: MealType) => void;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  onLoadHistory: (page: number) => void;
  diarySectionOpen?: boolean;
  onDiarySectionOpenChange?: (open: boolean) => void;
  diarySectionRef?: Ref<HTMLElement>;
}

export function NutritionTodayWorkspaceSection({
  authUser,
  isMobileLayout,
  todayEntry,
  onAddToToday,
  onOpenSearchForDateMeal,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  onLoadHistory,
  diarySectionOpen,
  onDiarySectionOpenChange,
  diarySectionRef,
}: NutritionTodayWorkspaceSectionProps) {
  return (
    <DiaryPanel
      authUser={authUser}
      isMobileLayout={isMobileLayout}
      todayEntry={todayEntry}
      onAddToToday={onAddToToday}
      onOpenSearchForDateMeal={onOpenSearchForDateMeal}
      isHistoryLoading={isHistoryLoading}
      historyEntries={historyEntries}
      historyPage={historyPage}
      historyTotalPages={historyTotalPages}
      loadHistory={onLoadHistory}
      open={isMobileLayout ? diarySectionOpen : undefined}
      onOpenChange={isMobileLayout ? onDiarySectionOpenChange : undefined}
      sectionRef={isMobileLayout ? diarySectionRef : undefined}
    />
  );
}
