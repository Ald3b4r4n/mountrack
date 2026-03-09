import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import type { DiaryItemSnapshot, MealType } from "@/modules/nutrition/domain/types";
import { MEAL_LABELS, MEAL_ORDER } from "@/modules/nutrition/constants";
import { formatCalories } from "@/modules/nutrition/ui-helpers";

type MealGroupMap = Record<MealType, DiaryItemSnapshot[]>;

interface TodayWorkspaceProps {
  activeDiaryMeal: MealType;
  groupedDiaryItems: MealGroupMap;
  mealSummary: Partial<Record<MealType, number>>;
  onOpenMeal: (meal: MealType) => void;
  onOpenSearchForMeal: (meal: MealType) => void;
  onAddMeal: () => void;
  children: ReactNode;
}

function MealQuickCard({
  active,
  label,
  calories,
  count,
  onSelect,
  onAdd,
}: {
  active: boolean;
  label: string;
  calories: number;
  count: number;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <article
      className={[
        "glass-panel static-panel rounded-[1.15rem] p-3.5",
        active
          ? "border-[#34d399]/30 bg-[linear-gradient(135deg,rgba(52,211,153,0.12),rgba(6,182,212,0.06))]"
          : "bg-[#06162d]/60",
      ].join(" ")}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <span className="block text-[0.72rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
        <strong className="mt-2 block font-['Outfit',sans-serif] text-[1.15rem] text-[var(--text-primary)]">
          {formatCalories(calories)}
        </strong>
        <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
          {count} item(ns)
        </span>
      </button>
      <button type="button" onClick={onAdd} className="btn-outline mt-3 w-full min-h-[2.7rem]">
        Adicionar alimento
      </button>
    </article>
  );
}

function AddMealCard({ onAddMeal }: { onAddMeal: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddMeal}
      className="glass-panel static-panel flex min-h-[10.75rem] w-full flex-col items-start justify-between rounded-[1.15rem] border border-dashed border-[#34d399]/20 bg-[#051427]/55 p-3.5 text-left"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#34d399]/20 bg-[#34d399]/12 text-[var(--accent-primary)]">
        <Plus size={18} />
      </span>
      <span className="block">
        <strong className="block font-['Outfit',sans-serif] text-[1rem] text-[var(--text-primary)]">
          Adicionar refeicao
        </strong>
        <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--text-secondary)]">
          Abra a busca e registre um novo momento alimentar sem perder o contexto do dia.
        </span>
      </span>
    </button>
  );
}

export function TodayWorkspace({
  activeDiaryMeal,
  groupedDiaryItems,
  mealSummary,
  onOpenMeal,
  onOpenSearchForMeal,
  onAddMeal,
  children,
}: TodayWorkspaceProps) {
  return (
    <section className="grid gap-4">
      <div className="glass-panel static-panel rounded-[1.35rem] p-4 bg-[#06162d]/64">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <strong className="block font-['Outfit',sans-serif] text-[1.08rem] text-[var(--text-primary)]">
              Refeicoes do dia
            </strong>
            <span className="text-[0.88rem] text-[var(--text-secondary)]">
              Acesse uma refeicao rapido ou abra a busca para registrar um novo consumo.
            </span>
          </div>
          <span className="badge badge-success">Fluxo rapido</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {MEAL_ORDER.map((meal) => (
            <MealQuickCard
              key={meal}
              active={activeDiaryMeal === meal}
              label={MEAL_LABELS[meal]}
              calories={mealSummary[meal] ?? 0}
              count={groupedDiaryItems[meal]?.length ?? 0}
              onSelect={() => onOpenMeal(meal)}
              onAdd={() => onOpenSearchForMeal(meal)}
            />
          ))}
          <AddMealCard onAddMeal={onAddMeal} />
        </div>
      </div>

      {children}
    </section>
  );
}
