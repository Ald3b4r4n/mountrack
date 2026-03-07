import { authorizedNutritionFetch } from "@/modules/nutrition/client";

describe("authorizedNutritionFetch", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    const runtime = globalThis as typeof globalThis & { fetch?: typeof fetch };
    if (originalFetch) {
      runtime.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(runtime, "fetch");
    }
  });

  it("sends the bearer token when authentication is available", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true } as Response);
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as typeof fetch;

    await authorizedNutritionFetch(
      {
        uid: "user-1",
        devBypass: true,
        getIdToken: async () => "token-123",
      },
      "/api/nutrition/foods/search?q=banana",
    );

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("x-dev-user-id")).toBeNull();
    expect(headers.get("x-dev-auth-mode")).toBeNull();
  });

  it("sends the preview bypass headers when local preview mode is enabled", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true } as Response);
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as typeof fetch;

    await authorizedNutritionFetch(
      {
        uid: "preview-user",
        devBypass: true,
      },
      "/api/nutrition/diaries/2026-03-07",
      { method: "POST", body: JSON.stringify({}) },
    );

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("x-dev-user-id")).toBe("preview-user");
    expect(headers.get("x-dev-auth-mode")).toBe("preview");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not send preview bypass headers when bypass is disabled", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true } as Response);
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as typeof fetch;

    await authorizedNutritionFetch(
      {
        uid: "preview-user",
      },
      "/api/nutrition/history",
    );

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get("x-dev-user-id")).toBeNull();
    expect(headers.get("x-dev-auth-mode")).toBeNull();
  });
});
