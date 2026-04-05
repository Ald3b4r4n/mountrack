import { Search, ScanLine, Plus } from "lucide-react";

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
  searchActivitySummary,
  embedded = false,
  isMobileLayout,
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
    <div className="grid gap-3">
      {/* Mode tabs - compact pill row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSearchModeChange("name")}
          className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
            searchMode === "name"
              ? "bg-[#34d399]/15 text-[#34d399] ring-1 ring-[#34d399]/25"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Nome
        </button>
        <button
          type="button"
          onClick={() => onSearchModeChange("barcode")}
          className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
            searchMode === "barcode"
              ? "bg-[#34d399]/15 text-[#34d399] ring-1 ring-[#34d399]/25"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Código
        </button>
        <button
          type="button"
          onClick={() => onSearchModeChange("custom")}
          className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
            searchMode === "custom"
              ? "bg-[#34d399]/15 text-[#34d399] ring-1 ring-[#34d399]/25"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Manual
        </button>

        {searchActivitySummary ? (
          <span className="ml-auto text-[0.75rem] text-[var(--accent-primary)] animate-pulse">
            {isSearching ? "Buscando..." : "Atualizando..."}
          </span>
        ) : null}
      </div>

      {/* Search input */}
      {searchMode === "name" ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              className="input-field w-full"
              style={{ paddingLeft: "2.25rem" }}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSearch();
                }
              }}
              placeholder="Buscar alimento..."
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={onSearch}
            disabled={isSearching}
            className="btn-primary shrink-0 px-4 py-[0.85rem]"
          >
            {isSearching ? "..." : "Buscar"}
          </button>
          {isMobileLayout ? (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex h-[calc(0.85rem*2+1.7rem)] w-[calc(0.85rem*2+1.7rem)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-glass)] text-[var(--accent-primary)] transition-colors hover:bg-[#34d399]/8"
              aria-label="Escanear código de barras"
            >
              <ScanLine size={18} />
            </button>
          ) : null}
        </div>
      ) : null}

      {searchMode === "barcode" ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <ScanLine
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              className="input-field w-full"
              style={{ paddingLeft: "2.25rem" }}
              value={barcodeQuery}
              onChange={(event) => onBarcodeQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onBarcodeLookup(barcodeQuery);
                }
              }}
              placeholder="Código de barras..."
            />
          </div>
          <button
            type="button"
            onClick={() => onBarcodeLookup(barcodeQuery)}
            className="btn-primary shrink-0 px-4 py-[0.85rem]"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex h-[calc(0.85rem*2+1.7rem)] w-[calc(0.85rem*2+1.7rem)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-glass)] text-[var(--accent-primary)] transition-colors hover:bg-[#34d399]/8"
            aria-label="Abrir câmera"
          >
            <ScanLine size={18} />
          </button>
        </div>
      ) : null}

      {searchMode === "custom" ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-glass)] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.88rem] text-[var(--text-secondary)]">
              Crie um alimento personalizado para usar no diário.
            </p>
          </div>
          <button
            type="button"
            onClick={onCustomFoodOpen}
            className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-4"
          >
            <Plus size={16} />
            Criar
          </button>
        </div>
      ) : null}
    </div>
  );
}
