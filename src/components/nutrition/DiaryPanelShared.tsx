import type { DiaryHistoryEntry } from "@/modules/nutrition/domain/types";
import { MiniValue } from "./CommonUI";
import {
  formatCalories,
  formatGrams,
  formatHistoryDate,
  formatMilliliters,
} from "@/modules/nutrition/ui-helpers";

export function HistoryEntryCard({
  entry,
  isMobileLayout,
  onOpenRetroactive,
}: {
  entry: DiaryHistoryEntry;
  isMobileLayout: boolean;
  onOpenRetroactive?: () => void;
}) {
  return (
    <article
      className={`glass-panel static-panel bg-[#040f20]/70 ${isMobileLayout ? "rounded-[1rem] p-3.5" : "p-3.5 px-4"} ${onOpenRetroactive ? "cursor-pointer transition-colors hover:bg-[#040f20]/90" : ""}`}
      onClick={onOpenRetroactive}
      role={onOpenRetroactive ? "button" : undefined}
      tabIndex={onOpenRetroactive ? 0 : undefined}
      onKeyDown={onOpenRetroactive ? (e) => { if (e.key === "Enter") onOpenRetroactive(); } : undefined}
    >
      <div className="mb-2.5 flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          {isMobileLayout ? (
            <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Dia fechado</span>
          ) : null}
          <strong className="mt-1 block">{formatHistoryDate(entry.date)}</strong>
          {isMobileLayout ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[0.74rem] text-[var(--text-secondary)]">
                {entry.itemCount} item(ns)
              </span>
              <span className="rounded-full border border-[#38bdf8]/18 bg-[#38bdf8]/10 px-2.5 py-1 text-[0.74rem] text-sky-200">
                {formatMilliliters(entry.summary.waterIntakeMl)}
              </span>
            </div>
          ) : (
            <span className="text-[0.82rem] text-[var(--text-secondary)]">{entry.itemCount} item(ns) registrados</span>
          )}
        </div>
        <span className="badge badge-success">{formatCalories(entry.summary.consumedCalories)}</span>
      </div>
      {isMobileLayout ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[0.9rem] border border-white/7 bg-[#071223]/72 px-3 py-2.5">
            <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Proteína</span>
            <strong className="mt-1 block text-[0.94rem] text-[#86efac]">{formatGrams(entry.summary.protein)}</strong>
          </div>
          <div className="rounded-[0.9rem] border border-white/7 bg-[#071223]/72 px-3 py-2.5">
            <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Carbo</span>
            <strong className="mt-1 block text-[0.94rem] text-cyan-200">{formatGrams(entry.summary.carbs)}</strong>
          </div>
          <div className="rounded-[0.9rem] border border-white/7 bg-[#071223]/72 px-3 py-2.5">
            <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Gordura</span>
            <strong className="mt-1 block text-[0.94rem] text-rose-200">{formatGrams(entry.summary.fat)}</strong>
          </div>
          <div className="rounded-[0.9rem] border border-white/7 bg-[#071223]/72 px-3 py-2.5">
            <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Água</span>
            <strong className="mt-1 block text-[0.94rem] text-sky-200">
              {formatMilliliters(entry.summary.waterIntakeMl)}
            </strong>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-[0.55rem]">
          <MiniValue label="Água" value={formatMilliliters(entry.summary.waterIntakeMl)} accent="#38bdf8" />
          <MiniValue label="Proteína" value={formatGrams(entry.summary.protein)} accent="#34d399" />
          <MiniValue label="Carbo" value={formatGrams(entry.summary.carbs)} accent="#22d3ee" />
          <MiniValue label="Gordura" value={formatGrams(entry.summary.fat)} accent="#fb7185" />
        </div>
      )}
    </article>
  );
}

export function MobileStatusCard({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
      <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{eyebrow}</span>
      <strong className="mt-1 block text-[0.98rem] text-[var(--text-primary)]">{title}</strong>
      <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">{text}</span>
    </div>
  );
}

export function MobilePaginationControls({
  page,
  totalPages,
  onPageChange,
  label = "Itens",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-[#071223]/72 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="btn-outline min-w-auto rounded-[0.9rem] px-3 py-2"
          disabled={page <= 1}
          aria-label="Página anterior do diário"
        >
          Voltar
        </button>
        <div className="min-w-0 text-center">
          <span className="block text-[0.66rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
          <strong className="mt-1 block text-[0.94rem] text-[var(--text-primary)]">
            {page} / {totalPages}
          </strong>
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="btn-outline min-w-auto rounded-[0.9rem] px-3 py-2"
          disabled={page >= totalPages}
          aria-label="Próxima página do diário"
        >
          Avançar
        </button>
      </div>
    </div>
  );
}
