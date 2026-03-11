import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import type { FoodItem } from "@/modules/nutrition/domain/types";

interface FoodSearchMobileComposerDialogProps {
  portalTarget: HTMLElement | null;
  isVisible: boolean;
  selectedFood: FoodItem | null;
  activeMealLabel: string;
  composerScrollRef: RefObject<HTMLDivElement | null>;
  onCloseComposer: () => void;
  onSwapFoodSelection: () => void;
  onSubmit: () => void;
  children: ReactNode;
}

export function FoodSearchMobileComposerDialog({
  portalTarget,
  isVisible,
  selectedFood,
  activeMealLabel,
  composerScrollRef,
  onCloseComposer,
  onSwapFoodSelection,
  onSubmit,
  children,
}: FoodSearchMobileComposerDialogProps) {
  if (!isVisible || !portalTarget || !selectedFood) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-0 bg-[#02060d]/84 backdrop-blur-[14px]"
        onClick={onCloseComposer}
        aria-label="Fechar registro do alimento"
      />

      <div
        className="relative z-10 flex h-full flex-col px-2.5"
        style={{
          paddingTop: "calc(0.55rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(0.55rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nutrition-mobile-composer-title"
          className="pointer-events-auto relative isolate flex h-full flex-col overflow-hidden rounded-[1.9rem] bg-[radial-gradient(circle_at_top,rgba(8,29,48,0.98),rgba(3,17,31,0.985)_42%,rgba(2,13,25,0.995)_100%)] ring-1 ring-[#14324a]/82 shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
        >
          <div className="absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.15),transparent_62%)]" />
          <div className="relative px-4 pb-3 pt-4">
            <div className="mb-4 flex justify-center">
              <span className="h-1.5 w-14 rounded-full bg-white/8" aria-hidden="true" />
            </div>

            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onCloseComposer}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#081728]/92 px-3.5 text-[0.9rem] text-[var(--text-primary)] ring-1 ring-[#17344d]/78 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.96]"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
                <span>Voltar</span>
              </button>
              <div className="min-w-0 flex-1">
                <span className="badge badge-success">Registro rapido</span>
                <strong
                  id="nutrition-mobile-composer-title"
                  className="mt-3 block text-[1.18rem] leading-tight text-[var(--text-primary)]"
                >
                  Registrar no diario
                </strong>
                <p className="mt-1 text-[0.88rem] leading-relaxed text-[var(--text-secondary)]">
                  Ajuste a porcao, confirme{" "}
                  <strong className="font-medium text-[var(--text-primary)]">{activeMealLabel}</strong> e volte para o
                  resumo do dia logo depois do registro.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSwapFoodSelection}
                className="rounded-full bg-[#07182a]/92 px-3.5 py-2 text-[0.85rem] text-[var(--text-primary)] ring-1 ring-[#17344d]/78 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/35 active:scale-[0.985]"
              >
                Trocar alimento
              </button>
              <span className="badge badge-success max-w-full truncate">
                {selectedFood.barcode ? `Codigo ${selectedFood.barcode}` : "Selecionado para registro"}
              </span>
              <span className="badge badge-success max-w-full truncate">Refeicao {activeMealLabel}</span>
            </div>
          </div>

          <div
            ref={composerScrollRef}
            data-testid="mobile-composer-scroll-area"
            className="relative flex-1 overflow-y-auto px-4 pb-4 pt-1 [overscroll-behavior:contain]"
          >
            {children}
          </div>

          <div className="relative px-4 pb-3 pt-3">
            <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(3,17,31,0),rgba(3,17,31,0.88))]" />
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onSubmit}
                className="btn-primary min-h-[3.35rem] w-full shadow-[0_18px_40px_rgba(52,211,153,0.18)]"
              >
                Adicionar ao diario em {activeMealLabel}
              </button>
              <p className="text-center text-[0.78rem] text-[var(--text-muted)]">
                Depois do registro, voce volta para Hoje com {activeMealLabel.toLowerCase()} em foco.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
