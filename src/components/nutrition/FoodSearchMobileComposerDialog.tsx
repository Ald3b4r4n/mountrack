import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Repeat2 } from "lucide-react";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import { getFoodLabel, formatFoodSourceLabel } from "@/modules/nutrition/ui-helpers";

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
      {/* Backdrop */}
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-0 bg-[#02060d]/84 backdrop-blur-[14px]"
        onClick={onCloseComposer}
        aria-label="Fechar registro do alimento"
      />

      {/* Dialog container */}
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
          className="pointer-events-auto relative isolate flex h-full flex-col overflow-hidden rounded-[1.6rem] bg-[#060f1e] ring-1 ring-[#14324a]/60"
        >
          {/* Header */}
          <div className="px-4 pb-3 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={onCloseComposer}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.84rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                onClick={onSwapFoodSelection}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.82rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <Repeat2 size={15} />
                Trocar
              </button>
            </div>

            <h2
              id="nutrition-mobile-composer-title"
              className="text-[1.1rem] font-semibold leading-tight text-[var(--text-primary)]"
            >
              {getFoodLabel(selectedFood)}
            </h2>
            <p className="mt-0.5 text-[0.78rem] text-[var(--text-muted)]">
              {selectedFood.brand ? `${selectedFood.brand} · ` : ""}
              {formatFoodSourceLabel(selectedFood.source)}
              {" · "}
              {activeMealLabel}
            </p>
          </div>

          {/* Scrollable body */}
          <div
            ref={composerScrollRef}
            data-testid="mobile-composer-scroll-area"
            className="relative flex-1 overflow-y-auto px-4 pb-4 pt-1 [overscroll-behavior:contain]"
          >
            {children}
          </div>

          {/* Fixed footer with save button */}
          <div className="relative px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={onSubmit}
              className="btn-primary min-h-[3.2rem] w-full text-[0.95rem] font-semibold shadow-[0_12px_32px_rgba(52,211,153,0.2)]"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
