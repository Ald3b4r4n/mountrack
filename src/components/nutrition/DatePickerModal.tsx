import { createPortal } from "react-dom";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelected: (date: string) => void;
  maxDate?: string;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function DatePickerModal({
  isOpen,
  onClose,
  onDateSelected,
  maxDate,
}: DatePickerModalProps) {
  if (!isOpen) return null;

  if (typeof document === "undefined") {
    return null;
  }

  const max = maxDate ?? getYesterday();

  const dialogContent = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar data"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      <div
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="glass-panel relative w-full max-w-xs rounded-[1.5rem] border border-white/10 bg-[#050f1d] p-6 shadow-2xl">
        <h3 className="mb-4 text-[1rem] font-bold">Selecionar data</h3>
        <input
          type="date"
          max={max}
          className="input-field w-full rounded-xl border-white/10 bg-white/5 px-3 py-2.5"
          onChange={(e) => {
            if (e.target.value) {
              onDateSelected(e.target.value);
            }
          }}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 text-[0.85rem]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
