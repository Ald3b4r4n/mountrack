import type {
  DiaryHistoryEntry,
  DiaryItemSnapshot,
  MealDefinition,
  MealType,
} from "@/modules/nutrition/domain/types";
import {
  CollapsibleSection,
  EmptyState,
  Field,
  MiniValue,
  PaginationControls,
  SegmentButton,
} from "./CommonUI";
import {
  formatCalories,
  formatGrams,
  formatHistoryDate,
  formatMilliliters,
} from "@/modules/nutrition/ui-helpers";

interface DiaryPanelProps {
  activeDiaryView: "today" | "history";
  setActiveDiaryView: (view: "today" | "history") => void;
  setDiaryPage: (page: number) => void;
  summary: {
    targetWaterMl: number;
    waterIntakeMl: number;
    meals: Record<string, number>;
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
  mealDefinitions: MealDefinition[];
  activeDiaryMeal: MealType;
  setActiveDiaryMeal: (meal: MealType) => void;
  onOpenSearchForMeal?: (meal: MealType) => void;
  onOpenMealChooser?: () => void;
  groupedDiaryItems: Record<string, DiaryItemSnapshot[]>;
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
  onManageMeal?: (meal: MealDefinition) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sectionRef?: React.Ref<HTMLElement>;
}

function HistoryEntryCard({ entry }: { entry: DiaryHistoryEntry }) {
  return (
    <article className="glass-panel static-panel bg-[#040f20]/70 p-3.5 px-4">
      <div className="mb-2.5 flex flex-wrap justify-between gap-3">
        <div>
          <strong className="block">{formatHistoryDate(entry.date)}</strong>
          <span className="text-[0.82rem] text-[var(--text-secondary)]">
            {entry.itemCount} item(ns) registrados
          </span>
        </div>
        <span className="badge badge-success">{formatCalories(entry.summary.consumedCalories)}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-[0.55rem]">
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
  mealDefinitions,
  activeDiaryMeal,
  setActiveDiaryMeal,
  onOpenSearchForMeal,
  onOpenMealChooser,
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
  onManageMeal,
  open,
  onOpenChange,
  sectionRef,
}: DiaryPanelProps) {
  const activeMealDefinition =
    mealDefinitions.find((meal) => meal.key === activeDiaryMeal) ?? { key: activeDiaryMeal, label: String(activeDiaryMeal) };
  const activeMealLabel = activeMealDefinition.label;
  const canManageActiveMeal = activeMealDefinition.isDefault === false && Boolean(onManageMeal);
  const activeMealCalories = summary.meals[activeDiaryMeal] ?? 0;
  const panelTitle = isMobileLayout
    ? activeDiaryView === "today"
      ? "Registro do dia"
      : "Historico do diario"
    : "Historico e diario";
  const panelSubtitle = isMobileLayout
    ? activeDiaryView === "today"
      ? "Acompanhe a refeicao ativa, ajuste a agua e deixe o historico em segundo plano."
      : "Revise os dias anteriores sem perder o foco do dia atual."
    : "Revise aqui todos os consumos e registros de agua do seu dia.";
  const panelBadgeLabel = activeDiaryView === "today" ? (isMobileLayout ? activeMealLabel : "Hoje") : "Historico";

  return (
    <CollapsibleSection
      title={panelTitle}
      subtitle={panelSubtitle}
      badge={<span className="badge badge-success">{panelBadgeLabel}</span>}
      open={open}
      onOpenChange={onOpenChange}
      sectionRef={sectionRef}
    >
      <div className="mb-[0.95rem] flex flex-wrap justify-end gap-4">
        {isMobileLayout ? (
          activeDiaryView === "today" ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
              <div className="min-w-0">
                <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Hoje
                </span>
                <strong className="block text-[0.96rem] text-[var(--text-primary)]">
                  Diario vivo do dia
                </strong>
                <span className="mt-1 block text-[0.8rem] text-[var(--text-secondary)]">
                  O historico fica aqui so quando voce quiser revisar dias anteriores.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveDiaryView("history");
                  setDiaryPage(1);
                }}
                className="btn-outline min-w-auto shrink-0 px-3 py-2 text-[0.8rem]"
              >
                Historico
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveDiaryView("today");
                setDiaryPage(1);
              }}
              className="btn-outline min-w-auto px-3 py-2 text-[0.8rem]"
            >
              Voltar para hoje
            </button>
          )
        ) : (
          <div className="flex flex-wrap gap-[0.55rem]">
            <SegmentButton
              active={activeDiaryView === "today"}
              label="Hoje"
              onClick={() => {
                setActiveDiaryView("today");
                setDiaryPage(1);
              }}
            />
            <SegmentButton
              active={activeDiaryView === "history"}
              label="Historico"
              onClick={() => {
                setActiveDiaryView("history");
                setDiaryPage(1);
              }}
            />
          </div>
        )}
      </div>

      {activeDiaryView === "today" ? (
        <div className="grid gap-[0.85rem]">
          <div className="glass-panel static-panel bg-[#040f20]/70 p-[0.95rem]">
            <div className="mb-[0.7rem] flex flex-wrap justify-between gap-3">
              <div>
                <strong className="block">Agua do dia</strong>
                <span className="text-[0.84rem] text-[var(--text-secondary)]">
                  Meta {formatMilliliters(summary.targetWaterMl)} - Atual {formatMilliliters(summary.waterIntakeMl)}
                </span>
              </div>
              <span className="badge badge-success">{Math.round(waterRatio)}% da meta</span>
            </div>
            <div className="progress-track mb-3">
              <div
                className="progress-fill bg-gradient-to-br from-[#38bdf8] to-[#22d3ee]"
                style={{ width: `${waterRatio}%` }}
              />
            </div>
            {isMobileLayout ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <SegmentButton
                      active={hydrationMode === "increment"}
                      label="Adicionar"
                      onClick={() => handleSelectHydrationMode("increment", summary.waterIntakeMl)}
                    />
                    <SegmentButton
                      active={hydrationMode === "absolute"}
                      label="Corrigir total"
                      onClick={() => handleSelectHydrationMode("absolute", summary.waterIntakeMl)}
                    />
                  </div>
                  <span className="text-[0.82rem] text-[var(--text-secondary)]">
                    {hydrationMode === "absolute"
                      ? "Corrija o total do dia quando houver algum ajuste."
                      : "Use atalhos rapidos ou informe um volume manual."}
                  </span>
                </div>
                {hydrationMode === "increment" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAdjustWater(250)} className="btn-outline min-h-[2.8rem] w-full">
                      +250 ml
                    </button>
                    <button onClick={() => handleAdjustWater(500)} className="btn-outline min-h-[2.8rem] w-full">
                      +500 ml
                    </button>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Field label={hydrationMode === "absolute" ? "Total correto do dia (ml)" : "Adicionar (ml)"}>
                    <input
                      className="input-field"
                      value={waterDraft}
                      onChange={(event) => setWaterDraft(event.target.value)}
                      inputMode="decimal"
                      placeholder={hydrationMode === "absolute" ? "Ex.: 1800" : "Ex.: 250"}
                    />
                  </Field>
                  <button
                    onClick={() => void handleSaveWater()}
                    className="btn-primary min-h-[3rem] w-full"
                    disabled={isUpdatingWater}
                  >
                    {isUpdatingWater
                      ? "Salvando..."
                      : hydrationMode === "absolute"
                        ? "Salvar total"
                        : "Adicionar agua"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-[0.7rem] flex flex-wrap gap-[0.55rem]">
                  <SegmentButton
                    active={hydrationMode === "increment"}
                    label="Adicionar"
                    onClick={() => handleSelectHydrationMode("increment", summary.waterIntakeMl)}
                  />
                  <SegmentButton
                    active={hydrationMode === "absolute"}
                    label="Corrigir total"
                    onClick={() => handleSelectHydrationMode("absolute", summary.waterIntakeMl)}
                  />
                </div>
                {hydrationMode === "absolute" ? (
                  <p className="mb-[0.7rem] text-[0.8rem] text-[var(--text-secondary)]">
                    Use este modo para corrigir o total do dia quando houver erro no lancamento.
                  </p>
                ) : null}
                <div
                  className={`grid items-end gap-[0.6rem] ${
                    hydrationMode === "increment"
                      ? "grid-cols-4"
                      : "grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]"
                  }`}
                >
                  {hydrationMode === "increment" ? (
                    <button onClick={() => handleAdjustWater(250)} className="btn-outline w-full">
                      +250 ml
                    </button>
                  ) : null}
                  {hydrationMode === "increment" ? (
                    <button onClick={() => handleAdjustWater(500)} className="btn-outline w-full">
                      +500 ml
                    </button>
                  ) : null}
                  <div className="min-w-0">
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
                  <div className="grid">
                    <button
                      onClick={() => void handleSaveWater()}
                      className="btn-primary min-h-[3rem] w-full"
                      disabled={isUpdatingWater}
                    >
                      {isUpdatingWater
                        ? "Salvando..."
                        : hydrationMode === "absolute"
                          ? "Salvar total"
                          : "Adicionar agua"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isMobileLayout ? (
            <div className="glass-panel static-panel bg-[#040f20]/74 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Refeicao selecionada
                  </span>
                  <strong className="mt-1 block text-[1rem] text-[var(--text-primary)]">{activeMealLabel}</strong>
                  <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                    {activeDiaryItems.length} item(ns) neste bloco hoje.
                  </span>
                </div>
                <span className="badge badge-success whitespace-nowrap">{formatCalories(activeMealCalories)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {onOpenSearchForMeal ? (
                  <button
                    onClick={() => onOpenSearchForMeal(activeDiaryMeal)}
                    className="btn-primary min-h-[2.85rem] w-full"
                  >
                    Adicionar alimento
                  </button>
                ) : null}
                {onOpenMealChooser || canManageActiveMeal ? (
                  <div className={`grid gap-2 ${canManageActiveMeal ? "grid-cols-2" : "grid-cols-1"}`}>
                    {onOpenMealChooser ? (
                      <button
                        onClick={onOpenMealChooser}
                        className="btn-outline min-h-[2.85rem] w-full"
                      >
                        Trocar refeicao
                      </button>
                    ) : null}
                    {canManageActiveMeal ? (
                      <button
                        onClick={() => onManageMeal?.(activeMealDefinition)}
                        className="btn-outline min-h-[2.85rem] w-full"
                      >
                        Gerenciar refeicao
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-[0.55rem]">
                {mealDefinitions.map((meal) => (
                  <SegmentButton
                    key={meal.key}
                    active={activeDiaryMeal === meal.key}
                    label={meal.label}
                    meta={groupedDiaryItems[meal.key]?.length ?? 0}
                    onClick={() => {
                      setActiveDiaryMeal(meal.key);
                      setDiaryPage(1);
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block">{activeMealLabel}</strong>
                  <span className="text-[0.84rem] text-[var(--text-secondary)]">
                    {activeDiaryItems.length} item(ns) - {formatCalories(activeMealCalories)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManageActiveMeal ? (
                    <button onClick={() => onManageMeal?.(activeMealDefinition)} className="btn-outline px-3 py-2 text-[0.8rem]">
                      Gerenciar refeicao
                    </button>
                  ) : null}
                  <span className="badge badge-success">
                    Pagina {diaryPage}/{diaryTotalPages}
                  </span>
                </div>
              </div>
            </>
          )}

          {isLoading ? <p className="text-[var(--text-secondary)]">Carregando diario...</p> : null}
          {!isLoading && activeDiaryItems.length === 0 ? (
            <EmptyState
              title="Sem itens nesta refeicao"
              text={
                isMobileLayout
                  ? "Toque em Adicionar alimento no card da refeicao ou abra Buscar para registrar algo agora."
                  : "Escolha um alimento na coluna ao lado e registre no horario desejado."
              }
              compact
            />
          ) : null}
          {!isLoading && pagedDiaryItems.length > 0 ? (
            <div className="grid max-h-[min(36vh,310px)] gap-[0.65rem] overflow-y-auto pr-1">
              {pagedDiaryItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel static-panel flex items-center justify-between gap-[0.85rem] p-3 px-3.5"
                >
                  <div className="min-w-0">
                    <strong className="mb-0.5 block">{item.foodName}</strong>
                    <span className="text-[0.84rem] text-[var(--text-secondary)]">
                      {item.quantity} {item.unit} - {formatCalories(item.calories)}
                    </span>
                  </div>
                  <button
                    onClick={() => void handleDeleteDiaryItem(item.id)}
                    className="btn-outline min-w-auto px-3 py-2"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {activeDiaryItems.length > 0 ? (
            <PaginationControls page={diaryPage} totalPages={diaryTotalPages} onPageChange={setDiaryPage} />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          {isMobileLayout ? (
            <div className="rounded-[1rem] border border-white/7 bg-[#071223]/72 p-3">
              <strong className="block text-[0.96rem] text-[var(--text-primary)]">Dias anteriores</strong>
              <span className="mt-1 block text-[0.82rem] text-[var(--text-secondary)]">
                Use este painel so quando precisar revisar consumos ja encerrados.
              </span>
            </div>
          ) : null}
          {isHistoryLoading ? <p className="text-[var(--text-secondary)]">Carregando historico...</p> : null}
          {!isHistoryLoading && historyEntries.length === 0 ? (
            <EmptyState
              title="Sem historico ainda"
              text="Os dias registrados aparecerao aqui, com paginacao pronta para navegacao."
              compact
            />
          ) : null}
          {!isHistoryLoading && historyEntries.length > 0 ? (
            <div className="grid max-h-[min(44vh,380px)] gap-[0.7rem] overflow-y-auto pr-1">
              {historyEntries.map((entry) => (
                <HistoryEntryCard key={entry.date} entry={entry} />
              ))}
            </div>
          ) : null}
          <PaginationControls
            page={historyPage}
            totalPages={historyTotalPages}
            onPageChange={(page) => void loadHistory(page)}
          />
        </div>
      )}
    </CollapsibleSection>
  );
}
