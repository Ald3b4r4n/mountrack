/** @jest-environment node */

import { resolveBillingAppBaseUrl } from "@/modules/billing/config/mercado-pago";

describe("resolveBillingAppBaseUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("normalizes scheme-relative APP_BASE_URL values", () => {
    process.env.APP_BASE_URL = "//mountrack.vercel.app";

    expect(resolveBillingAppBaseUrl("http://localhost:3000/api/billing/checkout")).toBe(
      "https://mountrack.vercel.app",
    );
  });

  it("normalizes bare host APP_BASE_URL values", () => {
    process.env.APP_BASE_URL = "mountrack.vercel.app";

    expect(resolveBillingAppBaseUrl("http://localhost:3000/api/billing/checkout")).toBe(
      "https://mountrack.vercel.app",
    );
  });

  it("keeps explicit scheme values untouched", () => {
    process.env.APP_BASE_URL = "https://mountrack.vercel.app";

    expect(resolveBillingAppBaseUrl("http://localhost:3000/api/billing/checkout")).toBe(
      "https://mountrack.vercel.app",
    );
  });

  it("falls back to request URL origin when env candidates are invalid", () => {
    process.env.APP_BASE_URL = "not a url";

    expect(resolveBillingAppBaseUrl("http://localhost:3000/api/billing/checkout")).toBe(
      "http://localhost:3000",
    );
  });
});
