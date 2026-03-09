import React, { ReactNode } from "react";

export function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[1.05rem] font-semibold mb-1">{title}</h2>
      <p className="text-[var(--text-secondary)] text-[0.9rem] max-w-[38ch]">{subtitle}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-[0.45rem]">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function MiniValue({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass-panel static-panel p-3 px-3.5 bg-[#020b1c]/70 min-h-full">
      <span className="block text-[var(--text-muted)] text-[0.72rem] uppercase tracking-[0.06em]">{label}</span>
      <strong className="block mt-1 text-[0.98rem]" style={{ color: accent }}>{value}</strong>
    </div>
  );
}

export function MacroValue({ label, value, accent, compact = false }: { label: string; value: string; accent: string; compact?: boolean }) {
  return (
    <div className={`glass-panel static-panel bg-[#020b1c]/70 text-center min-w-0 ${compact ? 'p-2 px-1.5' : 'p-3 px-3.5'}`}>
      <span className={`block text-[var(--text-muted)] uppercase whitespace-normal leading-[1.2] ${compact ? 'text-[0.64rem] tracking-[0.02em]' : 'text-[0.72rem] tracking-[0.06em]'}`}>{label}</span>
      <strong className={`block leading-[1.15] ${compact ? 'mt-1 text-[0.9rem]' : 'mt-1 text-[0.98rem]'}`} style={{ color: accent }}>{value}</strong>
    </div>
  );
}

export function SegmentButton({ active, label, meta, onClick }: { active: boolean; label: string; meta?: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`nav-pill gap-2 ${active ? 'bg-[#34d399]/10 text-[var(--accent-primary)] border-[#34d399]/20' : 'bg-[#0a101e]/70 text-[var(--text-secondary)] border-[var(--border-glass)]'}`}
    >
      <span>{label}</span>
      {meta != null ? (
        <span className={`min-w-[1.55rem] px-1.5 py-0.5 rounded-full text-[0.75rem] text-center ${active ? 'bg-[#34d399]/15 text-[var(--accent-primary)]' : 'bg-white/5 text-[var(--text-muted)]'}`}>
          {meta}
        </span>
      ) : null}
    </button>
  );
}

export function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={`glass-panel static-panel bg-[#020b1c]/60 border-dashed border-[#7c8db5]/20 ${compact ? 'p-[0.95rem]' : 'p-4'}`}>
      <strong className="block mb-1">{title}</strong>
      <p className="text-[var(--text-secondary)] text-[0.88rem]">{text}</p>
    </div>
  );
}

export function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex justify-between gap-3 items-center flex-wrap">
      <button onClick={() => onPageChange(Math.max(1, page - 1))} className="btn-outline min-w-auto px-3 py-2" disabled={page <= 1}>
        Anterior
      </button>
      <span className="text-[var(--text-secondary)] text-[0.84rem]">
        Página {page} de {totalPages}
      </span>
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="btn-outline min-w-auto px-3 py-2" disabled={page >= totalPages}>
        Próxima
      </button>
    </div>
  );
}
