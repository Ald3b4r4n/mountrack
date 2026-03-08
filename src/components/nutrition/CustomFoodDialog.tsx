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
      style={{
        position: "fixed", inset: 0, background: "rgba(8, 14, 26, 0.82)", backdropFilter: "blur(14px)",
        zIndex: 50, display: "grid", placeItems: "center", padding: "1rem"
      }}
    >
      <div 
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="glass-panel"
        style={{ width: "100%", maxWidth: "32rem", padding: "1.25rem", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 id={titleId} style={{ fontSize: "1.1rem", fontWeight: 600 }}>Cadastrar Alimento</h3>
            <p id={descriptionId} style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Adicione um alimento customizado ao seu catálogo.
            </p>
          </div>
        </div>

        {error && <div style={{ color: "#fca5a5", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}

        <div style={{ display: "grid", gap: "0.85rem" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Nome do alimento *</span>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pão de queijo caseiro" style={{ width: "100%" }} />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Marca (Opcional)</span>
            <input className="input-field" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex.: Padaria do João" style={{ width: "100%" }} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Calorias (kcal)</span>
              <input type="numeric" inputMode="decimal" className="input-field" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0" style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Porção base (g ou ml)</span>
              <input type="numeric" inputMode="decimal" className="input-field" value={serving} onChange={e => setServing(e.target.value)} placeholder="100" style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Carboidratos (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Proteínas (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Gorduras (g)</span>
              <input type="numeric" inputMode="decimal" className="input-field" value={fat} onChange={e => setFat(e.target.value)} placeholder="0" style={{ width: "100%" }} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button onClick={onClose} className="btn-outline" disabled={isSaving}>Cancelar</button>
          <button onClick={() => void handleSave()} className="btn-primary" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar alimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
