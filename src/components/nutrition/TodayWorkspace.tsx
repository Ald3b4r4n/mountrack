import type { ReactNode } from "react";
import { Plus, Settings2 } from "lucide-react";
import type { DiaryItemSnapshot, MealDefinition, MealType } from "@/modules/nutrition/domain/types";
import { formatCalories } from "@/modules/nutrition/ui-helpers";
import { CollapsibleSection } from "./CommonUI";

type MealGroupMap = Record<string, DiaryItemSnapshot[]>;

interface TodayWorkspaceProps {
  activeDiaryMeal: MealType;
  groupedDiaryItems: MealGroupMap;
  mealDefinitions: MealDefinition[];
  mealSummary: Record<string, number>;
  embedded?: boolean;
  onOpenMeal: (meal: MealType) => void;
  onOpenSearchForMeal: (meal: MealType) => void;
  onManageMeal?: (meal: MealDefinition) => void;
  onAddMeal: () => void;
  children: ReactNode;
}

function MealQuickCard({
  meal,
  active,
  label,
  calories,
  count,
  onSelect,
  onAdd,
  onManage,
}: {
  meal: MealDefinition;
  active: boolean;
  label: string;
  calories: number;
  count: number;
  onSelect: () => void;
  onAdd: () => void;
  onManage?: () => void;
}) {
  return (
    <article
      className={[
        "glass-panel static-panel rounded-[1.15rem] p-3.5 transition-all duration-200",
        active
          ? "border-[#34d399]/30 bg-[linear-gradient(135deg,rgba(52,211,153,0.12),rgba(6,182,212,0.06))] shadow-[0_14px_34px_rgba(4,20,38,0.28)]"
          : "bg-[#06162d]/60 hover:border-[#34d399]/16 hover:bg-[#07192f]/76 hover:shadow-[0_14px_34px_rgba(4,20,38,0.24)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full rounded-[0.9rem] text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="block text-[0.72rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
          {meal.isDefault === false ? <span className="badge badge-success">Extra</span> : null}
        </div>
        <strong className="mt-2 block font-['Outfit',sans-serif] text-[1.15rem] text-[var(--text-primary)]">
          {formatCalories(calories)}
        </strong>
        <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
          {count} item(ns)
        </span>
      </button>
      <div className={`mt-3 grid gap-2 ${meal.isDefault === false ? "grid-cols-2" : "grid-cols-1"}`}>
        <button type="button" onClick={onAdd} className="btn-outline min-h-[2.7rem] w-full">
          Adicionar alimento
        </button>
        {meal.isDefault === false ? (
          <button type="button" onClick={onManage} className="btn-outline min-h-[2.7rem] w-full">
            <span className="inline-flex items-center gap-2">
              <Settings2 size={14} />
              Gerenciar
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AddMealCard({ onAddMeal }: { onAddMeal: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddMeal}
      className="glass-panel static-panel flex min-h-[10.75rem] w-full flex-col items-start justify-between rounded-[1.15rem] border border-dashed border-[#34d399]/20 bg-[#051427]/55 p-3.5 text-left transition-all duration-200 hover:border-[#34d399]/34 hover:bg-[#082037]/72 hover:shadow-[0_14px_34px_rgba(4,20,38,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.985]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#34d399]/20 bg-[#34d399]/12 text-[var(--accent-primary)]">
        <Plus size={18} />
      </span>
      <span className="block">
        <strong className="block font-['Outfit',sans-serif] text-[1rem] text-[var(--text-primary)]">
          Adicionar refeicao
        </strong>
        <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--text-secondary)]">
          Crie um bloco extra, como Pre treino ou Ceia, e registre itens nele.
        </span>
      </span>
    </button>
  );
}

export function TodayWorkspace({
  activeDiaryMeal,
  groupedDiaryItems,
  mealDefinitions,
  mealSummary,
  embedded = false,
  onOpenMeal,
  onOpenSearchForMeal,
  onManageMeal,
  onAddMeal,
  children,
}: TodayWorkspaceProps) {
  return (
    <section className="grid gap-4">
      <CollapsibleSection
        title="Refeicoes do dia"
        subtitle="Troque entre as refeicoes, registre novos itens e gerencie blocos extras por aqui."
        badge={!embedded ? <span className="badge badge-success">Diario ativo</span> : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {mealDefinitions.map((meal) => (
            <MealQuickCard
              key={meal.key}
              meal={meal}
              active={activeDiaryMeal === meal.key}
              label={meal.label}
              calories={mealSummary[meal.key] ?? 0}
              count={groupedDiaryItems[meal.key]?.length ?? 0}
              onSelect={() => onOpenMeal(meal.key)}
              onAdd={() => onOpenSearchForMeal(meal.key)}
              onManage={meal.isDefault === false ? () => onManageMeal?.(meal) : undefined}
            />
          ))}
          <AddMealCard onAddMeal={onAddMeal} />
        </div>
      </CollapsibleSection>

      {children}
    </section>
  );
}
