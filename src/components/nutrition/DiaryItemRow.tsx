import { Pencil, Trash2 } from "lucide-react";
import type { DiaryItemSnapshot } from "@/modules/nutrition/domain/types";

interface DiaryItemRowProps {
  item: DiaryItemSnapshot;
  onEdit: (item: DiaryItemSnapshot) => void;
  onDelete: (itemId: string) => void;
}

export function DiaryItemRow({ item, onEdit, onDelete }: DiaryItemRowProps) {
  return (
    <div className="rounded-lg px-2 py-2 hover:bg-[#ffffff]/[0.02]">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="block break-words text-[0.88rem] font-medium leading-snug text-[var(--text-primary)]">
            {item.foodName}
          </span>
          <span className="mt-0.5 block text-[0.75rem] text-[var(--text-secondary)]">
            {item.quantity} {item.unit}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="shrink-0 text-[0.8rem] font-medium text-[var(--text-secondary)]">
            {Math.round(item.calories)} kcal
          </span>

          <button
            type="button"
            aria-label={`Editar ${item.foodName}`}
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[#ffffff]/[0.06] hover:text-[var(--text-primary)]"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            aria-label={`Remover ${item.foodName}`}
            onClick={() => onDelete(item.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[#fb7185]/10 hover:text-[#fb7185]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
