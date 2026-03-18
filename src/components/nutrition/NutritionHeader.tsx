import Link from "next/link";
import {
  Apple,
  ArrowLeft,
  ChevronRight,
  Coffee,
  Salad,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import type {
  DailySummary,
  NutritionGoal,
} from "@/modules/nutrition/domain/types";
import {
  formatCalories,
  formatGrams,
  formatMilliliters,
} from "@/modules/nutrition/ui-helpers";

function CircularProgress({
  ratio,
  color,
  size = 48,
  strokeWidth = 4,
  children,
}: {
  ratio: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (ratio / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function WaveIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 25" className={className} preserveAspectRatio="none">
      <path
        d="M0 15 C 20 5, 40 5, 60 15 C 80 25, 90 25, 100 15 V 25 H 0 Z"
        fill={`url(#wave-grad-${color.replace("#", "")})`}
      />
      <defs>
        <linearGradient
          id={`wave-grad-${color.replace("#", "")}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
      <strong className="block text-[1.18rem] text-[var(--text-primary)]">
        {value}
      </strong>
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
        <span className="text-[0.74rem] uppercase tracking-[0.06em] text-[var(--text-muted)]">
          {label}
        </span>
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
      <span className="text-[0.78rem] text-[var(--text-secondary)]">
        {Math.round(ratio)}% do objetivo
      </span>
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
          <strong className="block text-[1.15rem] text-[var(--text-primary)]">
            Distribuição nutricional
          </strong>
        </div>
        <span className="badge badge-success">
          {Math.round(consumedRatio)}% da meta kcal
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[0.6rem]">
        <DesktopMacroStatusCard
          label="Proteína"
          current={summary.protein}
          target={goal.targetProtein ?? 0}
          accent="#34d399"
        />
        <DesktopMacroStatusCard
          label="Carboidrato"
          current={summary.carbs}
          target={goal.targetCarbs ?? 0}
          accent="#22d3ee"
        />
        <DesktopMacroStatusCard
          label="Gordura"
          current={summary.fat}
          target={goal.targetFat ?? 0}
          accent="#fb7185"
        />
      </div>
    </article>
  );
}

function MobileSummaryTile({
  label,
  value,
  meta,
  onClick,
  tone = "default",
  ratio = 0,
}: {
  label: string;
  value: string;
  meta?: string;
  onClick?: () => void;
  tone?: "default" | "accent" | "calm";
  ratio?: number;
}) {
  const color =
    tone === "accent" ? "#34d399" : tone === "calm" ? "#0ea5e9" : "#94a3b8";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative flex min-w-0 flex-1 flex-col rounded-[1.25rem] border border-white/10 bg-[#050f1d]/60 p-4 text-left transition-all ${onClick ? "active:scale-95" : ""}`}
    >
      <div className="flex items-start justify-between w-full">
        <div className="min-w-0">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] opacity-60">
            {label}
          </span>
          <strong className="mt-2 text-[1.15rem] font-black tracking-tight text-[var(--text-primary)] block">
            {value}
          </strong>
          {meta && (
            <div className="mt-2 flex items-center gap-1 text-[0.75rem] font-bold text-[#34d399]">
              <span className="truncate">{meta}</span>
              <ChevronRight size={12} className="shrink-0" />
            </div>
          )}
        </div>
        <CircularProgress ratio={ratio} color={color} size={42} strokeWidth={4}>
          <span className="text-[0.6rem] font-bold text-[var(--text-primary)]">
            {tone === "calm" ? "Livre" : `${Math.round(ratio)}%`}
          </span>
        </CircularProgress>
      </div>
    </button>
  );
}

function MobileActiveMealCard({
  mealLabel,
  mealCalories,
  onOpenMeal,
  onAddToMeal,
  recentlyLoggedFoodLabel,
  suggestedCalories = 0,
}: {
  mealLabel: string;
  mealCalories: number;
  onOpenMeal?: () => void;
  onAddToMeal?: () => void;
  recentlyLoggedFoodLabel?: string | null;
  suggestedCalories?: number;
}) {
  const getMealTheme = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("café") || l.includes("breakfast")) {
      return { Icon: Coffee, color: "#f59e0b", label: "Café" };
    }
    if (l.includes("almoço") || l.includes("lunch")) {
      return { Icon: Salad, color: "#10b981", label: "Almoço" };
    }
    if (l.includes("lanche") || l.includes("snack")) {
      return { Icon: Apple, color: "#0ea5e9", label: "Lanche" };
    }
    if (l.includes("jantar") || l.includes("dinner")) {
      return { Icon: Utensils, color: "#6366f1", label: "Jantar" };
    }
    return { Icon: UtensilsCrossed, color: "#34d399", label: "Refeição" };
  };

  const theme = getMealTheme(mealLabel);

  return (
    <article className="relative mt-2 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050f1d]/80 p-5 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
            AGORA
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              <theme.Icon size={24} style={{ color: theme.color }} />
            </span>
            <h3 className="text-[1.45rem] font-black tracking-tight text-[var(--text-primary)]">
              {recentlyLoggedFoodLabel || mealLabel}
            </h3>
          </div>
          {suggestedCalories > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: theme.color,
                  boxShadow: `0 0 8px ${theme.color}`,
                }}
              />
              <p className="text-[0.8rem] font-bold text-[var(--text-secondary)] opacity-90">
                Sugerido:{" "}
                <span className="text-[var(--text-primary)]">
                  {formatCalories(suggestedCalories)}
                </span>
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <span
            className="rounded-full px-4 py-1.5 text-[0.8rem] font-black text-[#050f1d] transition-all duration-500"
            style={{
              backgroundColor: theme.color,
              boxShadow: `0 0 20px ${theme.color}44`,
            }}
          >
            {formatCalories(mealCalories)}
          </span>
          <div className="flex items-center gap-1.5 opacity-60">
            <WaveIcon color={theme.color} className="h-5 w-14" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width:
              suggestedCalories > 0
                ? `${Math.min((mealCalories / suggestedCalories) * 100, 100)}%`
                : "0%",
            background: `linear-gradient(90deg, ${theme.color}, #ffffff55)`,
            boxShadow: `0 0 15px ${theme.color}88`,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onOpenMeal}
          className="btn-outline min-h-[3.2rem] rounded-xl text-[0.85rem] font-bold border-white/10 hover:bg-white/5"
        >
          Detalhes
        </button>
        <button
          onClick={onAddToMeal}
          className="btn-primary min-h-[3.2rem] rounded-xl text-[0.85rem] font-black shadow-lg"
        >
          Adicionar
        </button>
      </div>
    </article>
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
    <article className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#050f1d]/80 p-5 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] opacity-50">
            {label}
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong
              className="text-[1.3rem] font-black tracking-tight"
              style={{ color: accent }}
            >
              {formatGrams(current)}
            </strong>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CircularProgress
            ratio={ratio}
            color={accent}
            size={38}
            strokeWidth={3}
          >
            <span className="text-[0.55rem] font-bold text-[var(--text-primary)]">
              {Math.round(ratio)}%
            </span>
          </CircularProgress>
          <div className="flex items-center gap-1.5 opacity-60">
            <WaveIcon color={accent} className="h-5 w-12" />
            <span className="text-[0.65rem] font-bold text-[var(--text-secondary)]">
              Meta {formatGrams(target)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${ratio}%`,
            backgroundColor: accent,
            boxShadow: `0 0 12px ${accent}`,
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
  consumedRatio,
  activeMealLabel,
  activeMealCalories,
  onOpenConsumedSummary,
  onAddToActiveMeal,
  recentlyLoggedFoodLabel,
  onAdjustWater,
  onOpenCustomWater,
}: {
  summary: DailySummary;
  goal: NutritionGoal;
  waterRatio: number;
  consumedRatio: number;
  activeMealLabel: string;
  activeMealCalories: number;
  onOpenConsumedSummary?: () => void;
  onAddToActiveMeal?: () => void;
  recentlyLoggedFoodLabel?: string | null;
  onAdjustWater?: (amount: number) => void;
  onOpenCustomWater?: () => void;
}) {
  const suggestedCalories = Math.round((goal.targetCalories || 0) / 4);
  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="grid min-w-0 grid-cols-2 gap-2.5">
        <MobileSummaryTile
          label="Consumido"
          value={formatCalories(summary.consumedCalories)}
          meta={`${Math.round(consumedRatio)}%`}
          onClick={onOpenConsumedSummary}
          tone="accent"
          ratio={consumedRatio}
        />
        <MobileSummaryTile
          label="Restante"
          value={formatCalories(summary.remainingCalories)}
          meta={summary.remainingCalories > 0 ? "Livre" : "Meta"}
          tone="calm"
          ratio={100 - consumedRatio}
        />
      </div>
      <MobileActiveMealCard
        mealLabel={activeMealLabel}
        mealCalories={activeMealCalories}
        onOpenMeal={onOpenConsumedSummary}
        onAddToMeal={onAddToActiveMeal}
        recentlyLoggedFoodLabel={recentlyLoggedFoodLabel}
        suggestedCalories={suggestedCalories}
      />
      <div className="glass-panel static-panel min-w-0 overflow-hidden rounded-[1.25rem] border-white/5 bg-[#050f1d] p-4 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] opacity-50">
              Hoje
            </p>
            <h2 className="mt-1 text-[1.2rem] font-black tracking-tight text-[var(--text-primary)]">
              Água e metas
            </h2>
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.74rem] font-semibold text-[var(--text-secondary)]">
                {activeMealLabel} em foco
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10 px-4 text-[0.8rem] font-bold text-sky-200">
              Água {Math.round(waterRatio)}%
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          {/* Water Card */}
          <article className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050f1d]/80 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
                  ÁGUA
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <strong className="text-[1.3rem] font-black text-[var(--text-primary)]">
                    {summary.waterIntakeMl} ml
                  </strong>
                  <span className="text-[0.8rem] font-bold text-[var(--text-muted)] opacity-60">
                    / {summary.targetWaterMl} ml
                  </span>
                </div>
              </div>
              <CircularProgress
                ratio={waterRatio}
                color="#0ea5e9"
                size={42}
                strokeWidth={4}
              >
                <span className="text-[0.6rem] font-bold text-[var(--text-primary)]">
                  {Math.round(waterRatio)}%
                </span>
              </CircularProgress>
            </div>

            <div className="mt-6 flex items-center gap-6">
              {/* Simple Pitcher Representation */}
              <div className="relative h-20 w-16 overflow-hidden rounded-b-xl border-2 border-white/20">
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-sky-500 to-sky-300 transition-all duration-1000 ease-in-out"
                  style={{
                    height: `${Math.min(waterRatio, 100)}%`,
                    boxShadow: "0 0 15px #0ea5e980",
                  }}
                />
                <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/10" />
              </div>

              <div className="flex-1">
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-sky-400 transition-all duration-700"
                    style={{ width: `${Math.min(waterRatio, 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-[0.75rem] font-bold text-[var(--text-secondary)] opacity-80 leading-relaxed">
                  Lembre-se de beber água regularmente!
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2.5">
              <button
                onClick={() => onAdjustWater?.(250)}
                className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 py-3 transition-all active:scale-95 active:bg-white/10"
              >
                <span className="text-sky-400">🥛</span>
                <span className="mt-1 text-[0.75rem] font-black text-[var(--text-primary)]">
                  250 ML
                </span>
              </button>
              <button
                onClick={() => onAdjustWater?.(500)}
                className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 py-3 transition-all active:scale-95 active:bg-white/10"
              >
                <span className="text-sky-400">🥛🥛</span>
                <span className="mt-1 text-[0.75rem] font-black text-[var(--text-primary)]">
                  500 ML
                </span>
              </button>
              <button
                onClick={onOpenCustomWater}
                className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 py-3 transition-all active:scale-95 active:bg-white/10"
              >
                <span className="text-[1.1rem] text-[var(--text-muted)]">
                  +
                </span>
                <span className="mt-0.5 text-[0.65rem] font-bold text-[var(--text-muted)]">
                  Personalizado
                </span>
              </button>
            </div>
          </article>

          {/* Macro Cards */}
          <div className="grid gap-2.5">
            <MobileMacroRail
              label="Proteína"
              current={summary.protein}
              target={goal.targetProtein ?? 0}
              accent="#34d399"
            />
            <MobileMacroRail
              label="Carbo"
              current={summary.carbs}
              target={goal.targetCarbs ?? 0}
              accent="#22d3ee"
            />
            <MobileMacroRail
              label="Gordura"
              current={summary.fat}
              target={goal.targetFat ?? 0}
              accent="#fb7185"
            />
          </div>
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
  activeMealLabel: string;
  activeMealCalories: number;
  onOpenConsumedSummary?: () => void;
  onAddToActiveMeal?: () => void;
  recentlyLoggedFoodLabel?: string | null;
  onAdjustWater?: (amount: number) => void;
  onOpenCustomWater?: () => void;
}

export function NutritionHeader({
  isMobileLayout,
  isPreview,
  summary,
  goal,
  waterRatio,
  consumedRatio,
  activeMealLabel,
  activeMealCalories,
  onOpenConsumedSummary,
  onAddToActiveMeal,
  recentlyLoggedFoodLabel,
  onAdjustWater,
  onOpenCustomWater,
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
          style={{
            background:
              "radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%)",
          }}
        />
      ) : null}

      <div className="relative grid gap-4">
        <div
          className={`flex flex-wrap justify-between ${isMobileLayout ? "gap-3" : "gap-4"}`}
        >
          <div className={isMobileLayout ? "max-w-none" : "max-w-[42rem]"}>
            <div
              className={`flex flex-wrap items-center justify-between gap-2 ${isMobileLayout ? "mb-2" : "mb-3"}`}
            >
              <span className="badge badge-success">Nutrição</span>
              {isMobileLayout ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[0.76rem] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[#34d399]/18 hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft size={13} />
                  Painel
                </Link>
              ) : null}
            </div>
            <h1
              className={`glow-text mb-1 ${isMobileLayout ? "text-[clamp(1.55rem,6.2vw,1.85rem)]" : "text-[clamp(2rem,4vw,3rem)]"}`}
            >
              {isMobileLayout ? "Hoje" : "Diário nutricional"}
            </h1>
            <p
              className={`page-subtitle ${isMobileLayout ? "max-w-[30ch] text-[0.92rem]" : "max-w-[58ch]"}`}
            >
              {isMobileLayout
                ? "Diário, água e metas no mesmo fluxo."
                : "Registre refeições, acompanhe água, ajuste metas e organize seu plano alimentar."}
            </p>
            {!isMobileLayout && isPreview ? (
              <p className="mt-2 text-[0.85rem] text-[var(--accent-secondary)]">
                Preview local ativo. O fluxo real continua disponível com login
                normal.
              </p>
            ) : null}
          </div>
          {!isMobileLayout ? (
            <div className="flex flex-wrap gap-2.5 self-start">
              <Link href="/" className="nav-pill justify-center">
                Painel
              </Link>
            </div>
          ) : null}
        </div>

        {isMobileLayout ? (
          <MobileSummaryStrip
            summary={summary}
            goal={goal}
            waterRatio={waterRatio}
            consumedRatio={consumedRatio}
            activeMealLabel={activeMealLabel}
            activeMealCalories={activeMealCalories}
            onOpenConsumedSummary={onOpenConsumedSummary}
            onAddToActiveMeal={onAddToActiveMeal}
            recentlyLoggedFoodLabel={recentlyLoggedFoodLabel}
            onAdjustWater={onAdjustWater}
            onOpenCustomWater={onOpenCustomWater}
          />
        ) : (
          <div className="grid grid-cols-12 gap-[0.7rem]">
            <div className="col-span-2">
              <CompactMetricCard
                label="Meta diaria"
                value={formatCalories(summary.targetCalories)}
                accent="var(--accent-primary)"
              />
            </div>
            <div className="col-span-2">
              <CompactMetricCard
                label="Consumido"
                value={formatCalories(summary.consumedCalories)}
                accent="var(--accent-warm)"
              />
            </div>
            <div className="col-span-2">
              <CompactMetricCard
                label="Restante"
                value={formatCalories(summary.remainingCalories)}
                accent="var(--accent-secondary)"
              />
            </div>

            <article className="glass-panel static-panel col-span-3 min-h-full rounded-[1.2rem] border border-white/10 bg-gradient-to-br from-[#041225]/82 to-[#0b1f37]/88 p-[1rem]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] opacity-60">
                    Refeição em foco
                  </p>
                  <strong className="mt-1 block text-[1.08rem] font-black text-[var(--text-primary)]">
                    {recentlyLoggedFoodLabel ?? activeMealLabel}
                  </strong>
                  <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                    {formatCalories(activeMealCalories)}
                  </span>
                </div>
                <span className="badge badge-success shrink-0">Agora</span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#86efac]"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.min(
                        100,
                        goal.targetCalories > 0
                          ? (activeMealCalories / (goal.targetCalories / 4)) *
                              100
                          : 0,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </article>

            <article className="glass-panel static-panel col-span-3 min-h-full rounded-[1.2rem] bg-gradient-to-br from-[#06162d]/70 to-[#0d253d]/80 p-[0.95rem]">
              <div className="mb-[0.6rem] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-[1_1_10rem]">
                  <p className="stat-label mb-[0.35rem]">Água hoje</p>
                  <strong className="block text-[1.15rem] leading-[1.15] text-[#e0f2fe]">
                    {formatMilliliters(summary.waterIntakeMl)}
                  </strong>
                </div>
                <span className="badge badge-success shrink-0 whitespace-nowrap">
                  {formatMilliliters(summary.targetWaterMl)}
                </span>
              </div>
              <div className="progress-track mb-[0.45rem]">
                <div
                  className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]"
                  style={{ width: `${waterRatio}%` }}
                />
              </div>
              <span className="block text-[0.82rem] text-[var(--text-secondary)]">
                {Math.round(waterRatio)}% da meta diária
              </span>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onAdjustWater?.(250)}
                  className="rounded-[0.75rem] border border-white/8 bg-white/5 px-2 py-1.5 text-[0.75rem] font-bold text-sky-200 transition-colors hover:bg-white/10"
                >
                  +250 ml
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustWater?.(500)}
                  className="rounded-[0.75rem] border border-white/8 bg-white/5 px-2 py-1.5 text-[0.75rem] font-bold text-sky-200 transition-colors hover:bg-white/10"
                >
                  +500 ml
                </button>
                <button
                  type="button"
                  onClick={onOpenCustomWater}
                  className="rounded-[0.75rem] border border-white/8 bg-white/5 px-2 py-1.5 text-[0.75rem] font-bold text-[var(--text-secondary)] transition-colors hover:bg-white/10"
                >
                  Custom
                </button>
              </div>
            </article>
            <div className="col-span-full">
              <DesktopMacroHero
                summary={summary}
                goal={goal}
                consumedRatio={consumedRatio}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
