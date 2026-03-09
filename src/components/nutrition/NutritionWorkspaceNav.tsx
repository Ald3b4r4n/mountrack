import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";

export type NutritionArea = "today" | "search" | "planning";

const AREA_ITEMS: Array<{
  key: NutritionArea;
  label: string;
  icon: typeof CalendarDays;
  description: string;
}> = [
  {
    key: "today",
    label: "Hoje",
    icon: CalendarDays,
    description: "Diario, agua e historico recente",
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
        "group rounded-[1.1rem] border transition-colors",
        compact
          ? "flex min-h-[4.5rem] flex-1 flex-col items-center justify-center gap-1.5 px-3 py-2"
          : "flex min-h-[5.5rem] flex-1 items-center gap-3 px-4 py-3 text-left",
        active
          ? "border-[#34d399]/30 bg-[linear-gradient(135deg,rgba(52,211,153,0.14),rgba(6,182,212,0.08))] text-[var(--text-primary)]"
          : "border-[var(--border-glass)] bg-[#071121]/72 text-[var(--text-secondary)]",
      ].join(" ")}
      aria-pressed={active}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-full border",
          compact ? "h-9 w-9" : "h-11 w-11",
          active
            ? "border-[#34d399]/25 bg-[#34d399]/12 text-[var(--accent-primary)]"
            : "border-[var(--border-glass)] bg-white/5 text-[var(--text-secondary)]",
        ].join(" ")}
      >
        <Icon size={compact ? 18 : 20} />
      </span>
      <span className={compact ? "text-[0.78rem] font-semibold" : "min-w-0"}>
        <span className="block font-['Outfit',sans-serif] text-[0.98rem] leading-tight">{label}</span>
        {!compact ? (
          <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--text-secondary)]">
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
      <div className="fixed inset-x-0 bottom-3 z-40 px-3">
        <nav className="glass-panel static-panel mx-auto flex max-w-md items-center gap-2 rounded-[1.4rem] border border-[#34d399]/10 bg-[#04101e]/90 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
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
      </div>
    );
  }

  return (
    <section className="mb-5 grid gap-3 md:grid-cols-3">
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
