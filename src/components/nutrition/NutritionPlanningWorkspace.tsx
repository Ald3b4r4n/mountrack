import type { ReactNode, RefObject } from "react";
import { GoalPanel, type GoalPanelProps } from "@/components/nutrition/GoalPanel";
import { MealPlanPanel, type MealPlanPanelProps } from "@/components/nutrition/MealPlanPanel";
import type { PlanningTabKey } from "@/modules/nutrition/constants";
import type { MealPlan } from "@/modules/nutrition/domain/types";

interface NutritionPlanningWorkspaceProps {
  isMobileLayout: boolean;
  planningTabs: ReactNode;
  planningPanelMinHeight: number;
  activePlanningPanelRef: RefObject<HTMLDivElement | null>;
  planningTab: PlanningTabKey;
  displayedMealPlan: MealPlan | null;
  goalPanelProps: GoalPanelProps;
  mealPlanPanelProps: MealPlanPanelProps;
}

export function NutritionPlanningWorkspace({
  isMobileLayout,
  planningTabs,
  planningPanelMinHeight,
  activePlanningPanelRef,
  planningTab,
  displayedMealPlan,
  goalPanelProps,
  mealPlanPanelProps,
}: NutritionPlanningWorkspaceProps) {
  return (
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
          {planningTab === "goal" ? <GoalPanel {...goalPanelProps} /> : <MealPlanPanel {...mealPlanPanelProps} />}
        </div>
      </div>
    </section>
  );
}
