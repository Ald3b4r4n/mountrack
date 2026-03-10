/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-require-imports */

const {
  parseArgs,
  runNutritionPersistenceValidation,
} = require("./validate-persistence");

function createJsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("nutrition persistence validation script", () => {
  it("parses CLI args for local validation defaults and overrides", () => {
    expect(parseArgs([], {})).toEqual({
      baseUrl: "http://localhost:3000",
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      primaryUserId: "preview-validation-primary",
      secondaryUserId: "preview-validation-secondary",
      ingestToken: "",
      skipEnrichment: false,
    });

    expect(
      parseArgs(
        [
          "--base-url",
          "https://example.com",
          "--date",
          "2026-03-10",
          "--primary-user",
          "user-a",
          "--secondary-user",
          "user-b",
          "--token",
          "secret",
          "--skip-enrichment",
        ],
        {},
      ),
    ).toEqual({
      baseUrl: "https://example.com",
      date: "2026-03-10",
      primaryUserId: "user-a",
      secondaryUserId: "user-b",
      ingestToken: "secret",
      skipEnrichment: true,
    });
  });

  it("validates database mode, scoped data, and enrichment auth flow", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          200,
          {
            diary: { waterIntakeMl: 0 },
          },
          {
            "x-nutrition-storage": "database",
          },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          goal: {
            targetCalories: 2345,
            targetWaterMl: 2600,
            targetProtein: 150,
            targetCarbs: 210,
            targetFat: 70,
            objective: "maintain",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          goal: {
            targetCalories: 2345,
            targetWaterMl: 2600,
            targetProtein: 150,
            targetCarbs: 210,
            targetFat: 70,
            objective: "maintain",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          diary: { waterIntakeMl: 900 },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          diary: { waterIntakeMl: 900 },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(201, {
          item: {
            id: "custom_food_validation",
            name: "Codex Validation Food",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          results: [{ id: "custom_food_validation", name: "Codex Validation Food" }],
          source: "custom",
          externalPending: false,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          results: [],
          source: "none",
          externalPending: false,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, {
          error: "Unauthorized",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          limit: 1,
          processed: 1,
          remaining: 0,
          failed: 0,
        }),
      );

    const result = await runNutritionPersistenceValidation({
      baseUrl: "http://localhost:3000",
      date: "2026-03-10",
      primaryUserId: "preview-demo-user",
      secondaryUserId: "preview-other-user",
      ingestToken: "secret-token",
      fetchImpl: fetchMock,
      runId: "20260310T120000",
    });

    expect(result.storage).toBe("database");
    expect(result.results.storage.status).toBe("pass");
    expect(result.results.goals.status).toBe("pass");
    expect(result.results.hydration.status).toBe("pass");
    expect(result.results.customFoodIsolation.status).toBe("pass");
    expect(result.results.enrichmentUnauthorized.status).toBe("pass");
    expect(result.results.enrichmentAuthorized.status).toBe("pass");
    expect(result.results.customFoodIsolation.createdFoodId).toBe("custom_food_validation");

    const firstRequestHeaders = fetchMock.mock.calls[0][1].headers;
    expect(firstRequestHeaders["x-dev-user-id"]).toBe("preview-demo-user");
    expect(firstRequestHeaders["x-dev-auth-mode"]).toBe("preview");

    const secondarySearchHeaders = fetchMock.mock.calls[7][1].headers;
    expect(secondarySearchHeaders["x-dev-user-id"]).toBe("preview-other-user");
  });

  it("fails fast when storage mode is not database", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      createJsonResponse(
        200,
        {
          diary: { waterIntakeMl: 0 },
        },
        {
          "x-nutrition-storage": "memory",
        },
      ),
    );

    await expect(
      runNutritionPersistenceValidation({
        baseUrl: "http://localhost:3000",
        date: "2026-03-10",
        primaryUserId: "preview-demo-user",
        secondaryUserId: "preview-other-user",
        fetchImpl: fetchMock,
        runId: "20260310T120000",
      }),
    ).rejects.toThrow("Expected nutrition storage to be database, received memory");
  });
});
