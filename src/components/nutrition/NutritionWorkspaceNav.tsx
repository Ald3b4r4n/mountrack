import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";

export type NutritionArea = "none" | "today" | "search" | "planning";

const AREA_ITEMS: Array<{
  key: NutritionArea;
  label: string;
  icon: typeof CalendarDays;
  description: string;
}> = [
  {
    key: "today",
    label: "Histórico",
    icon: CalendarDays,
    description: "Diário por data — adicione e edite",
  },
  {
    key: "search",
    label: "Buscar",
    icon: Search,
    description: "Buscar alimento e registrar",
  },
  {
    key: "planning",
    label: "Planejar",
    icon: SlidersHorizontal,
    description: "Metas e plano alimentar",
  },
];

interface NutritionWorkspaceNavProps {
  activeArea: NutritionArea;
  isMobileLayout: boolean;
  onChangeArea: (area: NutritionArea) => void;
}

function AreaButton({
  active,
  icon: Icon,
  label,
  description,
  compact,
  onClick,
}: {
  active: boolean;
  icon: typeof CalendarDays;
  label: string;
  description: string;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-[1.25rem] border transition-all duration-300 ease-out focus-visible:outline-none active:scale-[0.97]",
        compact
          ? "flex min-h-[4.2rem] flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5"
          : "flex min-h-[5.8rem] flex-1 items-center gap-4 px-5 py-4 text-left",
        active
          ? "border-[#34d399]/40 bg-gradient-to-br from-[#34d399]/20 to-[#0ea5e9]/15 text-[var(--text-primary)] shadow-[0_8px_32px_rgba(52,211,153,0.18)]"
          : "border-white/5 bg-[#050f1d]/40 text-[var(--text-secondary)] hover:border-white/15 hover:bg-[#050f1d]/60 hover:text-[var(--text-primary)]",
      ].join(" ")}
      aria-pressed={active}
    >
      {/* Active Indicator Glow */}
      {active && (
        <div className="absolute -inset-1 blur-2xl opacity-20 bg-gradient-to-r from-[#34d399] to-[#0ea5e9]" />
      )}
      
      <span
        className={[
          "relative flex shrink-0 items-center justify-center rounded-2xl border transition-all duration-300",
          compact ? "h-8 w-8" : "h-12 w-12",
          active
            ? "border-[#34d399]/30 bg-[#34d399]/20 text-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            : "border-white/10 bg-white/5 text-[var(--text-muted)] group-hover:border-[#34d399]/30 group-hover:text-[var(--text-primary)]",
        ].join(" ")}
      >
        <Icon size={compact ? 16 : 22} strokeWidth={active ? 2.5 : 1.5} />
      </span>
      
      <span className={compact ? "relative text-[0.72rem] font-bold uppercase tracking-wider" : "relative min-w-0"}>
        <span className={`block font-['Outfit',sans-serif] ${compact ? '' : 'text-[1.05rem] font-black tracking-tight'} leading-tight`}>
          {label}
        </span>
        {!compact ? (
          <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--text-secondary)] opacity-60">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function NutritionWorkspaceNav({
  activeArea,
  isMobileLayout,
  onChangeArea,
}: NutritionWorkspaceNavProps) {
  if (isMobileLayout) {
    return (
      <section className="sticky top-3 z-30 mb-5">
        <nav className="flex items-center gap-2 rounded-[1.6rem] border border-white/10 bg-[#050f1d]/85 p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {AREA_ITEMS.map((item) => (
            <AreaButton
              key={item.key}
              active={activeArea === item.key}
              icon={item.icon}
              label={item.label}
              description={item.description}
              compact
              onClick={() => onChangeArea(item.key)}
            />
          ))}
        </nav>
      </section>
    );
  }

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-3">
      {AREA_ITEMS.map((item) => (
        <AreaButton
          key={item.key}
          active={activeArea === item.key}
          icon={item.icon}
          label={item.label}
          description={item.description}
          compact={false}
          onClick={() => onChangeArea(item.key)}
        />
      ))}
    </section>
  );
}
