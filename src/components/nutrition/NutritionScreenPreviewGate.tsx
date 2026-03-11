"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

interface NutritionScreenPreviewGateProps {
  render: (isPreview: boolean) => ReactNode;
}

export function NutritionScreenPreviewGate({
  render,
}: NutritionScreenPreviewGateProps) {
  const searchParams = useSearchParams();
  const isPreview =
    process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1";

  return <>{render(isPreview)}</>;
}
