import { ScanLine } from "lucide-react";
import { Field, PanelHeader, SegmentButton } from "./CommonUI";

interface FoodSearchSetupPanelProps {
  storageSummary: string;
  searchActivitySummary: string | null;
  embedded?: boolean;
  isMobileLayout: boolean;
  activeMealLabel: string;
  searchCatalogBadge: string;
  isEnrichingExternal: boolean;
  searchMode: "name" | "barcode" | "custom";
  onSearchModeChange: (mode: "name" | "barcode" | "custom") => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  barcodeQuery: string;
  onBarcodeQueryChange: (val: string) => void;
  onBarcodeLookup: (val: string) => void;
  onOpenScanner: () => void;
  onCustomFoodOpen: () => void;
}

export function FoodSearchSetupPanel({
  storageSummary,
  searchActivitySummary,
  embedded = false,
  isMobileLayout,
  activeMealLabel,
  searchCatalogBadge,
  isEnrichingExternal,
  searchMode,
  onSearchModeChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  barcodeQuery,
  onBarcodeQueryChange,
  onBarcodeLookup,
  onOpenScanner,
  onCustomFoodOpen,
}: FoodSearchSetupPanelProps) {
  return (
    <div className="glass-panel static-panel relative overflow-hidden p-4">
      {!embedded ? (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <PanelHeader
              title="Buscar e registrar"
              subtitle={
                isMobileLayout
                  ? `Encontre um alimento e registre direto em ${activeMealLabel.toLowerCase()} sem perder o contexto do dia.`
                  : "Encontre um alimento, revise o resultado e registre o consumo sem perder o contexto do dia."
              }
            />
            <span className="badge badge-success self-start">{searchCatalogBadge}</span>
          </div>

          <div className="mb-4 grid gap-1.5">
            <p className="text-sm text-[var(--text-secondary)]">{storageSummary}</p>
            {searchActivitySummary ? (
              <p className="text-[0.82rem] text-[var(--accent-primary)]">{searchActivitySummary}</p>
            ) : null}
          </div>
          {isMobileLayout ? (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-[1rem] border border-[#34d399]/14 bg-[#06162d]/62 p-3">
              <div className="min-w-0">
                <span className="block text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Refeicao de destino
                </span>
                <strong className="mt-1 block text-[0.98rem] text-[var(--text-primary)]">{activeMealLabel}</strong>
                <p className="mt-1 text-[0.82rem] text-[var(--text-secondary)]">
                  O alimento selecionado volta para esse bloco quando o registro terminar.
                </p>
              </div>
              <span className="badge badge-success shrink-0">Em foco</span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <p className="max-w-[42rem] text-sm text-[var(--text-secondary)]">{storageSummary}</p>
            {searchActivitySummary ? (
              <p className="text-[0.82rem] text-[var(--accent-primary)]">{searchActivitySummary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isEnrichingExternal ? <span className="badge badge-success self-start">Atualizacao em fila</span> : null}
            <span className="badge badge-success self-start">{searchCatalogBadge}</span>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <SegmentButton active={searchMode === "name"} label="Nome" onClick={() => onSearchModeChange("name")} />
        <SegmentButton active={searchMode === "barcode"} label="Codigo" onClick={() => onSearchModeChange("barcode")} />
        <SegmentButton active={searchMode === "custom"} label="Manual" onClick={() => onSearchModeChange("custom")} />
      </div>

      {searchMode === "name" ? (
        <Field label="Nome do alimento">
          <div className={isMobileLayout ? "grid gap-2.5" : "flex flex-wrap gap-2.5"}>
            <input
              className="input-field min-w-[14rem] flex-1"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSearch();
                }
              }}
              placeholder="Ex.: banana prata, arroz cozido, iogurte"
            />
            <div className={`grid gap-2.5 ${isMobileLayout ? "grid-cols-2" : "grid-cols-[auto]"}`}>
              <button type="button" onClick={onSearch} className="btn-primary" disabled={isSearching}>
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
              {isMobileLayout ? (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="btn-outline inline-flex items-center justify-center gap-2 border-dashed text-[var(--accent-primary)]"
                >
                  <ScanLine size={16} />
                  Escanear
                </button>
              ) : null}
            </div>
          </div>
        </Field>
      ) : null}

      {searchMode === "barcode" ? (
        <Field label="Codigo de barras">
          <div className="grid gap-2.5">
            <p className="text-[0.84rem] text-[var(--text-secondary)]">
              Digite o numero da embalagem ou use a camera para ler o codigo automaticamente.
            </p>
            <div className={isMobileLayout ? "grid gap-2.5" : "flex flex-wrap gap-2.5"}>
              <input
                className="input-field min-w-[12rem] flex-1"
                value={barcodeQuery}
                onChange={(event) => onBarcodeQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onBarcodeLookup(barcodeQuery);
                  }
                }}
                placeholder="Ex.: 7891234567890"
              />
              <div className={`grid gap-2.5 ${isMobileLayout ? "grid-cols-2" : "grid-cols-[auto_auto]"}`}>
                <button type="button" onClick={() => onBarcodeLookup(barcodeQuery)} className="btn-primary">
                  Buscar codigo
                </button>
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="btn-outline inline-flex items-center justify-center gap-2 border-dashed text-[var(--accent-primary)]"
                >
                  <ScanLine size={16} />
                  Escanear
                </button>
              </div>
            </div>
          </div>
        </Field>
      ) : null}

      {searchMode === "custom" ? (
        <div className="glass-panel static-panel grid gap-3 bg-[#041225]/72 p-4">
          <div>
            <strong className="block">Criar alimento manualmente</strong>
            <p className="mt-1 text-[0.9rem] text-[var(--text-secondary)]">
              Salve um alimento seu para reencontrar depois na busca e usar no diario sem depender do catalogo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={onCustomFoodOpen} className="btn-primary">
              Criar alimento
            </button>
            <button
              type="button"
              onClick={() => onSearchModeChange("name")}
              className="btn-outline min-w-auto px-3 py-2"
            >
              Voltar para busca
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
