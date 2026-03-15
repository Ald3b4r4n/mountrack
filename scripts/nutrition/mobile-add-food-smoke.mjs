import assert from "node:assert/strict";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const MOBILE_VIEWPORT = { width: 393, height: 852 };

function getOptionValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const matched = process.argv.find((argument) => argument.startsWith(prefix));
  if (!matched) {
    return fallback;
  }

  return matched.slice(prefix.length);
}

function parseMetric(text, pattern) {
  const match = text.match(pattern);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

async function verifyBaseUrl(baseUrl) {
  const response = await fetch(`${baseUrl}/nutrition?preview=1`, {
    redirect: "follow",
  }).catch(() => null);

  assert(
    response && response.ok,
    `Preview route is unavailable at ${baseUrl}. Start the app with "npm run dev" first.`,
  );
}

async function run() {
  const baseUrl = getOptionValue("base-url", process.env.BASE_URL ?? DEFAULT_BASE_URL);
  const headed = process.argv.includes("--headed") || process.env.HEADLESS === "0";

  await verifyBaseUrl(baseUrl);

  const browser = await chromium.launch({ headless: !headed });

  try {
    const context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      screen: MOBILE_VIEWPORT,
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/nutrition?preview=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /^Hoje$/i }).waitFor();

    const initialConsumedCard = page.getByRole("button", { name: /Consumido/i });
    const initialActiveMealCard = page.locator("article").filter({ hasText: "Agora" }).first();
    await initialConsumedCard.waitFor();
    await initialActiveMealCard.waitFor();

    const initialConsumedText = (await initialConsumedCard.textContent()) ?? "";
    const initialActiveMealText = (await initialActiveMealCard.textContent()) ?? "";
    const initialConsumedCalories = parseMetric(initialConsumedText, /(\d+)\s*kcal/i) ?? 0;
    const initialMealItems = parseMetric(initialActiveMealText, /(\d+)\s*item\(ns\)/i) ?? 0;

    await page.getByRole("button", { name: /^Adicionar$/i }).click();
    await page.getByRole("heading", { name: /Buscar e registrar/i }).waitFor();

    const searchInput = page.getByRole("textbox", { name: /Nome do alimento/i });
    await searchInput.fill("banana");
    await searchInput.press("Enter");

    await page.getByRole("button", { name: /^Banana prata/i }).waitFor();
    await page.getByRole("button", { name: /^Banana prata/i }).click();

    await page.getByRole("button", { name: /Registrar em Café da manhã/i }).click();
    await page.getByRole("dialog", { name: /Registrar no diário/i }).waitFor();
    await page.getByRole("button", { name: /Adicionar ao diário em Café da manhã/i }).click();

    const consumedCard = page.getByRole("button", { name: /Consumido/i });
    const activeMealCard = page.locator("article").filter({ hasText: "Registrado agora" }).first();

    await consumedCard.waitFor();
    await activeMealCard.waitFor();

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyText: document.body.innerText,
    }));
    const consumedText = (await consumedCard.textContent()) ?? "";
    const activeMealText = (await activeMealCard.textContent()) ?? "";

    assert(
      metrics.documentScrollWidth <= metrics.innerWidth + 1,
      `Horizontal overflow detected: document width ${metrics.documentScrollWidth} > viewport ${metrics.innerWidth}.`,
    );
    assert(
      metrics.bodyScrollWidth <= metrics.innerWidth + 1,
      `Body overflow detected: body width ${metrics.bodyScrollWidth} > viewport ${metrics.innerWidth}.`,
    );
    assert(
      activeMealText.includes("Registrado agora") && activeMealText.includes("Banana prata"),
      `The mobile summary did not show the freshly registered food. Active meal card: ${JSON.stringify(activeMealText)}`,
    );
    assert(
      activeMealText.includes("Atualizado"),
      `The mobile summary did not mark the meal as refreshed. Active meal card: ${JSON.stringify(activeMealText)}`,
    );

    const consumedCalories = parseMetric(consumedText, /(\d+)\s*kcal/i) ?? 0;
    const mealItems = parseMetric(activeMealText, /(\d+)\s*item\(ns\)/i) ?? 0;

    assert(
      consumedCalories > initialConsumedCalories,
      `The consumed calories did not increase after registration. Before: ${initialConsumedCalories}, after: ${consumedCalories}. Consumed card: ${JSON.stringify(consumedText)}`,
    );
    assert(
      mealItems > initialMealItems,
      `The active meal item count did not increase after registration. Before: ${initialMealItems}, after: ${mealItems}. Active meal card: ${JSON.stringify(activeMealText)}`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          viewport: MOBILE_VIEWPORT,
          initialConsumedCalories,
          consumedCalories,
          initialMealItems,
          mealItems,
          innerWidth: metrics.innerWidth,
          documentScrollWidth: metrics.documentScrollWidth,
          bodyScrollWidth: metrics.bodyScrollWidth,
        },
        null,
        2,
      ),
    );

    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
