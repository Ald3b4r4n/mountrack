"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

interface ConfirmActionDialogProps {
  open: boolean;
  title?: string;
  description: string;
  itemName?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmActionDialog({
  open,
  title = "Confirmar exclusão",
  description,
  itemName = null,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  useEffect(() => {
    if (!open || isPending) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onCancel, open]);

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const dialogContent = (
    <div
      className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-[rgba(8,14,26,0.82)] p-4 backdrop-blur-[14px] sm:items-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-panel w-full max-w-sm rounded-[1.1rem] border border-white/12 bg-[#051120]/95 p-4 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fb7185]/15 text-[#fb7185]">
            <AlertTriangle size={16} />
          </span>
          <div>
            <h3 className="text-[0.94rem] font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="mt-1 text-[0.82rem] leading-5 text-[var(--text-secondary)]">
              {description}
            </p>
            {itemName ? (
              <div className="mt-2 rounded-[0.75rem] border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                <span className="block text-[0.64rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Você vai remover:
                </span>
                <strong className="mt-0.5 block break-words text-[0.8rem] leading-5 text-[var(--text-primary)]">
                  {itemName}
                </strong>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline min-w-auto px-3 py-2 text-[0.8rem]"
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm();
            }}
            className="min-w-auto rounded-[0.8rem] border border-[#fb7185]/35 bg-[#7f1d1d]/70 px-3 py-2 text-[0.8rem] font-semibold text-[#fecaca] transition-colors hover:bg-[#7f1d1d]/90"
            disabled={isPending}
          >
            {isPending ? "Excluindo..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
