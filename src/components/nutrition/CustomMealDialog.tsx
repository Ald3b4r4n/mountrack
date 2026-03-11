"use client";

import { useEffect, useId, useRef, useState } from "react";

interface CustomMealDeleteAction {
  onDelete: () => void;
  label?: string;
  disabled?: boolean;
  hint?: string;
}

interface CustomMealDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (label: string) => void;
  initialLabel?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  deleteAction?: CustomMealDeleteAction;
}

export function CustomMealDialog({
  open,
  onClose,
  onCreate,
  initialLabel = "",
  title = "Nova refeição",
  description = "Nomeie uma refeição extra, como Pré-treino, Ceia ou Sobremesa.",
  confirmLabel = "Continuar",
  deleteAction,
}: CustomMealDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setLabel("");
    setError(null);
    onClose();
  }

  function handleCreate() {
    const normalized = label.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    if (normalized.length > 40) {
      setError("Use no máximo 40 caracteres para o nome da refeição.");
      return;
    }

    setLabel("");
    setError(null);
    onCreate(normalized);
  }

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 26, 0.82)",
        backdropFilter: "blur(14px)",
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel"
        style={{ width: "100%", maxWidth: "28rem", padding: "1.25rem" }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              {title}
            </h3>
            <p id={descriptionId} style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {description}
            </p>
          </div>
        </div>

        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              marginBottom: "0.35rem",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
            Nome da refeição
          </span>
          <input
            ref={inputRef}
            className="input-field"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Ex.: Pré-treino"
            style={{ width: "100%" }}
          />
        </label>

        {error ? (
          <p style={{ marginTop: "0.75rem", color: "#fca5a5", fontSize: "0.88rem" }}>{error}</p>
        ) : deleteAction?.hint ? (
          <p style={{ marginTop: "0.75rem", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            {deleteAction.hint}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            {deleteAction ? (
              <button onClick={deleteAction.onDelete} disabled={deleteAction.disabled} className="btn-outline">
                {deleteAction.label ?? "Excluir refeição"}
              </button>
            ) : null}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handleClose} className="btn-outline">
              Cancelar
            </button>
            <button onClick={handleCreate} className="btn-primary">
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
