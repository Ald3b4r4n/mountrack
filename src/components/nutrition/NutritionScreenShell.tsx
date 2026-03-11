import type { ComponentProps, ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BarcodeScannerDialog } from "@/components/nutrition/BarcodeScannerDialog";
import { CustomMealDialog } from "@/components/nutrition/CustomMealDialog";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { NutritionLayout } from "@/components/nutrition/NutritionLayout";
import { NutritionStatusBanners } from "@/components/nutrition/NutritionStatusBanners";
import { NutritionWorkspaceNav } from "@/components/nutrition/NutritionWorkspaceNav";
import { CustomFoodDialog } from "./CustomFoodDialog";

interface NutritionScreenShellProps {
  isPreview: boolean;
  isMobileLayout: boolean;
  workspaceContent: ReactNode;
  barcodeScannerProps: ComponentProps<typeof BarcodeScannerDialog>;
  customMealDialogKey: string;
  customMealDialogProps: ComponentProps<typeof CustomMealDialog>;
  customFoodDialogProps: ComponentProps<typeof CustomFoodDialog>;
  headerProps: ComponentProps<typeof NutritionHeader>;
  navProps: ComponentProps<typeof NutritionWorkspaceNav>;
  statusBannersProps: ComponentProps<typeof NutritionStatusBanners>;
}

export function NutritionScreenShell({
  isPreview,
  isMobileLayout,
  workspaceContent,
  barcodeScannerProps,
  customMealDialogKey,
  customMealDialogProps,
  customFoodDialogProps,
  headerProps,
  navProps,
  statusBannersProps,
}: NutritionScreenShellProps) {
  const pageContent = (
    <NutritionLayout isMobileLayout={isMobileLayout}>
      <BarcodeScannerDialog {...barcodeScannerProps} />
      <CustomMealDialog key={customMealDialogKey} {...customMealDialogProps} />
      <CustomFoodDialog {...customFoodDialogProps} />
      <NutritionHeader {...headerProps} />
      <NutritionWorkspaceNav {...navProps} />
      <NutritionStatusBanners {...statusBannersProps} />
      {workspaceContent}
    </NutritionLayout>
  );

  if (isPreview) {
    return pageContent;
  }

  return <ProtectedRoute>{pageContent}</ProtectedRoute>;
}
