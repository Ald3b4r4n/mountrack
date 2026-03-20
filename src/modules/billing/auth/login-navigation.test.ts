import {
  buildLoginNavigationUrl,
  buildLoginPath,
  needsLocalAuthHost,
  sanitizeNextPath,
} from "@/modules/billing/auth/login-navigation";

describe("login-navigation", () => {
  it("keeps only internal next paths", () => {
    expect(sanitizeNextPath("/subscribe")).toBe("/subscribe");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
  });

  it("builds the login path with the next destination", () => {
    expect(buildLoginPath("/subscribe")).toBe("/login?next=%2Fsubscribe");
  });

  it("switches preview auth navigation from 127.0.0.1 to localhost", () => {
    expect(
      buildLoginNavigationUrl(
        {
          href: "http://127.0.0.1:3003/subscribe",
          hostname: "127.0.0.1",
        },
        "/subscribe",
      ),
    ).toBe("http://localhost:3003/login?next=%2Fsubscribe");
  });

  it("keeps normal navigation relative outside the preview host", () => {
    expect(
      buildLoginNavigationUrl(
        {
          href: "https://mountrack.vercel.app/subscribe",
          hostname: "mountrack.vercel.app",
        },
        "/subscribe",
      ),
    ).toBe("/login?next=%2Fsubscribe");

    expect(
      needsLocalAuthHost({
        href: "https://mountrack.vercel.app/subscribe",
        hostname: "mountrack.vercel.app",
      }),
    ).toBe(false);
  });
});
