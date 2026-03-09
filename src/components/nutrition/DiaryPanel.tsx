import React from "react";
import { MealType, DiaryItemSnapshot, DiaryHistoryEntry } from "@/modules/nutrition/domain/types";
import { MEAL_ORDER, MEAL_LABELS } from "@/modules/nutrition/constants";
import { SegmentButton, Field, EmptyState, PaginationControls, MiniValue } from "./CommonUI";
import { formatCalories, formatGrams, formatMilliliters, formatHistoryDate } from "@/modules/nutrition/ui-helpers";

interface DiaryPanelProps {
  activeDiaryView: "today" | "history";
  setActiveDiaryView: (view: "today" | "history") => void;
  setDiaryPage: (page: number) => void;
  
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Partial<Record<MealType, number>>;
    protein: number;
    carbs: number;
    fat: number;
    consumedCalories: number;
  };
  waterRatio: number;
  
  hydrationMode: "increment" | "absolute";
  handleSelectHydrationMode: (mode: "increment" | "absolute", currentWater: number) => void;
  isMobileLayout: boolean;
  
  handleAdjustWater: (amount: number) => void;
  waterDraft: string;
  setWaterDraft: (val: string) => void;
  handleSaveWater: () => void;
  isUpdatingWater: boolean;
  
  activeDiaryMeal: MealType;
  setActiveDiaryMeal: (meal: MealType) => void;
  groupedDiaryItems: Record<MealType, DiaryItemSnapshot[]>;
  activeDiaryItems: DiaryItemSnapshot[];
  
  diaryPage: number;
  diaryTotalPages: number;
  isLoading: boolean;
  pagedDiaryItems: DiaryItemSnapshot[];
  handleDeleteDiaryItem: (id: string) => void;
  
  isHistoryLoading: boolean;
  historyEntries: DiaryHistoryEntry[];
  historyPage: number;
  historyTotalPages: number;
  loadHistory: (page: number) => void;
}

function HistoryEntryCard({ entry }: { entry: DiaryHistoryEntry }) {
  return (
    <article className="glass-panel static-panel p-3.5 px-4 bg-[#040f20]/70">
      <div className="flex justify-between gap-3 flex-wrap mb-2.5">
        <div>
          <strong className="block">{formatHistoryDate(entry.date)}</strong>
          <span className="text-[var(--text-secondary)] text-[0.82rem]">{entry.itemCount} item(ns) registrados</span>
        </div>
        <span className="badge badge-success">{formatCalories(entry.summary.consumedCalories)}</span>
      </div>
      <div className="grid gap-[0.55rem] grid-cols-[repeat(auto-fit,minmax(110px,1fr))]">
        <MiniValue label="Agua" value={formatMilliliters(entry.summary.waterIntakeMl)} accent="#38bdf8" />
        <MiniValue label="Proteina" value={formatGrams(entry.summary.protein)} accent="#34d399" />
        <MiniValue label="Carbo" value={formatGrams(entry.summary.carbs)} accent="#22d3ee" />
        <MiniValue label="Gordura" value={formatGrams(entry.summary.fat)} accent="#fb7185" />
      </div>
    </article>
  );
}

