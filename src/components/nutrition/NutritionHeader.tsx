import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DailySummary, NutritionGoal } from "@/modules/nutrition/domain/types";
import { formatCalories, formatGrams, formatMilliliters } from "@/modules/nutrition/ui-helpers";

function CompactMetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <article
      className="glass-panel static-panel min-h-full rounded-[1rem] border-t-[3px] bg-[#06162d]/50 p-[0.95rem]"
      style={{ borderTopColor: accent }}
    >
      <p className="stat-label mb-[0.55rem]">{label}</p>
      <strong className="block text-[1.18rem] text-[var(--text-primary)]">{value}</strong>
    </article>
  );
}

function DesktopMacroStatusCard({
  label,
  current,
  target,
  accent,
}: {
  label: string;
  current: number;
  target: number;
  accent: string;
}) {
  const ratio = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="glass-panel static-panel min-h-full rounded-[1rem] bg-[#020b1c]/75 p-3">
      <div className="mb-[0.45rem] flex items-center justify-between gap-2">
        <span className="text-[0.74rem] uppercase tracking-[0.06em] text-[var(--text-muted)]">{label}</span>
        <span className="text-[0.78rem] text-[var(--text-secondary)]">
          {target > 0 ? `${formatGrams(target)} alvo` : "Sem alvo"}
        </span>
      </div>
      <strong className="mb-2 block text-[1rem]" style={{ color: accent }}>
        {formatGrams(current)}
      </strong>
      <div className="progress-track mb-[0.35rem] h-[0.42rem]">
        <div
          className="progress-fill"
          style={{
            width: `${ratio}%`,
            background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.92))`,
          }}
        />
      </div>
      <span className="text-[0.78rem] text-[var(--text-secondary)]">{Math.round(ratio)}% do objetivo</span>
    </div>
  );
}

function DesktopMacroHero({
  summary,
  goal,
  consumedRatio,
}: {
  summary: DailySummary;
  goal: NutritionGoal;
  consumedRatio: number;
}) {
  return (
    <article className="glass-panel static-panel rounded-[1.15rem] border-[#34d399]/20 bg-gradient-to-br from-[#051227]/85 to-[#0b1f37]/90 p-[0.95rem]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="stat-label mb-[0.35rem]">Macros do dia</p>
          <strong className="block text-[1.15rem] text-[var(--text-primary)]">Distribuicao nutricional</strong>
        </div>
        <span className="badge badge-success">{Math.round(consumedRatio)}% da meta kcal</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[0.6rem]">
        <DesktopMacroStatusCard label="Proteina" current={summary.protein} target={goal.targetProtein ?? 0} accent="#34d399" />
        <DesktopMacroStatusCard label="Carboidrato" current={summary.carbs} target={goal.targetCarbs ?? 0} accent="#22d3ee" />
        <DesktopMacroStatusCard label="Gordura" current={summary.fat} target={goal.targetFat ?? 0} accent="#fb7185" />
      </div>
    </article>
  );
}

function MobileSummaryTile({
  label,
  value,
  accentClass,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  accentClass: string;
  hint?: string;
  onClick?: () => void;
}) {
  const tileClassName = [
    "rounded-[1rem] border border-white/7 bg-[linear-gradient(180deg,rgba(7,18,35,0.92),rgba(6,17,30,0.72))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
    onClick
      ? "w-full text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.985]"
      : "",
  ]
    .join(" ")
    .trim();

  const content = (
    <>
      <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
      <strong className={`mt-1.5 block text-[1rem] leading-none ${accentClass}`}>{value}</strong>
      {hint ? (
        <span className="mt-2 flex items-center gap-1 text-[0.76rem] text-[var(--text-secondary)]">
          {hint}
          {onClick ? <ChevronRight size={14} className="shrink-0 text-[var(--accent-primary)]" /> : null}
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={tileClassName}>
        {content}
      </button>
    );
  }

  return (
    <article className={tileClassName}>{content}</article>
  );
}

function MobileMacroRail({
  label,
  current,
  target,
  accent,
}: {
  label: string;
  current: number;
  target: number;
  accent: string;
}) {
  const ratio = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <article className="rounded-[0.95rem] border border-white/7 bg-[#071223]/76 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
        <strong className="text-[0.88rem] leading-none" style={{ color: accent }}>
          {formatGrams(current)} / {formatGrams(target)}
        </strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full"
          style={{
            width: `${ratio}%`,
            background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.92))`,
          }}
        />
      </div>
    </article>
  );
}

