import React from "react";
import Link from "next/link";
import { DailySummary, NutritionGoal } from "@/modules/nutrition/domain/types";
import { formatCalories, formatMilliliters, formatGrams } from "@/modules/nutrition/ui-helpers";

// Subcomponents moved from NutritionScreen
export function CompactMetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <article className="glass-panel static-panel p-[0.95rem] bg-[#06162d]/50 min-h-full border-t-[3px]" style={{ borderTopColor: accent }}>
      <p className="stat-label mb-[0.6rem]">{label}</p>
      <strong className="block text-[1.32rem] text-[var(--text-primary)]">{value}</strong>
    </article>
  );
}

export function HydrationMetricCard({ current, target, ratio }: { current: number; target: number; ratio: number }) {
  return (
    <article className="glass-panel static-panel p-[0.95rem] min-h-full min-w-0 bg-gradient-to-br from-[#06162d]/70 to-[#0d253d]/80">
      <div className="flex justify-between gap-3 items-start flex-wrap mb-[0.6rem]">
        <div className="min-w-0 flex-[1_1_10rem]">
          <p className="stat-label mb-[0.35rem]">Água hoje</p>
          <strong className="block text-[clamp(1.05rem,4vw,1.22rem)] text-[#e0f2fe] leading-[1.15]">{formatMilliliters(current)}</strong>
        </div>
        <span className="badge badge-success whitespace-nowrap shrink-0">{formatMilliliters(target)}</span>
      </div>
      <div className="progress-track mb-[0.45rem]">
        <div className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]" style={{ width: `${ratio}%` }} />
      </div>
      <span className="block text-[var(--text-secondary)] text-[0.82rem]">{Math.round(ratio)}% da meta diaria</span>
    </article>
  );
}

const MACRO_LABELS = { protein: "Proteina", carbs: "Carboidrato", fat: "Gordura" };

export function MacroStatusCard({ label, current, target, accent }: { label: string; current: number; target: number; accent: string }) {
  const ratio = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="glass-panel static-panel p-3 px-[0.85rem] bg-[#020b1c]/75 min-h-full">
      <div className="flex justify-between gap-2 items-center mb-[0.45rem]">
        <span className="text-[var(--text-muted)] text-[0.74rem] uppercase tracking-[0.06em]">{label}</span>
        <span className="text-[var(--text-secondary)] text-[0.78rem]">{target > 0 ? `${formatGrams(target)} alvo` : "Sem alvo"}</span>
      </div>
      <strong className="block text-[1rem] mb-2" style={{ color: accent }}>{formatGrams(current)}</strong>
      <div className="progress-track mb-[0.35rem] h-[0.42rem]">
        <div className="progress-fill" style={{ width: `${ratio}%`, background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.92))` }} />
      </div>
      <span className="text-[var(--text-secondary)] text-[0.78rem]">{Math.round(ratio)}% do objetivo</span>
    </div>
  );
}

export function MacroHeroCard({ summary, goal, consumedRatio }: { summary: DailySummary; goal: NutritionGoal; consumedRatio: number }) {
  return (
    <article className="glass-panel static-panel p-[0.95rem] bg-gradient-to-br from-[#051227]/85 to-[#0b1f37]/90 border-[#34d399]/20">
      <div className="flex justify-between gap-3 items-start flex-wrap mb-3">
        <div>
          <p className="stat-label mb-[0.35rem]">Macros do dia</p>
          <strong className="block text-[1.24rem] text-[var(--text-primary)]">Painel de distribuicao nutricional</strong>
        </div>
        <span className="badge badge-success">{Math.round(consumedRatio)}% da meta kcal</span>
      </div>
      <div className="grid gap-[0.6rem] grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <MacroStatusCard label={MACRO_LABELS.protein} current={summary.protein} target={goal.targetProtein ?? 0} accent="#34d399" />
        <MacroStatusCard label={MACRO_LABELS.carbs} current={summary.carbs} target={goal.targetCarbs ?? 0} accent="#22d3ee" />
        <MacroStatusCard label={MACRO_LABELS.fat} current={summary.fat} target={goal.targetFat ?? 0} accent="#fb7185" />
      </div>
    </article>
  );
}

interface NutritionHeaderProps {
  isMobileLayout: boolean;
  isPreview: boolean;
  summary: DailySummary;
  goal: NutritionGoal;
  waterRatio: number;
  consumedRatio: number;
}

export function NutritionHeader({
  isMobileLayout,
  isPreview,
  summary,
  goal,
  waterRatio,
  consumedRatio,
}: NutritionHeaderProps) {
  return (
    <header className={`glass-panel static-panel anim-enter relative overflow-hidden mb-[0.9rem] ${isMobileLayout ? "p-[0.95rem]" : "p-[1.2rem]"}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#34d399]/10 via-[#06b6d4]/5 to-transparent" />
      {!isMobileLayout ? <div className="absolute -top-14 -right-16 w-60 h-60 rounded-full blur-md" style={{ background: "radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%)" }} /> : null}
      
      <div className={`relative grid ${isMobileLayout ? "gap-3" : "gap-4"}`}>
        <div className={`flex justify-between flex-wrap ${isMobileLayout ? "gap-3" : "gap-4"}`}>
          <div className="max-w-[42rem]">
            <span className={`badge badge-success ${isMobileLayout ? "mb-2" : "mb-3"}`}>Nutrição</span>
            <h1 className={`glow-text mb-1 ${isMobileLayout ? "text-[clamp(1.75rem,7vw,2.15rem)]" : "text-[clamp(2rem,4vw,3rem)]"}`}>Diário Nutricional</h1>
            <p className="page-subtitle max-w-[58ch]">
              {isMobileLayout ? "Registre refeições, acompanhe macros e água do dia sem fricção." : "Registre refeições, acompanhe água, ajuste metas e monte seu plano alimentar ideal."}
            </p>
            {!isMobileLayout && isPreview ? <p className="text-[var(--accent-secondary)] mt-2 text-[0.85rem]">Preview local ativo. O fluxo real continua disponível com login normal.</p> : null}
          </div>
          <div className={`flex gap-2.5 flex-wrap self-start ${isMobileLayout ? "w-full" : "w-auto"}`}>
            <Link href="/" className={`nav-pill justify-center ${isMobileLayout ? "flex-1" : ""}`}>Dashboard</Link>
          </div>
        </div>

        <div className={`grid ${isMobileLayout ? "gap-[0.55rem] grid-cols-2" : "gap-[0.7rem] grid-cols-12"}`}>
          <div className={`${isMobileLayout ? "col-span-1" : "col-span-3"}`}>
            <CompactMetricCard label="Meta diaria" value={formatCalories(summary.targetCalories)} accent="var(--accent-primary)" />
          </div>
          <div className={`${isMobileLayout ? "col-span-1" : "col-span-3"}`}>
            <CompactMetricCard label="Consumido" value={formatCalories(summary.consumedCalories)} accent="var(--accent-warm)" />
          </div>
          <div className={`${isMobileLayout ? "col-span-1" : "col-span-3"}`}>
            <CompactMetricCard label="Restante" value={formatCalories(summary.remainingCalories)} accent="var(--accent-secondary)" />
          </div>
          <div className={`${isMobileLayout ? "col-span-full" : "col-span-3"}`}>
            <HydrationMetricCard current={summary.waterIntakeMl} target={summary.targetWaterMl} ratio={waterRatio} />
          </div>
          <div className="col-span-full">
            <MacroHeroCard summary={summary} goal={goal} consumedRatio={consumedRatio} />
          </div>
        </div>
      </div>
    </header>
  );
}
