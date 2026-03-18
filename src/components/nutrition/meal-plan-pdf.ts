import type { jsPDF } from "jspdf";
import type {
  MealPlan,
  NutritionObjective,
  NutritionTotals,
} from "@/modules/nutrition/domain/types";

export const NUTRITION_COMPANY_SIGNATURE = "A&R Software Development";
export const NUTRITION_COMPANY_URL = "antoniorafael.com.br";

const PDF_CANVAS_WIDTH = 794;
const PDF_MARGIN = 24;

const MEAL_LABELS: Record<MealPlan["meals"][number]["mealType"], string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  snack: "Lanches",
  dinner: "Jantar",
};

const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  lose: "Emagrecimento",
  maintain: "Manutenção",
  gain: "Ganho de peso",
};

const MACRO_LABELS = {
  protein: "Proteína",
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const MEAL_PLAN_PDF_STYLES = `
  :root {
    color-scheme: light;
    --page: #f2f6fb;
    --surface: #ffffff;
    --surface-soft: #f7fafc;
    --ink: #0f172a;
    --muted: #5e6b7f;
    --line: #d8e2ee;
    --emerald: #0f9f6e;
    --cyan: #1282a9;
    --rose: #d44366;
    --navy: #10233f;
    --mint: #e7f6ef;
    --shadow: 0 14px 34px rgba(15, 35, 63, 0.07);
  }
  * { 
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background: #ffffff;
    color: var(--ink);
    font-family: "Segoe UI", Arial, sans-serif;
  }
  .page {
    width: 794px;
    padding: 30px;
    background:
      radial-gradient(circle at top right, rgba(18, 130, 169, 0.05), transparent 28%),
      linear-gradient(180deg, #f7fafd 0%, #eef4f9 100%);
  }
  .header-shell,
  .meal-card,
  .metric-card,
  .summary-card {
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .header-shell {
    border-radius: 28px;
    overflow: hidden;
    margin-bottom: 18px;
  }
  .header-stripe {
    height: 12px;
    background: linear-gradient(90deg, #0f9f6e 0%, #1282a9 48%, #10233f 100%);
  }
  .header-body {
    padding: 24px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 18px;
  }
  .eyebrow {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
    color: var(--muted);
  }
  .title {
    margin: 0 0 8px;
    font-size: 32px;
    line-height: 1.08;
    color: var(--navy);
  }
  .subtitle {
    margin: 0;
    max-width: 54ch;
    color: var(--muted);
    line-height: 1.6;
    font-size: 13px;
  }
  .date-chip,
  .company-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-soft);
    color: var(--navy);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .company-chip {
    background: linear-gradient(135deg, rgba(15, 159, 110, 0.12), rgba(18, 130, 169, 0.08));
    color: #0c684a;
    border-color: rgba(15, 159, 110, 0.2);
  }
  .header-signature {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .signature-copy {
    font-size: 12px;
    color: var(--muted);
  }
  .summary-grid,
  .metrics-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .summary-card,
  .metric-card {
    border-radius: 20px;
    padding: 16px 18px;
  }
  .summary-card {
    background: linear-gradient(180deg, #fbfdff 0%, #f4f8fc 100%);
  }
  .summary-card span,
  .metric-label,
  .meal-target,
  .item-meta,
  .item-macros,
  .footer-copy {
    color: var(--muted);
  }
  .summary-card strong {
    display: block;
    margin-top: 6px;
    font-size: 16px;
    color: var(--navy);
    line-height: 1.2;
    word-break: break-word;
  }
  .metrics-shell {
    margin-bottom: 18px;
  }
  .section-title {
    margin: 0 0 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted);
  }
  .metric-card strong {
    display: block;
    margin-top: 8px;
    font-size: 20px;
  }
  .metric-card.protein strong { color: var(--emerald); }
  .metric-card.carbs strong { color: var(--cyan); }
  .metric-card.fat strong { color: var(--rose); }
  .metric-card.kcal strong { color: var(--navy); }
  .content {
    display: grid;
    gap: 14px;
  }
  .meal-card {
    border-radius: 24px;
    padding: 20px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .meal-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .meal-overline {
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
    color: var(--muted);
  }
  .meal-header h2 {
    margin: 0 0 6px;
    font-size: 28px;
    line-height: 1.08;
    color: var(--navy);
  }
  .meal-target {
    margin: 0;
    font-size: 13px;
  }
  .meal-calories {
    display: inline-flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 999px;
    background: var(--mint);
    color: var(--emerald);
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
  }
  .item-list {
    display: grid;
    gap: 10px;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--surface-soft);
    border: 1px solid #e5eef7;
  }
  .item-row strong {
    display: block;
    margin-bottom: 6px;
    font-size: 15px;
    color: var(--navy);
  }
  .item-meta {
    margin: 0;
    font-size: 13px;
  }
  .item-macros {
    display: grid;
    gap: 4px;
    min-width: 92px;
    text-align: right;
    font-size: 12px;
  }
  .empty-copy {
    margin: 0;
    padding: 18px;
    border-radius: 18px;
    border: 1px dashed var(--line);
    background: var(--surface-soft);
    color: var(--muted);
  }
  .footer-copy {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .footer-copy strong {
    color: var(--ink);
  }
`;

function buildMealSections(plan: MealPlan): string {
  return plan.meals
    .map(
      (meal) => `
        <section class="meal-card">
          <div class="meal-header">
            <div>
              <p class="meal-overline">${escapeHtml(MEAL_LABELS[meal.mealType])}</p>
              <h2>${escapeHtml(meal.name)}</h2>
              <p class="meal-target">Alvo da refeição: ${escapeHtml(formatCalories(meal.targetCalories))}</p>
            </div>
            <div class="meal-calories">${escapeHtml(formatCalories(meal.totalCalories))}</div>
          </div>
          <div class="item-list">
            ${
              meal.items.length
                ? meal.items
                    .map(
                      (item) => `
                        <article class="item-row">
                          <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <p class="item-meta">${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)} - ${escapeHtml(formatCalories(item.calories))}</p>
                          </div>
                          <div class="item-macros">
                            <span>${escapeHtml(formatGrams(item.protein))} prot</span>
                            <span>${escapeHtml(formatGrams(item.carbs))} carb</span>
                            <span>${escapeHtml(formatGrams(item.fat))} gord</span>
                          </div>
                        </article>
                      `,
                    )
                    .join("")
                : '<p class="empty-copy">Sem itens nesta refeição.</p>'
            }
          </div>
        </section>
      `,
    )
    .join("");
}

