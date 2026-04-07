import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type {
  DiaryHistoryEntry,
  MealType,
} from "@/modules/nutrition/domain/types";
import { authorizedNutritionFetch } from "@/modules/nutrition/client";
import { EmptyState, PaginationControls } from "./CommonUI";
import {
  HistoryEntryCard,
  MobilePaginationControls,
  MobileStatusCard,
} from "./DiaryPanelShared";
import { DatePickerModal } from "./DatePickerModal";
import { RetroactiveDiaryView } from "./RetroactiveDiaryView";
import {
  formatCalories,
  formatHistoryDate,
} from "@/modules/nutrition/ui-helpers";

interface DiaryHistoryViewProps {
  authUser?: Parameters<typeof authorizedNutritionFetch>[0] | null;
  isMobileLayout: boolean;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  loadHistory: (page: number) => void;
  todayEntry?: DiaryHistoryEntry;
  onAddToToday?: () => void;
  onOpenSearchForDateMeal?: (targetDate: string, meal: MealType) => void;
}

export function DiaryHistoryView({
  authUser,
  isMobileLayout,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  loadHistory,
  todayEntry,
  onAddToToday,
  onOpenSearchForDateMeal,
}: DiaryHistoryViewProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [retroDate, setRetroDate] = useState<string | null>(null);

  const handleDateSelected = (date: string) => {
    setDatePickerOpen(false);
    setRetroDate(date);
  };

  return (
    <div className="grid gap-3">
      {todayEntry ? (
        <article
          className="glass-panel static-panel cursor-pointer rounded-[1rem] border border-[#34d399]/25 bg-[#040f20]/70 p-3.5 transition-colors hover:bg-[#040f20]/90"
          onClick={() => setRetroDate(todayEntry.date)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              setRetroDate(todayEntry.date);
          }}
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#34d399]">
                Hoje
              </span>
              <strong className="mt-0.5 block">
                {formatHistoryDate(todayEntry.date)}
              </strong>
              <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                {todayEntry.itemCount} item(ns) registrados
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onAddToToday ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToToday();
                  }}
                  className="btn-outline min-w-auto rounded-[0.85rem] px-3 py-1.5 text-[0.8rem]"
                  aria-label="Adicionar item ao diário de hoje"
                >
                  + Adicionar
                </button>
              ) : null}
              <span className="badge badge-success">
                {formatCalories(todayEntry.summary.consumedCalories)}
              </span>
            </div>
          </div>
        </article>
      ) : null}

      {isMobileLayout ? (
        <div className="rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Revisão
              </span>
              <strong className="mt-1 block text-[0.96rem] text-[var(--text-primary)]">
                Dias anteriores
              </strong>
              <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                Toque em uma data para ver ou editar.
              </span>
            </div>
            <button
              type="button"
              aria-label="Abrir calendário para edição retroativa"
              onClick={() => setDatePickerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
            >
              <CalendarDays size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Dias anteriores
          </span>
          <button
            type="button"
            aria-label="Editar data retroativa"
            onClick={() => setDatePickerOpen(true)}
            className="flex items-center gap-1.5 text-[0.78rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <CalendarDays size={14} />
            Editar data
          </button>
        </div>
      )}

      {isHistoryLoading ? (
        isMobileLayout ? (
          <MobileStatusCard
            eyebrow="Sincronizando"
            title="Atualizando histórico"
            text="Os dias anteriores aparecem aqui em instantes."
          />
        ) : (
          <p className="text-[var(--text-secondary)]">
            Carregando histórico...
          </p>
        )
      ) : null}
      {!isHistoryLoading && historyEntries.length === 0 ? (
        <EmptyState
          title={
            isMobileLayout ? "Nenhum dia anterior ainda" : "Sem histórico ainda"
          }
          text={
            isMobileLayout
              ? "Os dias concluídos aparecem aqui quando houver registros anteriores."
              : "Os dias registrados aparecem aqui para consulta."
          }
          compact
        />
      ) : null}
      {!isHistoryLoading && historyEntries.length > 0 ? (
        <div
          className={`grid gap-[0.7rem] overflow-y-auto pr-1 ${isMobileLayout ? "max-h-[min(48vh,420px)]" : "max-h-[min(44vh,380px)]"}`}
        >
          {historyEntries.map((entry) => (
            <HistoryEntryCard
              key={entry.date}
              entry={entry}
              isMobileLayout={isMobileLayout}
              onOpenRetroactive={() => setRetroDate(entry.date)}
            />
          ))}
        </div>
      ) : null}
      {!isHistoryLoading &&
      historyEntries.length > 0 &&
      historyTotalPages > 1 ? (
        isMobileLayout ? (
          <MobilePaginationControls
            page={historyPage}
            totalPages={historyTotalPages}
            onPageChange={(page) => void loadHistory(page)}
            label="Dias"
          />
        ) : (
          <PaginationControls
            page={historyPage}
            totalPages={historyTotalPages}
            onPageChange={(page) => void loadHistory(page)}
          />
        )
      ) : null}

      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onDateSelected={handleDateSelected}
      />

      {retroDate ? (
        <RetroactiveDiaryView
          authUser={authUser ?? null}
          targetDate={retroDate}
          onClose={() => setRetroDate(null)}
          onMutated={() => void loadHistory(historyPage)}
          onOpenSearchForMeal={(targetDate, meal) => {
            setRetroDate(null);
            onOpenSearchForDateMeal?.(targetDate, meal);
          }}
        />
      ) : null}
    </div>
  );
}
