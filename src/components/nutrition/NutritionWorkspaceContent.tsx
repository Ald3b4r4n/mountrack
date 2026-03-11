import type { ComponentProps, RefObject } from "react";
import type { NutritionArea } from "@/components/nutrition/NutritionWorkspaceNav";
import { NutritionPlanningWorkspace } from "@/components/nutrition/NutritionPlanningWorkspace";
import { NutritionSearchWorkspace } from "@/components/nutrition/NutritionSearchWorkspace";
import { NutritionTodayWorkspaceSection } from "@/components/nutrition/NutritionTodayWorkspaceSection";
import { NutritionWorkspaceFrame } from "@/components/nutrition/NutritionWorkspaceFrame";

interface NutritionWorkspaceContentProps {
  activeArea: NutritionArea;
  isMobileLayout: boolean;
  workspaceMinHeight: number;
  activeWorkspaceRef: RefObject<HTMLDivElement | null>;
  todayProps: ComponentProps<typeof NutritionTodayWorkspaceSection>;
  searchProps: ComponentProps<typeof NutritionSearchWorkspace>;
  planningProps: ComponentProps<typeof NutritionPlanningWorkspace>;
}

export function NutritionWorkspaceContent({
  activeArea,
  isMobileLayout,
  workspaceMinHeight,
  activeWorkspaceRef,
  todayProps,
  searchProps,
  planningProps,
}: NutritionWorkspaceContentProps) {
  const todayWorkspaceContent = <NutritionTodayWorkspaceSection {...todayProps} />;
  const searchWorkspaceContent = <NutritionSearchWorkspace {...searchProps} />;
  const planningWorkspaceContent = <NutritionPlanningWorkspace {...planningProps} />;

  const activeWorkspaceContent =
    activeArea === "today"
      ? isMobileLayout
        ? todayWorkspaceContent
        : <NutritionWorkspaceFrame activeArea="today">{todayWorkspaceContent}</NutritionWorkspaceFrame>
      : activeArea === "search"
        ? isMobileLayout
          ? searchWorkspaceContent
          : <NutritionWorkspaceFrame activeArea="search">{searchWorkspaceContent}</NutritionWorkspaceFrame>
        : isMobileLayout
          ? planningWorkspaceContent
          : <NutritionWorkspaceFrame activeArea="planning">{planningWorkspaceContent}</NutritionWorkspaceFrame>;

  return (
    <div
      className="min-w-0"
      style={workspaceMinHeight > 0 ? { minHeight: `${workspaceMinHeight}px` } : undefined}
    >
      <div ref={activeWorkspaceRef} className="min-w-0">
        {activeWorkspaceContent}
      </div>
    </div>
  );
}