export function buildMealPlanPdfMarkup({
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
  return `
    <main class="page" data-pdf-root="meal-plan">
      <section class="header-shell">
        <div class="header-stripe"></div>
        <div class="header-body">
          <div class="header-top">
            <div>
              <p class="eyebrow">MounTrack / Nutrição</p>
              <h1 class="title">Cardápio Diário</h1>
              <p class="subtitle">Seu planejamento nutricional estruturado, com metas calóricas, distribuição de macronutrientes e refeições organizadas para o seu dia a dia.</p>
            </div>
            <div class="date-chip">${escapeHtml(dateLabel)}</div>
          </div>

          <div class="header-signature">
            <a href="https://antoniorafael.com.br" target="_blank" rel="noopener noreferrer" class="company-chip" style="text-decoration: none;">${escapeHtml(NUTRITION_COMPANY_SIGNATURE)}</a>
          </div>

          <div class="summary-grid">
            <div class="summary-card"><span>Objetivo</span><strong>${escapeHtml(OBJECTIVE_LABELS[objective])}</strong></div>
            <div class="summary-card"><span>Meta do plano</span><strong>${escapeHtml(formatCalories(targetCalories))}</strong></div>
            <div class="summary-card"><span>Total planejado</span><strong>${escapeHtml(formatCalories(plan.totalCalories))}</strong></div>
            <div class="summary-card"><span>Refeições</span><strong>${escapeHtml(String(plan.meals.length))}</strong></div>
          </div>
        </div>
      </section>

      <section class="metrics-shell">
        <p class="section-title">Distribuição Nutricional</p>
        <div class="metrics-grid">
          <div class="metric-card protein"><span class="metric-label">${MACRO_LABELS.protein}</span><strong>${escapeHtml(formatGrams(totals.protein))}</strong></div>
          <div class="metric-card carbs"><span class="metric-label">${MACRO_LABELS.carbs}</span><strong>${escapeHtml(formatGrams(totals.carbs))}</strong></div>
          <div class="metric-card fat"><span class="metric-label">${MACRO_LABELS.fat}</span><strong>${escapeHtml(formatGrams(totals.fat))}</strong></div>
          <div class="metric-card kcal"><span class="metric-label">Calorias planejadas</span><strong>${escapeHtml(formatCalories(totals.calories))}</strong></div>
        </div>
      </section>

      <section class="content">
        ${buildMealSections(plan)}
      </section>

      <div class="footer-copy">
        <span><strong>${escapeHtml(NUTRITION_COMPANY_SIGNATURE)}</strong> / ${escapeHtml(NUTRITION_COMPANY_URL)}</span>
        <span>Gerado pelo MounTrack.</span>
      </div>
    </main>
  `;
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
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Cardápio de Nutrição</title>
        <style>${MEAL_PLAN_PDF_STYLES}</style>
      </head>
      <body>
        ${buildMealPlanPdfMarkup({ plan, targetCalories, objective, dateLabel, totals })}
      </body>
    </html>
  `;
}

function createMealPlanExportContainer(markup: string): HTMLDivElement {
  const exportContainer = document.createElement("div");
  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-10000px";
  exportContainer.style.top = "0";
  exportContainer.style.width = `${PDF_CANVAS_WIDTH}px`;
  exportContainer.style.background = "#ffffff";
  exportContainer.style.pointerEvents = "none";
  exportContainer.innerHTML = `<style>${MEAL_PLAN_PDF_STYLES}</style>${markup}`;
  return exportContainer;
}

async function waitForPdfRenderReady(): Promise<void> {
  if ("fonts" in document && document.fonts) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function addCanvasPagesToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  targetElement: HTMLElement,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - PDF_MARGIN * 2;
  const usableHeight = pageHeight - PDF_MARGIN * 2;
  const renderScale = usableWidth / canvas.width;
  const maxSliceHeightCanvas = Math.max(
    1,
    Math.floor(usableHeight / renderScale),
  );

  // Determine safe cut points based on major sections and rows
  // html2canvas uses a scale of 2
  const SCALE = 2;
  const cutPointsCanvas = [canvas.height];
  const targetRect = targetElement.getBoundingClientRect();

  // We specify granular elements so we can cut INSIDE the meal card if it's too big,
  // preventing arbitrary geometric cuts that slice text in half.
  const elements = Array.from(
    targetElement.querySelectorAll(
      ".header-shell, .metrics-shell, .summary-card, .meal-header, .item-row, .empty-copy, .footer-copy",
    ),
  ) as HTMLElement[];

  // Sort elements by their vertical position to ensure linear processing
  elements.sort(
    (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
  );

  for (let i = 0; i < elements.length - 1; i++) {
    const el1 = elements[i];
    const el2 = elements[i + 1];

    const el1Rect = el1.getBoundingClientRect();
    const el2Rect = el2.getBoundingClientRect();

    const el1Bottom = el1Rect.bottom - targetRect.top;
    const el2Top = el2Rect.top - targetRect.top;

    // Only make a cut if el2 is strictly below el1 and there's a gap
    if (el2Top >= el1Bottom) {
      const gapCenter = (el1Bottom + el2Top) / 2;
      cutPointsCanvas.push(gapCenter * SCALE);
    }
  }

  cutPointsCanvas.sort((a, b) => a - b);

  let renderedHeight = 0;
  let pageIndex = 0;

  while (renderedHeight < canvas.height - 5) {
    // 5px tolerance
    // Filter to cuts that are ahead of our progress and fit in one page
    const possibleCuts = cutPointsCanvas.filter(
      (c) =>
        c > renderedHeight + 5 && c <= renderedHeight + maxSliceHeightCanvas,
    );

    let nextPossibleCut = renderedHeight + maxSliceHeightCanvas;

    if (possibleCuts.length > 0) {
      // Pick the largest safe cut within this page limit
      nextPossibleCut = possibleCuts[possibleCuts.length - 1];
    } else {
      // No safe cut found in the max slice height.
      // E.g. a huge card that takes more than one full page.
      // We must fallback to max slice height.
      if (canvas.height - renderedHeight <= maxSliceHeightCanvas) {
        nextPossibleCut = canvas.height;
      }
    }

    const currentSliceHeight = Math.min(
      nextPossibleCut - renderedHeight,
      canvas.height - renderedHeight,
    );

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = currentSliceHeight;

    const context = pageCanvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable for PDF export.");
    }

    context.drawImage(
      canvas,
      0,
      renderedHeight,
      canvas.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight,
    );

    if (pageIndex > 0) {
      pdf.addPage();
    }

    // Fill white background just in case
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.addImage(
      pageCanvas.toDataURL("image/png", 1),
      "PNG",
      PDF_MARGIN,
      PDF_MARGIN,
      usableWidth,
      currentSliceHeight * renderScale,
      undefined,
      "FAST",
    );

    renderedHeight += currentSliceHeight;
    pageIndex += 1;
  }
}

export async function downloadMealPlanPdf({
  filename,
  plan,
  targetCalories,
  objective,
  dateLabel,
  totals,
}: {
  filename: string;
  plan: MealPlan;
  targetCalories: number;
  objective: NutritionObjective;
  dateLabel: string;
  totals: Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat">;
}): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Meal plan PDF export requires a browser environment.");
  }

  const exportContainer = createMealPlanExportContainer(
    buildMealPlanPdfMarkup({
      plan,
      targetCalories,
      objective,
      dateLabel,
      totals,
    }),
  );

  document.body.appendChild(exportContainer);

  try {
    await waitForPdfRenderReady();
    const target = exportContainer.querySelector("[data-pdf-root='meal-plan']");
    if (!(target instanceof HTMLElement)) {
      throw new Error("Meal plan PDF root not found.");
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      width: target.scrollWidth,
      windowWidth: target.scrollWidth,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });

    addCanvasPagesToPdf(pdf, canvas, target);
    pdf.save(filename);
  } finally {
    exportContainer.remove();
  }
}