function MobileSummaryStrip({
  summary,
  goal,
  waterRatio,
  onOpenConsumedSummary,
}: {
  summary: DailySummary;
  goal: NutritionGoal;
  waterRatio: number;
  onOpenConsumedSummary?: () => void;
}) {
  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <MobileSummaryTile
          label="Consumido"
          value={formatCalories(summary.consumedCalories)}
          accentClass="text-[var(--text-primary)]"
          hint={onOpenConsumedSummary ? "Ver refeicoes" : undefined}
          onClick={onOpenConsumedSummary}
        />
        <MobileSummaryTile
          label="Restante"
          value={formatCalories(summary.remainingCalories)}
          accentClass="text-[var(--text-primary)]"
        />
      </div>
      <div className="glass-panel static-panel rounded-[1rem] border-[#34d399]/14 bg-[linear-gradient(145deg,rgba(5,20,38,0.9),rgba(6,22,45,0.7))] p-3.5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Hoje</p>
            <strong className="block text-[1rem] text-[var(--text-primary)]">Hidratacao e macros</strong>
            <p className="mt-1 text-[0.82rem] text-[var(--text-secondary)]">
              Veja o alvo de agua e como os macros estao distribuindo o dia.
            </p>
          </div>
          <span className="badge badge-success whitespace-nowrap">
            {formatMilliliters(summary.waterIntakeMl)} / {formatMilliliters(summary.targetWaterMl)}
          </span>
        </div>
        <div className="mb-3">
          <div className="progress-track mb-1.5 h-[0.42rem]">
            <div
              className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]"
              style={{ width: `${waterRatio}%` }}
            />
          </div>
          <span className="text-[0.8rem] text-[var(--text-secondary)]">
            {Math.round(waterRatio)}% da meta de agua
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <MobileSummaryTile label="Meta kcal" value={formatCalories(summary.targetCalories)} accentClass="text-[var(--text-primary)]" />
          <MobileSummaryTile label="Agua alvo" value={formatMilliliters(summary.targetWaterMl)} accentClass="text-sky-300" />
        </div>
        <div className="mt-2.5 grid gap-2">
          <MobileMacroRail label="Proteina" current={summary.protein} target={goal.targetProtein ?? 0} accent="#6ee7b7" />
          <MobileMacroRail label="Carbo" current={summary.carbs} target={goal.targetCarbs ?? 0} accent="#67e8f9" />
          <MobileMacroRail label="Gordura" current={summary.fat} target={goal.targetFat ?? 0} accent="#fda4af" />
        </div>
      </div>
    </div>
  );
}

interface NutritionHeaderProps {
  isMobileLayout: boolean;
  isPreview: boolean;
  summary: DailySummary;
  goal: NutritionGoal;
  waterRatio: number;
  consumedRatio: number;
  onOpenConsumedSummary?: () => void;
}

export function NutritionHeader({
  isMobileLayout,
  isPreview,
  summary,
  goal,
  waterRatio,
  consumedRatio,
  onOpenConsumedSummary,
}: NutritionHeaderProps) {
  return (
    <header
      className={`glass-panel static-panel anim-enter relative mb-[0.9rem] overflow-hidden ${
        isMobileLayout ? "rounded-[1.45rem] p-[1rem]" : "p-[1.2rem]"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#34d399]/10 via-[#06b6d4]/5 to-transparent" />
      {!isMobileLayout ? (
        <div
          className="absolute -right-16 -top-14 h-60 w-60 rounded-full blur-md"
          style={{ background: "radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%)" }}
        />
      ) : null}

      <div className="relative grid gap-4">
        <div className={`flex flex-wrap justify-between ${isMobileLayout ? "gap-3" : "gap-4"}`}>
          <div className={isMobileLayout ? "max-w-none" : "max-w-[42rem]"}>
            <span className={`badge badge-success ${isMobileLayout ? "mb-2" : "mb-3"}`}>Nutricao</span>
            <h1 className={`glow-text mb-1 ${isMobileLayout ? "text-[clamp(1.7rem,7vw,2.05rem)]" : "text-[clamp(2rem,4vw,3rem)]"}`}>
              Diario Nutricional
            </h1>
            <p className={`page-subtitle ${isMobileLayout ? "max-w-[30ch] text-[0.92rem]" : "max-w-[58ch]"}`}>
              {isMobileLayout
                ? "Acompanhe o dia, registre refeicoes e ajuste sua rotina com clareza."
                : "Registre refeicoes, acompanhe agua, ajuste metas e organize seu plano alimentar."}
            </p>
            {!isMobileLayout && isPreview ? (
              <p className="mt-2 text-[0.85rem] text-[var(--accent-secondary)]">
                Preview local ativo. O fluxo real continua disponivel com login normal.
              </p>
            ) : null}
          </div>
          <div className={`flex flex-wrap gap-2.5 self-start ${isMobileLayout ? "w-full" : "w-auto"}`}>
            <Link href="/" className={`nav-pill justify-center ${isMobileLayout ? "flex-1" : ""}`}>
              Dashboard
            </Link>
          </div>
        </div>

        {isMobileLayout ? (
          <MobileSummaryStrip
            summary={summary}
            goal={goal}
            waterRatio={waterRatio}
            onOpenConsumedSummary={onOpenConsumedSummary}
          />
        ) : (
          <div className="grid grid-cols-12 gap-[0.7rem]">
            <div className="col-span-3">
              <CompactMetricCard label="Meta diaria" value={formatCalories(summary.targetCalories)} accent="var(--accent-primary)" />
            </div>
            <div className="col-span-3">
              <CompactMetricCard label="Consumido" value={formatCalories(summary.consumedCalories)} accent="var(--accent-warm)" />
            </div>
            <div className="col-span-3">
              <CompactMetricCard label="Restante" value={formatCalories(summary.remainingCalories)} accent="var(--accent-secondary)" />
            </div>
            <article className="glass-panel static-panel col-span-3 min-h-full rounded-[1rem] bg-gradient-to-br from-[#06162d]/70 to-[#0d253d]/80 p-[0.95rem]">
              <div className="mb-[0.6rem] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-[1_1_10rem]">
                  <p className="stat-label mb-[0.35rem]">Agua hoje</p>
                  <strong className="block text-[1.15rem] leading-[1.15] text-[#e0f2fe]">
                    {formatMilliliters(summary.waterIntakeMl)}
                  </strong>
                </div>
                <span className="badge badge-success shrink-0 whitespace-nowrap">
                  {formatMilliliters(summary.targetWaterMl)}
                </span>
              </div>
              <div className="progress-track mb-[0.45rem]">
                <div className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]" style={{ width: `${waterRatio}%` }} />
              </div>
              <span className="block text-[0.82rem] text-[var(--text-secondary)]">{Math.round(waterRatio)}% da meta diaria</span>
            </article>
            <div className="col-span-full">
              <DesktopMacroHero summary={summary} goal={goal} consumedRatio={consumedRatio} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
