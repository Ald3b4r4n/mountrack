import type {
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";
import { CollapsibleSection, SegmentButton } from "./CommonUI";
import { DiaryHistoryView } from "./DiaryHistoryView";
import { DiaryTodayView } from "./DiaryTodayView";

interface DiaryPanelProps {
  activeDiaryView: "today" | "history";
  setActiveDiaryView: (view: "today" | "history") => void;
  setDiaryPage: (page: number) => void;
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
  handleAdjustWater: (amount: number) => void;
  onOpenCustomWater?: () => void;
  handleSaveWater: () => void;
  isUpdatingWater: boolean;
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  setActiveDiaryMeal: (meal: MealType) => void;
  onOpenSearchForMeal?: (meal: MealType) => void;
  onOpenMealChooser?: () => void;
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
  activeDiaryItems: DiaryItemSnapshot[];
  diaryPage: number;
  diaryTotalPages: number;
  isLoading: boolean;
  pagedDiaryItems: DiaryItemSnapshot[];
  handleDeleteDiaryItem: (id: string) => void;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  loadHistory: (page: number) => void;
  onManageMeal?: (meal: MealDefinition) => void;
  recentlyLoggedFoodLabel?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sectionRef?: React.Ref<HTMLElement>;
}

export function DiaryPanel({
  activeDiaryView,
  setActiveDiaryView,
  setDiaryPage,
  summary,
  waterRatio,
  isMobileLayout,
  handleAdjustWater,
  onOpenCustomWater,
  handleSaveWater,
  isUpdatingWater,
  mealDefinitions,
  activeDiaryMeal,
  setActiveDiaryMeal,
  onOpenSearchForMeal,
  onOpenMealChooser,
  groupedDiaryItems,
  activeDiaryItems,
  diaryPage,
  diaryTotalPages,
  isLoading,
  pagedDiaryItems,
  handleDeleteDiaryItem,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  loadHistory,
  onManageMeal,
  recentlyLoggedFoodLabel,
  open,
  onOpenChange,
  sectionRef,
}: DiaryPanelProps) {
  const activeMealDefinition =
    mealDefinitions.find((meal) => meal.key === activeDiaryMeal) ?? { key: activeDiaryMeal, label: String(activeDiaryMeal) };
  const activeMealLabel = activeMealDefinition.label;
  const panelTitle = isMobileLayout
    ? activeDiaryView === "today"
      ? "Registro do dia"
      : "Histórico do diário"
    : "Histórico e diário";
  const panelSubtitle = isMobileLayout
    ? activeDiaryView === "today"
      ? "Refeição atual, água do dia e histórico quando precisar."
      : "Consulte os dias anteriores sem sair de Hoje."
    : "Revise aqui os consumos e a água do dia.";
  const panelBadgeLabel = activeDiaryView === "today" ? (isMobileLayout ? activeMealLabel : "Hoje") : "Histórico";

  return (
    <CollapsibleSection
      title={panelTitle}
      subtitle={panelSubtitle}
      badge={<span className="badge badge-success">{panelBadgeLabel}</span>}
      open={open}
      onOpenChange={onOpenChange}
      sectionRef={sectionRef}
    >
      <div className="mb-[0.95rem] flex flex-wrap justify-end gap-4">
        {isMobileLayout ? (
          activeDiaryView === "today" ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
              <div className="min-w-0">
                <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Agora
                </span>
                <strong className="block text-[0.96rem] text-[var(--text-primary)]">Tudo nesta refeição</strong>
                <span className="mt-1 block text-[0.8rem] text-[var(--text-secondary)]">
                  Abra o histórico só quando quiser revisar.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveDiaryView("history");
                  setDiaryPage(1);
                }}
                className="btn-outline min-w-auto shrink-0 px-3 py-2 text-[0.8rem]"
              >
                Histórico
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveDiaryView("today");
                setDiaryPage(1);
              }}
              className="btn-outline min-w-auto px-3 py-2 text-[0.8rem]"
            >
              Voltar para hoje
            </button>
          )
        ) : (
          <div className="flex flex-wrap gap-[0.55rem]">
            <SegmentButton
              active={activeDiaryView === "today"}
              label="Hoje"
              onClick={() => {
                setActiveDiaryView("today");
                setDiaryPage(1);
              }}
            />
            <SegmentButton
              active={activeDiaryView === "history"}
              label="Histórico"
              onClick={() => {
                setActiveDiaryView("history");
                setDiaryPage(1);
              }}
            />
          </div>
        )}
      </div>

      {activeDiaryView === "today" ? (
        <DiaryTodayView
          summary={summary}
          waterRatio={waterRatio}
          isMobileLayout={isMobileLayout}
          handleAdjustWater={handleAdjustWater}
          onOpenCustomWater={onOpenCustomWater}
          handleSaveWater={handleSaveWater}
          isUpdatingWater={isUpdatingWater}
          mealDefinitions={mealDefinitions}
          activeDiaryMeal={activeDiaryMeal}
          setActiveDiaryMeal={setActiveDiaryMeal}
          setDiaryPage={setDiaryPage}
          onOpenSearchForMeal={onOpenSearchForMeal}
          onOpenMealChooser={onOpenMealChooser}
          groupedDiaryItems={groupedDiaryItems}
          activeDiaryItems={activeDiaryItems}
          diaryPage={diaryPage}
          diaryTotalPages={diaryTotalPages}
          isLoading={isLoading}
          pagedDiaryItems={pagedDiaryItems}
          handleDeleteDiaryItem={handleDeleteDiaryItem}
          onManageMeal={onManageMeal}
          recentlyLoggedFoodLabel={recentlyLoggedFoodLabel}
        />
      ) : (
        <DiaryHistoryView
          isMobileLayout={isMobileLayout}
          isHistoryLoading={isHistoryLoading}
          historyEntries={historyEntries}
          historyPage={historyPage}
          historyTotalPages={historyTotalPages}
          loadHistory={loadHistory}
        />
      )}
    </CollapsibleSection>
  );
}
