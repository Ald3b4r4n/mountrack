/**
 * @file food-data-validator.ts
 * @description Script utilitário para validar integridade dos dados de alimentos.
 *
 * Verifica:
 * - IDs únicos entre todas as fontes
 * - Campos obrigatórios preenchidos (id, name, baseUnit, caloriesPer100, etc.)
 * - confidenceScore ≥ 0.7 para cada item
 * - Duplicatas por nome (case-insensitive)
 * - Nomes com capitalização inconsistente
 * - Valores nutricionais negativos ou absurdos
 *
 * Uso: npx tsx src/modules/nutrition/data/food-data-validator.ts
 */

import { TACO_FOODS } from "./taco-foods";
import { INTERNAL_FOODS } from "./internal-foods";
import { SUPPLEMENT_FOODS } from "./supplement-foods";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado de uma verificação individual */
interface ValidationIssue {
  /** Severidade: "error" bloqueia, "warn" é informativo */
  severity: "error" | "warn";
  /** Fonte do dado (taco, internal, supplement) */
  source: string;
  /** ID do item com problema (se aplicável) */
  itemId?: string;
  /** Descrição do problema encontrado */
  message: string;
}

/** Resumo da validação completa */
interface ValidationReport {
  /** Total de itens analisados */
  totalItems: number;
  /** Problemas encontrados */
  issues: ValidationIssue[];
  /** Contagem de erros */
  errorCount: number;
  /** Contagem de avisos */
  warnCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza nome para comparação (lowercase, sem acentos, sem espaços extras) */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÕES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida um array de alimentos contra regras de integridade.
 * Retorna um relatório com todos os problemas encontrados.
 */
export function validateFoodData(): ValidationReport {
  const allFoods = [
    ...TACO_FOODS.map((f) => ({ ...f, _source: "taco" })),
    ...INTERNAL_FOODS.map((f) => ({ ...f, _source: "internal" })),
    ...SUPPLEMENT_FOODS.map((f) => ({ ...f, _source: "supplement" })),
  ];

  const issues: ValidationIssue[] = [];

  // ── 1. IDs únicos ──
  const idMap = new Map<string, { source: string; name: string }>();
  for (const food of allFoods) {
    const existing = idMap.get(food.id);
    if (existing) {
      issues.push({
        severity: "error",
        source: food._source,
        itemId: food.id,
        message: `ID duplicado "${food.id}" — já existe em [${existing.source}] como "${existing.name}"`,
      });
    } else {
      idMap.set(food.id, { source: food._source, name: food.name });
    }
  }

  // ── 2. Nomes duplicados (case-insensitive, sem acentos) ──
  const nameMap = new Map<string, { source: string; id: string; originalName: string }>();
  for (const food of allFoods) {
    const normalized = normalizeName(food.name);
    const existing = nameMap.get(normalized);
    if (existing && existing.source === food._source) {
      issues.push({
        severity: "warn",
        source: food._source,
        itemId: food.id,
        message: `Nome duplicado "${food.name}" (normalizado: "${normalized}") — já existe como "${existing.originalName}" [${existing.id}]`,
      });
    } else if (!existing) {
      nameMap.set(normalized, { source: food._source, id: food.id, originalName: food.name });
    }
  }

  // ── 3. Campos obrigatórios e validação de valores ──
  for (const food of allFoods) {
    // Campos obrigatórios
    if (!food.id) {
      issues.push({ severity: "error", source: food._source, message: `Item sem ID encontrado` });
    }
    if (!food.name || food.name.trim() === "") {
      issues.push({ severity: "error", source: food._source, itemId: food.id, message: `Nome vazio` });
    }
    if (!food.baseUnit) {
      issues.push({ severity: "error", source: food._source, itemId: food.id, message: `baseUnit ausente` });
    }

    // Valores nutricionais devem ser >= 0
    for (const field of ["caloriesPer100", "proteinPer100", "carbsPer100", "fatPer100"] as const) {
      const value = food[field];
      if (value == null) {
        issues.push({ severity: "error", source: food._source, itemId: food.id, message: `${field} ausente` });
      } else if (value < 0) {
        issues.push({ severity: "error", source: food._source, itemId: food.id, message: `${field} negativo (${value})` });
      }
    }

    // Calorias absurdamente altas (> 900 kcal/100g é impossível para alimentos naturais)
    if (food.caloriesPer100 != null && food.caloriesPer100 > 900) {
      issues.push({
        severity: "warn",
        source: food._source,
        itemId: food.id,
        message: `caloriesPer100 muito alto (${food.caloriesPer100}) — verificar dados`,
      });
    }

    // ── 4. confidenceScore ──
    if (food.confidenceScore == null) {
      issues.push({
        severity: "warn",
        source: food._source,
        itemId: food.id,
        message: `confidenceScore ausente — será tratado como 0.5`,
      });
    } else if (food.confidenceScore < 0.7) {
      issues.push({
        severity: "warn",
        source: food._source,
        itemId: food.id,
        message: `confidenceScore baixo (${food.confidenceScore}) — considere elevar para ≥ 0.7`,
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;

  return {
    totalItems: allFoods.length,
    issues,
    errorCount,
    warnCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUÇÃO DIRETA (npx tsx food-data-validator.ts)
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module || process.argv[1]?.includes("food-data-validator")) {
  const report = validateFoodData();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  VALIDAÇÃO DA BASE DE ALIMENTOS — ${report.totalItems} itens`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (report.issues.length === 0) {
    console.log("✅ Nenhum problema encontrado!\n");
  } else {
    // Agrupa por severidade
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warn");

    if (errors.length > 0) {
      console.log(`❌ ERROS (${errors.length}):\n`);
      for (const issue of errors) {
        console.log(`  [${issue.source}] ${issue.itemId ?? "?"} → ${issue.message}`);
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log(`⚠️  AVISOS (${warnings.length}):\n`);
      for (const issue of warnings) {
        console.log(`  [${issue.source}] ${issue.itemId ?? "?"} → ${issue.message}`);
      }
      console.log();
    }
  }

  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  Total: ${report.totalItems} | Erros: ${report.errorCount} | Avisos: ${report.warnCount}`);
  console.log("───────────────────────────────────────────────────────────────\n");

  // Código de saída não-zero se houver erros
  if (report.errorCount > 0) {
    process.exit(1);
  }
}
