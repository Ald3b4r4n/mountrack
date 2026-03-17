"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Field } from "./CommonUI";
import { Droplets, Info } from "lucide-react";

interface CustomWaterDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (amount: number, mode: "increment" | "absolute") => void;
  isSaving?: boolean;
  initialMode?: "increment" | "absolute";
}

export function CustomWaterDialog({
  open,
  onClose,
  onSave,
  isSaving = false,
  initialMode = "increment",
}: CustomWaterDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const [mode, setMode] = useState<"increment" | "absolute">(initialMode);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    const num = Number(value.replace(",", "."));
    if (isNaN(num)) {
      setError("Por favor, insira um número válido.");
      return;
    }
    if (mode === "absolute" && num < 0) {
      setError("O total não pode ser negativo.");
      return;
    }
    if (mode === "increment" && Math.abs(num) > 5000) {
      setError("O ajuste deve ser entre -5000 e 5000 ml.");
      return;
    }
    
    onSave(num, mode);
  }, [value, mode, onSave]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      setMode(initialMode);
      
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || !mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !isSaving) handleConfirm();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, mounted, isSaving, onClose, handleConfirm]);

  if (!open || !mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-panel relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-[#050f1d] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header decoration */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
        
        <div className="relative mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-400">
            <Droplets size={24} />
          </div>
          <div>
            <h3 id={titleId} className="text-lg font-black tracking-tight text-white">Consumo de Água</h3>
            <p className="text-[0.8rem] font-medium text-[var(--text-secondary)] opacity-60">Lançamento personalizado</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-[1.2rem] border border-white/5 bg-[#0a1525] p-1">
          <button
            onClick={() => setMode("increment")}
            className={`rounded-xl py-2.5 text-[0.8rem] font-bold transition-all ${
              mode === "increment" 
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                : "text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            Ajustar
          </button>
          <button
            onClick={() => setMode("absolute")}
            className={`rounded-xl py-2.5 text-[0.8rem] font-bold transition-all ${
              mode === "absolute" 
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                : "text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            Total do Dia
          </button>
        </div>

        {/* Input area */}
        <div className="space-y-4">
          <Field label={mode === "increment" ? "Quantidade a somar (ml)" : "Novo total do dia (ml)"}>
            <div className="relative">
              <input
                ref={inputRef}
                className="input-field h-14 w-full rounded-[1.1rem] border-white/10 bg-white/5 pr-12 text-lg font-black focus:border-sky-500/50"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder={mode === "increment" ? "Ex: 250 ou -100" : "Ex: 2000"}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">ml</span>
            </div>
          </Field>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-rose-400">
              <Info size={14} className="shrink-0" />
              <span className="text-[0.75rem] font-bold">{error}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button 
            onClick={onClose} 
            className="btn-outline h-12 rounded-[1.1rem] text-[0.85rem] font-bold border-white/10"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm} 
            className="btn-primary h-12 rounded-[1.1rem] text-[0.85rem] font-black bg-sky-500 shadow-lg shadow-sky-500/25"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
