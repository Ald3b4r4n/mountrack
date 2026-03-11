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
  isMobileLayout?: boolean;
  mealsSectionOpen?: boolean;
  onMealsSectionOpenChange?: (open: boolean) => void;
  mealsSectionRef?: React.Ref<HTMLElement>;
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
  isMobileLayout = false,
}: {
  meal: MealDefinition;
  active: boolean;
  label: string;
  calories: number;
  count: number;
  onSelect: () => void;
  onAdd: () => void;
  onManage?: () => void;
  isMobileLayout?: boolean;
}) {
  return (
    <article
      className={[
        "glass-panel static-panel rounded-[1.15rem] p-3 transition-all duration-200",
        isMobileLayout ? "border border-white/7" : "",
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
          <div className="min-w-0">
            <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {active ? "Agora" : meal.isDefault === false ? "Extra" : "Refeição"}
            </span>
            <strong className="mt-1 block truncate font-['Outfit',sans-serif] text-[1rem] text-[var(--text-primary)]">
              {label}
            </strong>
          </div>
          {active ? <span className="badge badge-success">Ativa</span> : meal.isDefault === false ? <span className="badge badge-success">Extra</span> : null}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <strong className="block font-['Outfit',sans-serif] text-[1.1rem] text-[var(--text-primary)]">
            {formatCalories(calories)}
          </strong>
          <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[0.74rem] text-[var(--text-secondary)]">
            {count} item(ns)
          </span>
        </div>
        {isMobileLayout ? (
          <span className="mt-2 block text-[0.78rem] text-[var(--text-secondary)]">
            {active ? "Toque para ver esta refeição." : "Toque para abrir esta refeição."}
          </span>
        ) : null}
      </button>
      <div className={`mt-3 grid gap-2 ${meal.isDefault === false ? "grid-cols-2" : "grid-cols-1"}`}>
        <button type="button" onClick={onAdd} className="btn-outline min-h-[2.7rem] w-full">
          Adicionar
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

function AddMealCard({ onAddMeal, isMobileLayout = false }: { onAddMeal: () => void; isMobileLayout?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAddMeal}
      className={[
        "glass-panel static-panel flex min-h-[10.75rem] w-full flex-col items-start justify-between rounded-[1.15rem] border border-dashed border-[#34d399]/20 bg-[#051427]/55 p-3.5 text-left transition-all duration-200 hover:border-[#34d399]/34 hover:bg-[#082037]/72 hover:shadow-[0_14px_34px_rgba(4,20,38,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.985]",
        isMobileLayout ? "w-[min(72vw,16rem)] shrink-0 snap-start" : "",
      ].join(" ")}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#34d399]/20 bg-[#34d399]/12 text-[var(--accent-primary)]">
        <Plus size={18} />
      </span>
      <span className="block">
        <strong className="block font-['Outfit',sans-serif] text-[1rem] text-[var(--text-primary)]">
          Adicionar refeição
        </strong>
        <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--text-secondary)]">
          Crie uma refeição extra, como Pré-treino ou Ceia.
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
  isMobileLayout = false,
  mealsSectionOpen,
  onMealsSectionOpenChange,
  mealsSectionRef,
  onOpenMeal,
  onOpenSearchForMeal,
  onManageMeal,
  onAddMeal,
  children,
}: TodayWorkspaceProps) {
  return (
    <section className="grid gap-4">
      <CollapsibleSection
        title="Refeições do dia"
        subtitle="Escolha uma refeição para registrar alimentos."
        badge={!embedded ? <span className="badge badge-success">Hoje</span> : undefined}
        open={mealsSectionOpen}
        onOpenChange={onMealsSectionOpenChange}
        sectionRef={mealsSectionRef}
      >
        {isMobileLayout ? (
          <div className="grid gap-3">
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
                isMobileLayout
              />
            ))}
            <AddMealCard onAddMeal={onAddMeal} isMobileLayout />
          </div>
        ) : (
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
        )}
      </CollapsibleSection>

      {children}
    </section>
  );
}
