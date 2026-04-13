import { searchFatSecretFoods } from "@/modules/nutrition/providers/fatsecret";

type ProxyRequestBody = {
  method?: string;
  params?: Record<string, string>;
};

type FatSecretScalar = string | number | { value?: string | number };

function makeFetchResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  } as Response;
}

function makeFatSecretFood(
  id: FatSecretScalar,
  name: FatSecretScalar,
): Record<string, unknown> {
  return {
    food_id: id,
    food_name: name,
    food_type: "Generic",
    serving_description: "100 g",
    servings: {
      serving: {
        metric_serving_amount: "100",
        metric_serving_unit: "g",
        calories: "120",
        protein: "6",
        carbohydrate: "21",
        fat: "1",
      },
    },
  };
}

function makeV3Payload(foods: Array<Record<string, unknown>>): unknown {
  return {
    foods_search: {
      results: {
        food: foods,
      },
    },
  };
}

function makeClassicPayload(foods: Array<Record<string, unknown>>): unknown {
  return {
    foods: {
      food: foods,
    },
  };
}

describe("fatsecret provider", () => {
  const originalProxyBaseUrl = process.env.FATSECRET_PROXY_BASE_URL;
  const originalProxySecret = process.env.FATSECRET_PROXY_SHARED_SECRET;
  const originalFetch = globalThis.fetch;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    process.env.FATSECRET_PROXY_BASE_URL = "http://proxy.local";
    delete process.env.FATSECRET_PROXY_SHARED_SECRET;
    fetchSpy = jest.fn();
    (globalThis as { fetch?: typeof fetch }).fetch =
      fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    }

    if (originalProxyBaseUrl == null) {
      delete process.env.FATSECRET_PROXY_BASE_URL;
    } else {
      process.env.FATSECRET_PROXY_BASE_URL = originalProxyBaseUrl;
    }

    if (originalProxySecret == null) {
      delete process.env.FATSECRET_PROXY_SHARED_SECRET;
    } else {
      process.env.FATSECRET_PROXY_SHARED_SECRET = originalProxySecret;
    }
  });

  it("merges v3 and classic search results with dedupe", async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      const method = body.method ?? "";
      const expression = body.params?.search_expression ?? "";
      const page = body.params?.page_number ?? "0";

      if (
        method === "foods.search.v3" &&
        expression === "feijao" &&
        page === "0"
      ) {
        return makeFetchResponse(
          makeV3Payload([
            makeFatSecretFood({ value: "1" }, { value: "Feijao" }),
          ]),
        );
      }

      if (
        method === "foods.search" &&
        expression === "feijao" &&
        page === "0"
      ) {
        return makeFetchResponse(
          makeClassicPayload([
            makeFatSecretFood({ value: "1" }, { value: "Feijao" }),
            makeFatSecretFood({ value: "2" }, { value: "Feijao preto cozido" }),
            makeFatSecretFood(
              { value: "3" },
              { value: "Feijao carioca cozido" },
            ),
          ]),
        );
      }

      return makeFetchResponse(makeClassicPayload([]));
    });

    const results = await searchFatSecretFoods("feijao");

    expect(results.map((item) => item.id)).toEqual([
      "fatsecret-1",
      "fatsecret-2",
      "fatsecret-3",
    ]);
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("tries a normalized search expression when the original expression misses", async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      const method = body.method ?? "";
      const expression = body.params?.search_expression ?? "";
      const page = body.params?.page_number ?? "0";

      if (page !== "0") {
        return makeFetchResponse(makeClassicPayload([]));
      }

      if (method === "foods.search" && expression === "feijao preto") {
        return makeFetchResponse(
          makeClassicPayload([
            makeFatSecretFood("10", "Feijao preto"),
            makeFatSecretFood("11", "Feijao preto cozido"),
          ]),
        );
      }

      return makeFetchResponse(makeClassicPayload([]));
    });

    const results = await searchFatSecretFoods("feijao   preto");

    expect(results.map((item) => item.id)).toEqual([
      "fatsecret-10",
      "fatsecret-11",
    ]);

    const expressionsQueried = fetchSpy.mock.calls.map(([, init]) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      return body.params?.search_expression ?? "";
    });

    expect(expressionsQueried).toContain("feijao   preto");
    expect(expressionsQueried).toContain("feijao preto");
  });

  it("requests localized FatSecret search with region BR and language pt", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse(makeClassicPayload([])));

    await searchFatSecretFoods("arroz");

    const requestedParams = fetchSpy.mock.calls.map(([, init]) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      return body.params ?? {};
    });

    expect(requestedParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          search_expression: "arroz",
          region: "BR",
          language: "pt",
        }),
      ]),
    );
  });

  it("does not mark default FatSecret fallback results as Brazilian", async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      const method = body.method ?? "";
      const params = body.params ?? {};

      if (params.region === "BR") {
        return makeFetchResponse(makeClassicPayload([]));
      }

      if (method === "foods.search" && params.page_number === "0") {
        return makeFetchResponse(
          makeClassicPayload([makeFatSecretFood("100", "Long Grain Rice")]),
        );
      }

      return makeFetchResponse(makeClassicPayload([]));
    });

    const results = await searchFatSecretFoods("arroz");

    expect(results[0]?.id).toBe("fatsecret-100");
    expect(results[0]?.countryCode).toBeUndefined();
    expect(results[0]?.locale).toBeUndefined();
  });

  it("keeps localized FatSecret results before default fallback results", async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as ProxyRequestBody;
      const method = body.method ?? "";
      const params = body.params ?? {};

      if (
        method === "foods.search.v3" &&
        params.region === "BR" &&
        params.page_number === "0"
      ) {
        return makeFetchResponse(
          makeV3Payload([makeFatSecretFood("200", "Arroz integral")]),
        );
      }

      if (
        method === "foods.search" &&
        !params.region &&
        params.page_number === "0"
      ) {
        return makeFetchResponse(
          makeClassicPayload([makeFatSecretFood("201", "Brown Rice")]),
        );
      }

      return makeFetchResponse(makeClassicPayload([]));
    });

    const results = await searchFatSecretFoods("arroz");

    expect(results.map((item) => item.id).slice(0, 2)).toEqual([
      "fatsecret-200",
      "fatsecret-201",
    ]);
    expect(results[0]?.countryCode).toBe("BR");
    expect(results[1]?.countryCode).toBeUndefined();
  });
});
