"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

let portalReady = false;

function subscribePortalReady(onStoreChange: () => void) {
  if (!portalReady) {
    queueMicrotask(() => {
      portalReady = true;
      onStoreChange();
    });
  }

  return () => {};
}

function getPortalReadySnapshot() {
  return portalReady;
}

export interface NutritionLayoutProps {
  isMobileLayout: boolean;
  children: ReactNode;
}

export function NutritionLayout({ isMobileLayout, children }: NutritionLayoutProps) {
  const isClient = useSyncExternalStore(
    subscribePortalReady,
    getPortalReadySnapshot,
    () => false,
  );
  const portalTarget = isClient ? document.body : null;

  const backgroundLayer = (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#020617]" />
      <div
        data-nutrition-bg="image"
        className={`absolute inset-0 bg-cover bg-no-repeat ${isMobileLayout ? "bg-[center_top]" : "bg-center"}`}
        style={{
          backgroundImage: `url('${isMobileLayout ? "/images/nutrition-mobile-bg.png" : "/images/nutrition-bg.png"}')`,
          opacity: isMobileLayout ? 0.5 : 0.4,
        }}
      />
      {isMobileLayout ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,22,0.58)_0%,rgba(3,7,14,0.82)_54%,rgba(2,6,13,0.94)_100%)]" />
          <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml,%3Csvg_width=%2260%22_height=%2260%22_viewBox=%220_0_60_60%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg_fill=%22none%22_fill-rule=%22evenodd%22%3E%3Cg_fill=%22%2334d399%22_fill-opacity=%221%22%3E%3Cpath_d=%22M36_34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6_34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6_4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="absolute -left-[20%] -top-[10%] h-[140vw] w-[140vw] transform-gpu bg-[radial-gradient(circle,rgba(15,159,110,0.14)_0%,transparent_60%)] blur-[80px]" />
          <div className="absolute -bottom-[10%] -right-[20%] h-[120vw] w-[120vw] transform-gpu bg-[radial-gradient(circle,rgba(6,182,212,0.12)_0%,transparent_60%)] blur-[80px]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,22,0.36)_0%,rgba(4,10,22,0.82)_58%,rgba(4,10,22,0.96)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.12),transparent_24%)]" />
        </>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {portalTarget ? createPortal(backgroundLayer, portalTarget) : backgroundLayer}
      <div className="relative z-[1] min-h-screen overflow-x-hidden">
        <main className={`container relative z-10 ${isMobileLayout ? "pb-12 pt-5" : "pb-12 pt-8"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
