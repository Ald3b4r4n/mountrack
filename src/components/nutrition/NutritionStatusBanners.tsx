import { CheckCircle2 } from "lucide-react";
import { formatCalories } from "@/modules/nutrition/ui-helpers";

interface NutritionStatusBannersProps {
  isMobileLayout: boolean;
  message: string | null;
  syncWarningMessage: string | null;
  successFeedback: {
    foodLabel: string;
    mealLabel: string;
  } | null;
  successMealLabel: string | null;
  successMealItemsCount: number;
  successMealCalories: number;
  onOpenSuccessMeal: () => void;
  onRegisterMore: () => void;
}

export function NutritionStatusBanners({
  isMobileLayout,
  message,
  syncWarningMessage,
  successFeedback,
  successMealLabel,
  successMealItemsCount,
  successMealCalories,
  onOpenSuccessMeal,
  onRegisterMore,
}: NutritionStatusBannersProps) {
  return (
    <>
      {message ? (
        <div className="glass-panel static-panel anim-enter mb-4 border-[#34d399]/20 p-[0.9rem_1rem]">
          <p className="text-[var(--text-secondary)]">{message}</p>
        </div>
      ) : null}

      {!isMobileLayout && successFeedback ? (
        <div className="glass-panel static-panel anim-enter mb-4 overflow-hidden border-[#34d399]/22 bg-[linear-gradient(135deg,rgba(6,28,27,0.96),rgba(5,20,38,0.9))] p-[0.95rem_1rem]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#86efac]">
                <CheckCircle2 size={16} />
                Registrado no diario
              </div>
              <p className="mt-2 text-[0.94rem] text-[var(--text-primary)]">
                <strong>{successFeedback.foodLabel}</strong> entrou em{" "}
                <strong>{successMealLabel ?? successFeedback.mealLabel}</strong>.
              </p>
              <p className="mt-1 text-[0.84rem] text-[var(--text-secondary)]">
                Voce voltou para Hoje com esse bloco em foco. Abra o registro ou continue adicionando itens no mesmo ritmo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {successMealLabel ? <span className="badge badge-success">{successMealLabel}</span> : null}
                <span className="badge badge-success">{successMealItemsCount} item(ns)</span>
                <span className="badge badge-success">{formatCalories(successMealCalories)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenSuccessMeal} className="btn-primary min-w-auto px-3 py-2 text-[0.82rem]">
                {successMealLabel ? `Abrir ${successMealLabel}` : "Abrir registro"}
              </button>
              <button type="button" onClick={onRegisterMore} className="btn-outline min-w-auto px-3 py-2 text-[0.82rem]">
                Registrar mais
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {syncWarningMessage ? (
        <div className="glass-panel static-panel anim-enter mb-4 border-[#f59e0b]/26 bg-[#2a1806]/45 p-[0.95rem_1rem]">
          <strong className="block text-[0.95rem] text-[#fcd34d]">Sincronizacao entre dispositivos desativada</strong>
          <p className="mt-1 text-[0.88rem] text-[var(--text-secondary)]">{syncWarningMessage}</p>
        </div>
      ) : null}
    </>
  );
}
