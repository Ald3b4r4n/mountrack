"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FoodItem } from "@/modules/nutrition/domain/types";
import {
  authorizedNutritionFetch,
  getNutritionErrorMessage,
} from "@/modules/nutrition/client";

interface CustomFoodDialogProps {
  authUser: Parameters<typeof authorizedNutritionFetch>[0] | null;
  open: boolean;
  onClose: () => void;
  onCreated: (food: FoodItem) => void;
  editingFood?: FoodItem | null;
}

export function CustomFoodDialog({
  authUser,
  open,
  onClose,
  onCreated,
  editingFood,
}: CustomFoodDialogProps) {
  const isEditing = Boolean(editingFood);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingFood) {
      const base = editingFood.servingGrams ?? 100;
      const toServing = base / 100;
      setName(editingFood.displayName ?? editingFood.name);
      setBrand(editingFood.brand ?? "");
      setCalories(editingFood.caloriesPer100 ? String(Number((editingFood.caloriesPer100 * toServing).toFixed(2))) : "");
      setProtein(editingFood.proteinPer100 ? String(Number((editingFood.proteinPer100 * toServing).toFixed(2))) : "");
      setCarbs(editingFood.carbsPer100 ? String(Number((editingFood.carbsPer100 * toServing).toFixed(2))) : "");
      setFat(editingFood.fatPer100 ? String(Number((editingFood.fatPer100 * toServing).toFixed(2))) : "");
      setServing(editingFood.servingGrams ? String(editingFood.servingGrams) : "100");
    } else {
      setName("");
      setBrand("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setServing("100");
    }
    setError(null);
  }, [open, editingFood]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const frame = window.requestAnimationFrame(() => {
      firstInputRef.current?.focus();
      if (typeof dialogRef.current?.scrollTo === "function") {
        dialogRef.current.scrollTo({ top: 0, behavior: "auto" });
      }
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [mounted, onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  async function handleSave() {
    if (!authUser) {
      setError("Sua sessão da nutrição não foi validada. Entre novamente e tente de novo.");
      return;
    }

    if (!name.trim()) {
      setError("Informe o nome do alimento.");
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

      const url = editingFood
        ? `/api/nutrition/foods/custom/${encodeURIComponent(editingFood.id)}`
        : "/api/nutrition/foods/custom";
      const method = editingFood ? "PUT" : "POST";

      const response = await authorizedNutritionFetch(authUser, url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await getNutritionErrorMessage(response, "Não consegui salvar esse alimento agora."),
        );
      }

      const data = (await response.json()) as { item?: FoodItem };
      if (data.item) {
        onCreated(data.item);
        return;
      }

      throw new Error("Não consegui salvar esse alimento agora.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Não consegui salvar esse alimento agora.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        padding: "max(1rem, 2vh) 1rem",
        background: "rgba(8, 14, 26, 0.72)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          border: "none",
          background: "transparent",
          cursor: "default",
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "32rem",
          margin: "max(1rem, 4vh) auto",
          padding: "1.25rem",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
        }}
      >
        <div className="mb-4">
          <h3 id={titleId} style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            {isEditing ? "Editar alimento" : "Criar alimento manual"}
          </h3>
          <p id={descriptionId} style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {isEditing
              ? "Atualize os dados nutricionais do alimento que você criou."
              : "Salve um alimento próprio para reencontrar depois na busca e registrar no diário com mais rapidez."}
          </p>
        </div>

        {error ? (
          <div style={{ color: "#fca5a5", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>
        ) : null}

        <div className="grid gap-[0.85rem]">
          <label className="block">
            <span
              style={{
                display: "block",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Nome do alimento *
            </span>
            <input
              ref={firstInputRef}
              className="input-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Pão de queijo da casa"
              style={{ width: "100%" }}
            />
          </label>

          <label className="block">
            <span
              style={{
                display: "block",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Marca (opcional)
            </span>
            <input
              className="input-field"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Ex.: Padaria do João"
              style={{ width: "100%" }}
            />
          </label>

          <div className="grid gap-[0.85rem] sm:grid-cols-2">
            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Calorias na porção (kcal)
              </span>
              <input
                inputMode="decimal"
                className="input-field"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="0"
                style={{ width: "100%" }}
              />
            </label>

            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Porção base (g ou ml)
              </span>
              <input
                inputMode="decimal"
                className="input-field"
                value={serving}
                onChange={(event) => setServing(event.target.value)}
                placeholder="100"
                style={{ width: "100%" }}
              />
            </label>

            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Carboidratos na porção (g)
              </span>
              <input
                inputMode="decimal"
                className="input-field"
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                placeholder="0"
                style={{ width: "100%" }}
              />
            </label>

            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Proteínas na porção (g)
              </span>
              <input
                inputMode="decimal"
                className="input-field"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                placeholder="0"
                style={{ width: "100%" }}
              />
            </label>

            <label className="block sm:col-span-2">
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Gorduras na porção (g)
              </span>
              <input
                inputMode="decimal"
                className="input-field"
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                placeholder="0"
                style={{ width: "100%" }}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="btn-outline" disabled={isSaving}>
            Cancelar
          </button>
          <button onClick={() => void handleSave()} className="btn-primary" disabled={isSaving}>
            {isSaving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar alimento"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
