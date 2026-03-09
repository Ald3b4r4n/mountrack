"use client";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  itemLabel,
  onPageChange,
}: PaginationControlsProps) {
  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);

  return (
    <div
      className="glass-panel static-panel anim-enter"
      style={{
        marginTop: "1.5rem",
        padding: "1rem 1.25rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.2rem",
          }}
        >
          Navegação
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Mostrando {startItem}-{endItem} de {totalItems} {itemLabel}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-outline"
          style={{
            opacity: page === 1 ? 0.45 : 1,
            cursor: page === 1 ? "not-allowed" : "pointer",
            padding: "0.55rem 0.9rem",
          }}
        >
          Anterior
        </button>

        <div
          style={{
            minWidth: "84px",
            textAlign: "center",
            color: "var(--text-primary)",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {page} / {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-primary"
          style={{
            opacity: page === totalPages ? 0.55 : 1,
            cursor: page === totalPages ? "not-allowed" : "pointer",
            padding: "0.55rem 0.95rem",
          }}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
