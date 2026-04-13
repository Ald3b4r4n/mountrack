import type {
  DiaryItemSnapshot,
  DiaryHistoryEntry,
  MealType,
} from "@/modules/nutrition/domain/types";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import { CollapsibleSection } from "./CommonUI";
import { DiaryHistoryView } from "./DiaryHistoryView";

interface DiaryPanelProps {
  authUser?: Parameters<typeof authorizedNutritionFetch>[0] | null;
  isMobileLayout: boolean;
  todayEntry?: DiaryHistoryEntry;
  onAddToToday?: () => void;
  onOpenSearchForDateMeal?: (targetDate: string, meal: MealType) => void;
  onCopyDiaryItem?: (item: DiaryItemSnapshot) => void;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  loadHistory: (page: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sectionRef?: React.Ref<HTMLElement>;
}

export function DiaryPanel({
  authUser,
  isMobileLayout,
  todayEntry,
  onAddToToday,
  onOpenSearchForDateMeal,
  onCopyDiaryItem,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  loadHistory,
  open,
  onOpenChange,
  sectionRef,
}: DiaryPanelProps) {
  return (
    <CollapsibleSection
      title="Histórico"
      subtitle="Registros por data — toque para ver ou editar."
      badge={<span className="badge badge-success">Diário</span>}
      open={open}
      onOpenChange={onOpenChange}
      sectionRef={sectionRef}
    >
      <DiaryHistoryView
        authUser={authUser}
        isMobileLayout={isMobileLayout}
        todayEntry={todayEntry}
        onAddToToday={onAddToToday}
        onOpenSearchForDateMeal={onOpenSearchForDateMeal}
        onCopyDiaryItem={onCopyDiaryItem}
        isHistoryLoading={isHistoryLoading}
        historyEntries={historyEntries}
        historyPage={historyPage}
        historyTotalPages={historyTotalPages}
        loadHistory={loadHistory}
      />
    </CollapsibleSection>
  );
}
