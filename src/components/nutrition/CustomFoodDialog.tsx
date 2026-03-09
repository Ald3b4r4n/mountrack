"use client";

import { useId, useRef, useState, useEffect } from "react";
import type { FoodItem } from "@/modules/nutrition/domain/types";

interface CustomFoodDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (food: FoodItem) => void;
}

export function CustomFoodDialog({ open, onClose, onCreated }: CustomFoodDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [serving, setServing] = useState("100");
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setBrand("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setServing("100");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) {
      setError("O nome do alimento é obrigatório.");
      return;
    }
    
    setError(null);
    setIsSaving(true);
    
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        caloriesPer100: Number(calories.replace(",", ".")) || 0,
        proteinPer100: Number(protein.replace(",", ".")) || 0,
        carbsPer100: Number(carbs.replace(",", ".")) || 0,
        fatPer100: Number(fat.replace(",", ".")) || 0,
        servingGrams: Number(serving.replace(",", ".")) || undefined,
      };

      const res = await fetch("/api/nutrition/foods/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar");
      }

      const data = await res.json();
      if (data.item) {
        onCreated(data.item);
      }
    } catch {
      setError("Ocorreu um erro ao salvar o alimento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-[#080e1a]/80 backdrop-blur-sm z-50 grid place-items-center p-4"
    >
      <div 
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="glass-panel w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 id={titleId} className="text-[1.1rem] font-semibold">Cadastrar Alimento</h3>
            <p id={descriptionId} className="text-[var(--text-secondary)] text-[0.9rem]">
              Adicione um alimento customizado ao seu catálogo.
            </p>
          </div>
        </div>

        {error && <div className="text-red-400 text-[0.9rem] mb-4">{error}</div>}

        <div className="grid gap-[0.85rem]">
          <label className="block">
            <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Nome do alimento *</span>
            <input className="input-field w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pão de queijo caseiro" />
          </label>
          <label className="block">
            <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Marca (Opcional)</span>
            <input className="input-field w-full" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex.: Padaria do João" />
          </label>

          <div className="grid grid-cols-2 gap-[0.85rem]">
            <label className="block">
              <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Calorias (kcal)</span>
              <input type="numeric" inputMode="decimal" className="input-field w-full" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0" />
            </label>
            <label className="block">
              <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Porção base (g ou ml)</span>
              <input type="numeric" inputMode="decimal" className="input-field w-full" value={serving} onChange={e => setServing(e.target.value)} placeholder="100" />
            </label>
            <label className="block">
              <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Carboidratos (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field w-full" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" />
            </label>
            <label className="block">
              <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Proteínas (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field w-full" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" />
            </label>
            <label className="block">
              <span className="block text-[0.85rem] text-[var(--text-secondary)] mb-1">Gorduras (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field w-full" value={fat} onChange={e => setFat(e.target.value)} placeholder="0" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline" disabled={isSaving}>Cancelar</button>
          <button onClick={() => void handleSave()} className="btn-primary" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar alimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
