import type { FoodSource } from "@/modules/nutrition/domain/types";

export type FoodSourceFilter = "all" | FoodSource;

const SOURCE_LABELS: Record<FoodSourceFilter, string> = {
  all: "Todos",
  fatsecret: "FatSecret",
  openfoodfacts: "OpenFoodFacts",
  usda: "USDA",
  custom: "Meus Alimentos",
  internal: "Catálogo",
  tbca: "TBCA",
};

interface SourceFilterChipsProps {
  activeSource: FoodSourceFilter;
  onChange: (source: FoodSourceFilter) => void;
  availableSources: FoodSourceFilter[];
}

export function SourceFilterChips({
  activeSource,
  onChange,
  availableSources,
}: SourceFilterChipsProps) {
  if (availableSources.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {availableSources.map((source) => {
        const isActive = source === activeSource;
        return (
          <button
            key={source}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(source)}
            className={`rounded-full border px-3 py-1 text-[0.75rem] font-medium transition-colors ${
              isActive
                ? "border-[#34d399] bg-[#34d399]/10 text-[#34d399]"
                : "border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {SOURCE_LABELS[source] ?? source}
          </button>
        );
      })}
    </div>
  );
}