export function DiaryPanel({
  activeDiaryView,
  setActiveDiaryView,
  setDiaryPage,
  summary,
  waterRatio,
  hydrationMode,
  handleSelectHydrationMode,
  isMobileLayout,
  handleAdjustWater,
  waterDraft,
  setWaterDraft,
  handleSaveWater,
  isUpdatingWater,
  activeDiaryMeal,
  setActiveDiaryMeal,
  groupedDiaryItems,
  activeDiaryItems,
  diaryPage,
  diaryTotalPages,
  isLoading,
  pagedDiaryItems,
  handleDeleteDiaryItem,
  isHistoryLoading,
  historyEntries,
  historyPage,
  historyTotalPages,
  loadHistory,
}: DiaryPanelProps) {
  return (
    <div className="glass-panel static-panel p-4 bg-[#06162d]/64">
      <div className="flex justify-between gap-4 flex-wrap mb-[0.95rem]">
        <div>
          <strong className="block">Histórico e diário</strong>
          <span className="text-[var(--text-secondary)] text-[0.88rem]">Revise aqui todos os consumos e registros de água do seu dia.</span>
        </div>
        <div className="flex gap-[0.55rem] flex-wrap">
          <SegmentButton active={activeDiaryView === "today"} label="Hoje" onClick={() => { setActiveDiaryView("today"); setDiaryPage(1); }} />
          <SegmentButton active={activeDiaryView === "history"} label="Histórico" onClick={() => { setActiveDiaryView("history"); setDiaryPage(1); }} />
        </div>
      </div>

      {activeDiaryView === "today" ? (
        <div className="grid gap-[0.85rem]">
          <div className="glass-panel static-panel p-[0.95rem] bg-[#040f20]/70">
            <div className="flex justify-between gap-3 flex-wrap mb-[0.7rem]">
              <div>
                <strong className="block">Água do dia</strong>
                <span className="text-[var(--text-secondary)] text-[0.84rem]">Meta {formatMilliliters(summary.targetWaterMl)} · Atual {formatMilliliters(summary.waterIntakeMl)}</span>
              </div>
              <span className="badge badge-success">{Math.round(waterRatio)}% da meta</span>
            </div>
            <div className="progress-track mb-3"><div className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]" style={{ width: `${waterRatio}%` }} /></div>
            <div className="flex gap-[0.55rem] flex-wrap mb-[0.7rem]">
              <SegmentButton active={hydrationMode === "increment"} label="Adicionar" onClick={() => handleSelectHydrationMode("increment", summary.waterIntakeMl)} />
              <SegmentButton active={hydrationMode === "absolute"} label="Corrigir total" onClick={() => handleSelectHydrationMode("absolute", summary.waterIntakeMl)} />
            </div>
            {hydrationMode === "absolute" ? (
              <p className="text-[var(--text-secondary)] text-[0.8rem] mb-[0.7rem]">
                Use este modo para corrigir o total do dia quando houver erro no lançamento.
              </p>
            ) : null}
            <div
              className={`grid gap-[0.6rem] items-end ${hydrationMode === "increment" ? (isMobileLayout ? "grid-cols-2" : "grid-cols-4") : (isMobileLayout ? "grid-cols-2" : "grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]")}`}
            >
              {hydrationMode === "increment" ? <button onClick={() => handleAdjustWater(250)} className="btn-outline w-full">+250 ml</button> : null}
              {hydrationMode === "increment" ? <button onClick={() => handleAdjustWater(500)} className="btn-outline w-full">+500 ml</button> : null}
              <div
                className={`min-w-0 ${hydrationMode === "increment" && isMobileLayout ? "col-span-full" : ""}`}
              >
                <Field label={hydrationMode === "absolute" ? "Total correto do dia (ml)" : "Adicionar (ml)"}>
                  <input
                    className="input-field"
                    value={waterDraft}
                    onChange={(event) => setWaterDraft(event.target.value)}
                    inputMode="decimal"
                    placeholder={hydrationMode === "absolute" ? "Ex.: 1800" : "Ex.: 250"}
                  />
                </Field>
              </div>
              <div className={`grid ${isMobileLayout ? "col-span-full" : ""}`}>
                <button onClick={() => void handleSaveWater()} className="btn-primary w-full min-h-[3rem]" disabled={isUpdatingWater}>
                  {isUpdatingWater ? "Salvando..." : hydrationMode === "absolute" ? "Salvar total" : "Adicionar água"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-[0.55rem] flex-wrap">
            {MEAL_ORDER.map((meal) => (
              <SegmentButton key={meal} active={activeDiaryMeal === meal} label={MEAL_LABELS[meal]} meta={groupedDiaryItems[meal].length} onClick={() => { setActiveDiaryMeal(meal); setDiaryPage(1); }} />
            ))}
          </div>

          <div className="flex justify-between gap-3 flex-wrap items-center">
            <div>
              <strong className="block">{MEAL_LABELS[activeDiaryMeal]}</strong>
              <span className="text-[var(--text-secondary)] text-[0.84rem]">{activeDiaryItems.length} item(ns) · {formatCalories(summary.meals[activeDiaryMeal] ?? 0)}</span>
            </div>
            <span className="badge badge-success">Página {diaryPage}/{diaryTotalPages}</span>
          </div>

          {isLoading ? <p className="text-[var(--text-secondary)]">Carregando diário...</p> : null}
          {!isLoading && activeDiaryItems.length === 0 ? <EmptyState title="Sem itens nesta refeicao" text="Escolha um alimento na coluna ao lado e registre no horario desejado." compact /> : null}
          {!isLoading && pagedDiaryItems.length > 0 ? (
            <div className="grid gap-[0.65rem] max-h-[min(36vh,310px)] overflow-y-auto pr-1">
              {pagedDiaryItems.map((item) => (
                <div key={item.id} className="glass-panel static-panel p-3 px-3.5 flex justify-between gap-[0.85rem] items-center">
                  <div className="min-w-0">
                    <strong className="block mb-0.5">{item.foodName}</strong>
                    <span className="text-[var(--text-secondary)] text-[0.84rem]">{item.quantity} {item.unit} · {formatCalories(item.calories)}</span>
                  </div>
                  <button onClick={() => void handleDeleteDiaryItem(item.id)} className="btn-outline min-w-auto px-3 py-2">Remover</button>
                </div>
              ))}
            </div>
          ) : null}

          {activeDiaryItems.length > 0 ? <PaginationControls page={diaryPage} totalPages={diaryTotalPages} onPageChange={setDiaryPage} /> : null}
        </div>
      ) : (
        <div className="grid gap-3">
          {isHistoryLoading ? <p className="text-[var(--text-secondary)]">Carregando histórico...</p> : null}
          {!isHistoryLoading && historyEntries.length === 0 ? <EmptyState title="Sem histórico ainda" text="Os dias registrados aparecerão aqui, com paginação pronta para navegação." compact /> : null}
          {!isHistoryLoading && historyEntries.length > 0 ? (
            <div className="grid gap-[0.7rem] max-h-[min(44vh,380px)] overflow-y-auto pr-1">
              {historyEntries.map((entry) => <HistoryEntryCard key={entry.date} entry={entry} />)}
            </div>
          ) : null}
          <PaginationControls page={historyPage} totalPages={historyTotalPages} onPageChange={(page) => void loadHistory(page)} />
        </div>
      )}
    </div>
  );
}
