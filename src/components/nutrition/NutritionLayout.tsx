"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { NUTRITION_COMPANY_SIGNATURE } from "@/components/nutrition/meal-plan-pdf";

export interface NutritionLayoutProps {
  isMobileLayout: boolean;
  children: ReactNode;
}

export function NutritionLayout({ isMobileLayout, children }: NutritionLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020617]">
        {!isMobileLayout ? (
          <Image
            src="/images/nutrition-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-[0.42]"
          />
        ) : (
          <div className="absolute inset-0 opacity-[0.08] bg-[url('data:image/svg+xml,%3Csvg_width=%2260%22_height=%2260%22_viewBox=%220_0_60_60%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg_fill=%22none%22_fill-rule=%22evenodd%22%3E%3Cg_fill=%22%2334d399%22_fill-opacity=%221%22%3E%3Cpath_d=%22M36_34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6_34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6_4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        )}

        <div
          className={`absolute inset-0 ${
            isMobileLayout
              ? "bg-[linear-gradient(165deg,rgba(8,14,26,0.96)_0%,rgba(3,7,14,0.99)_100%)]"
              : "bg-[linear-gradient(180deg,rgba(4,10,22,0.42)_0%,rgba(4,10,22,0.86)_58%,rgba(4,10,22,0.96)_100%)]"
          }`}
        />

        {isMobileLayout ? (
          <>
            <div className="absolute inset-0 z-0 bg-[url('/images/nutrition-mobile-bg.png')] bg-cover bg-center bg-no-repeat opacity-85 mix-blend-overlay" />
            <div className="absolute -left-[20%] -top-[10%] h-[140vw] w-[140vw] transform-gpu bg-[radial-gradient(circle,rgba(15,159,110,0.15)_0%,transparent_60%)] blur-[80px]" />
            <div className="absolute -bottom-[10%] -right-[20%] h-[120vw] w-[120vw] transform-gpu bg-[radial-gradient(circle,rgba(6,182,212,0.12)_0%,transparent_60%)] blur-[80px]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.12),transparent_24%)]" />
        )}
      </div>

      <main className={`container relative z-10 ${isMobileLayout ? "pb-28 pt-5" : "pb-12 pt-8"}`}>
        {children}
      </main>

      <footer className={`relative z-10 flex justify-center p-6 text-center ${isMobileLayout ? "pb-24" : ""}`}>
        <a
          href="https://antoniorafael.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="badge badge-success border-[#34d399]/20 bg-[#0f172a]/40 text-[#d1fae5] no-underline"
        >
          {NUTRITION_COMPANY_SIGNATURE}
        </a>
      </footer>
    </div>
  );
}
