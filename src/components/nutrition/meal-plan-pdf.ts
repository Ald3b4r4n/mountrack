import type { MealPlan, NutritionObjective, NutritionTotals } from "@/modules/nutrition/domain/types";

const MEAL_LABELS: Record<MealPlan["meals"][number]["mealType"], string> = {
  breakfast: "Cafe da manha",
  lunch: "Almoco",
  snack: "Lanches",
  dinner: "Jantar",
};

const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  lose: "Emagrecimento",
  maintain: "Manutencao",
  gain: "Ganho de peso",
};

const MACRO_LABELS = {
  protein: "Proteina",
  carbs: "Carboidratos",
  fat: "Gorduras",
};

function formatCalories(value: number): string {
  return `${value.toFixed(0)} kcal`;
}

function formatGrams(value: number): string {
  return `${value.toFixed(0)} g`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMealPlanPdfHtml({
  plan,
  targetCalories,
  objective,
  dateLabel,
  totals,
}: {
  plan: MealPlan;
  targetCalories: number;
  objective: NutritionObjective;
  dateLabel: string;
  totals: Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat">;
}): string {
  const mealSections = plan.meals
    .map(
      (meal) => `
        <section class="meal-card">
          <div class="meal-header">
            <div>
              <p class="eyebrow">${escapeHtml(MEAL_LABELS[meal.mealType])}</p>
              <h2>${escapeHtml(meal.name)}</h2>
            </div>
            <div class="meal-calories">${escapeHtml(formatCalories(meal.totalCalories))}</div>
          </div>
          <p class="meal-target">Alvo: ${escapeHtml(formatCalories(meal.targetCalories))}</p>
          <div class="item-list">
            ${
              meal.items.length
                ? meal.items
                    .map(
                      (item) => `
                        <article class="item-row">
                          <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <p>${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)} · ${escapeHtml(formatCalories(item.calories))}</p>
                          </div>
                          <div class="macro-copy">
                            <span>${escapeHtml(formatGrams(item.protein))} prot</span>
                            <span>${escapeHtml(formatGrams(item.carbs))} carb</span>
                            <span>${escapeHtml(formatGrams(item.fat))} gord</span>
                          </div>
                        </article>
                      `,
                    )
                    .join("")
                : '<p class="empty-copy">Sem itens nesta refeicao.</p>'
            }
          </div>
        </section>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Cardapio de Nutricao</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe4ef;
            --brand: #059669;
            --brand-soft: #ecfdf5;
            --rose: #e11d48;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Outfit", "Segoe UI", sans-serif;
            color: var(--ink);
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          }
          .page { padding: 36px; }
          .hero {
            background: linear-gradient(135deg, #052e2b 0%, #0f172a 100%);
            color: #f8fafc;
            border-radius: 28px;
            padding: 28px;
            margin-bottom: 24px;
          }
          .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            margin-bottom: 18px;
          }
          .hero h1 { margin: 10px 0 8px; font-size: 32px; line-height: 1.05; }
          .eyebrow { margin: 0; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px; opacity: 0.76; }
          .hero-copy { margin: 0; max-width: 52ch; color: rgba(248, 250, 252, 0.82); line-height: 1.6; }
          .hero-badge { padding: 10px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); font-size: 13px; }
          .summary-grid, .metrics-grid { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .metric, .summary-card, .meal-card {
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid var(--line);
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          }
          .summary-card, .metric { padding: 18px; }
          .summary-card strong, .metric strong { display: block; margin-top: 6px; font-size: 24px; }
          .summary-card span, .metric span, .meal-target, .item-row p, .macro-copy, .footer-copy { color: var(--muted); }
          .content { display: grid; gap: 18px; }
          .metrics-grid { margin-bottom: 24px; }
          .metric.protein strong { color: var(--brand); }
          .metric.carbs strong { color: #0891b2; }
          .metric.fat strong { color: var(--rose); }
          .meal-card { padding: 22px; page-break-inside: avoid; }
          .meal-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 6px; }
          .meal-header h2 { margin: 6px 0 0; font-size: 22px; }
          .meal-calories {
            padding: 10px 14px;
            border-radius: 999px;
            background: var(--brand-soft);
            color: var(--brand);
            font-weight: 700;
            white-space: nowrap;
          }
          .meal-target { margin: 0 0 16px; }
          .item-list { display: grid; gap: 10px; }
          .item-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid #edf2f7;
          }
          .item-row strong { display: block; margin-bottom: 4px; font-size: 15px; }
          .item-row p { margin: 0; font-size: 13px; }
          .macro-copy { display: grid; gap: 4px; text-align: right; font-size: 12px; }
          .empty-copy {
            margin: 0;
            padding: 18px;
            border-radius: 18px;
            border: 1px dashed var(--line);
            background: #f8fafc;
            color: var(--muted);
          }
          .footer-copy { margin-top: 18px; text-align: right; font-size: 12px; }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <div class="hero-top">
              <div>
                <p class="eyebrow">MounTrack · Nutricao</p>
                <h1>Cardapio diario</h1>
                <p class="hero-copy">Plano alimentar exportado a partir do modulo de nutricao, com calorias ajustadas e refeicoes prontas para impressao em PDF.</p>
              </div>
              <div class="hero-badge">${escapeHtml(dateLabel)}</div>
            </div>
            <div class="summary-grid">
              <div class="summary-card"><span>Objetivo</span><strong>${escapeHtml(OBJECTIVE_LABELS[objective])}</strong></div>
              <div class="summary-card"><span>Meta do plano</span><strong>${escapeHtml(formatCalories(targetCalories))}</strong></div>
              <div class="summary-card"><span>Total planejado</span><strong>${escapeHtml(formatCalories(plan.totalCalories))}</strong></div>
              <div class="summary-card"><span>Refeicoes</span><strong>${escapeHtml(String(plan.meals.length))}</strong></div>
            </div>
          </section>

          <section class="content">
            <div class="metrics-grid">
              <div class="metric protein"><span>${MACRO_LABELS.protein}</span><strong>${escapeHtml(formatGrams(totals.protein))}</strong></div>
              <div class="metric carbs"><span>${MACRO_LABELS.carbs}</span><strong>${escapeHtml(formatGrams(totals.carbs))}</strong></div>
              <div class="metric fat"><span>${MACRO_LABELS.fat}</span><strong>${escapeHtml(formatGrams(totals.fat))}</strong></div>
              <div class="metric"><span>Calorias planejadas</span><strong>${escapeHtml(formatCalories(totals.calories))}</strong></div>
            </div>
            ${mealSections}
          </section>

          <p class="footer-copy">Abra a janela de impressao do navegador e escolha “Salvar como PDF”.</p>
        </main>
      </body>
    </html>
  `;
}
