import assert from "node:assert/strict";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const MOBILE_VIEWPORT = { width: 375, height: 812 };

function getOptionValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  if (!matched) return fallback;
  return matched.slice(prefix.length);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function ensureRouteAvailable(baseUrl, routePath) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    redirect: "follow",
  }).catch(() => null);

  assert(
    response && response.ok,
    `Route ${routePath} is unavailable at ${baseUrl}. Start the app with \"npm run dev\" first.`,
  );
}

async function run() {
  const baseUrl = getOptionValue(
    "base-url",
    process.env.BASE_URL ?? DEFAULT_BASE_URL,
  );
  const headed = hasFlag("headed") || process.env.HEADLESS === "0";
  const requireHomeCta = hasFlag("require-home-cta");

  await ensureRouteAvailable(baseUrl, "/");
  await ensureRouteAvailable(baseUrl, "/suporte");

  const browser = await chromium.launch({ headless: !headed });

  try {
    const context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      screen: MOBILE_VIEWPORT,
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const homeUrlAfterLoad = page.url();

    const loginVisible = await page
      .getByRole("button", { name: /Continuar com Google/i })
      .isVisible()
      .catch(() => false);
    const redirectedToLogin = /\/login(?:[/?#]|$)/i.test(homeUrlAfterLoad);

    const supportLinks = page.locator('a[href="/suporte"]');
    const supportLinkCount = await supportLinks.count();

    let homeCtaChecked = false;
    let homeCtaVisible = false;
    let homeCtaClicked = false;
    let homeCheckSkippedReason = null;

    if (supportLinkCount > 0) {
      const firstSupportLink = supportLinks.first();
      homeCtaVisible = await firstSupportLink.isVisible().catch(() => false);
      homeCtaChecked = true;

      if (homeCtaVisible) {
        await firstSupportLink.click();
        await page.waitForURL(/\/suporte/, { timeout: 10000 });
        homeCtaClicked = true;
      }
    } else {
      homeCheckSkippedReason =
        loginVisible || redirectedToLogin
          ? "Home support CTA not available without authenticated session."
          : "No /suporte CTA rendered on current home state.";
    }

    if (requireHomeCta) {
      assert(
        homeCtaChecked && homeCtaVisible && homeCtaClicked,
        `Home support CTA check failed. ${homeCheckSkippedReason ?? "CTA was not visible/clickable."}`,
      );
    }

    if (!homeCtaClicked) {
      await page.goto(`${baseUrl}/suporte`, { waitUntil: "domcontentloaded" });
    }

    await page
      .getByRole("heading", { name: /Suporte/i })
      .waitFor({ timeout: 10000 });

    const whatsappLink = page.locator('a[href^="https://wa.me/"]');
    const emailLink = page.locator('a[href^="mailto:"]');
    const phoneLink = page.locator('a[href^="tel:"]');

    await whatsappLink.first().waitFor({ timeout: 10000 });
    await emailLink.first().waitFor({ timeout: 10000 });
    await phoneLink.first().waitFor({ timeout: 10000 });

    const result = {
      ok: true,
      baseUrl,
      viewport: MOBILE_VIEWPORT,
      home: {
        urlAfterLoad: homeUrlAfterLoad,
        loginVisible,
        redirectedToLogin,
        supportLinkCount,
        ctaChecked: homeCtaChecked,
        ctaVisible: homeCtaVisible,
        ctaClicked: homeCtaClicked,
        skippedReason: homeCheckSkippedReason,
      },
      supportPage: {
        url: await page.url(),
        hasHeading: true,
        hasWhatsAppLink: (await whatsappLink.count()) > 0,
        hasEmailLink: (await emailLink.count()) > 0,
        hasPhoneLink: (await phoneLink.count()) > 0,
      },
    };

    console.log(JSON.stringify(result, null, 2));
    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
