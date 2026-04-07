import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { MealType } from "@/modules/nutrition/domain/types";

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌤",
  lunch: "☀️",
  dinner: "🌅",
  snack: "🌙",
};

interface MealSectionHeaderProps {
  mealType: MealType;
  label: string;
  totalCalories: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddItem: () => void;
}

export function MealSectionHeader({
  mealType,
  label,
  totalCalories,
  isExpanded,
  onToggle,
  onAddItem,
}: MealSectionHeaderProps) {
  const icon = MEAL_ICONS[mealType] ?? "🍽";

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <button
        type="button"
        aria-label={label}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="text-[1.1rem] leading-none">{icon}</span>
        <strong className="text-[0.95rem]">{label}</strong>
        {totalCalories > 0 ? (
          <span className="ml-auto text-[0.82rem] font-medium text-[#34d399]">
            {Math.round(totalCalories)} kcal
          </span>
        ) : null}
        <span className="text-[var(--text-muted)]">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      <button
        type="button"
        aria-label={`Adicionar item em ${label}`}
        onClick={onAddItem}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#34d399] transition-colors hover:bg-[#34d399]/10"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}
