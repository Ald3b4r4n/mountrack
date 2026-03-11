import type { DiaryHistoryEntry } from "@/modules/nutrition/domain/types";
import { EmptyState, PaginationControls } from "./CommonUI";
import { HistoryEntryCard, MobilePaginationControls, MobileStatusCard } from "./DiaryPanelShared";

interface DiaryHistoryViewProps {
  isMobileLayout: boolean;
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  loadHistory: (page: number) => void;
}

export function DiaryHistoryView({
  isMobileLayout,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  loadHistory,
}: DiaryHistoryViewProps) {
  return (
    <div className="grid gap-3">
      {isMobileLayout ? (
        <div className="rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
          <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">Revisão</span>
          <strong className="mt-1 block text-[0.96rem] text-[var(--text-primary)]">Dias fechados</strong>
          <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">Revise só o que já ficou para trás.</span>
        </div>
      ) : null}
      {isHistoryLoading ? (
        isMobileLayout ? (
          <MobileStatusCard
            eyebrow="Sincronizando"
            title="Atualizando histórico"
            text="Os dias fechados aparecem aqui em instantes."
          />
        ) : (
          <p className="text-[var(--text-secondary)]">Carregando histórico...</p>
        )
      ) : null}
      {!isHistoryLoading && historyEntries.length === 0 ? (
        <EmptyState
          title={isMobileLayout ? "Nenhum dia fechado ainda" : "Sem histórico ainda"}
          text={
            isMobileLayout
              ? "Quando houver revisão para fazer, os dias entram aqui."
              : "Os dias registrados aparecerão aqui, com paginação pronta para navegação."
          }
          compact
        />
      ) : null}
      {!isHistoryLoading && historyEntries.length > 0 ? (
        <div
          className={`grid gap-[0.7rem] overflow-y-auto pr-1 ${isMobileLayout ? "max-h-[min(48vh,420px)]" : "max-h-[min(44vh,380px)]"}`}
        >
          {historyEntries.map((entry) => (
            <HistoryEntryCard key={entry.date} entry={entry} isMobileLayout={isMobileLayout} />
          ))}
        </div>
      ) : null}
      {!isHistoryLoading && historyEntries.length > 0 && historyTotalPages > 1 ? (
        isMobileLayout ? (
          <MobilePaginationControls
            page={historyPage}
            totalPages={historyTotalPages}
            onPageChange={(page) => void loadHistory(page)}
            label="Dias"
          />
        ) : (
          <PaginationControls page={historyPage} totalPages={historyTotalPages} onPageChange={(page) => void loadHistory(page)} />
        )
      ) : null}
    </div>
  );
}
