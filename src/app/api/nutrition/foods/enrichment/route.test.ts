/** @jest-environment node */

jest.mock("@/modules/nutrition/repositories/nutrition-store", () => ({
  getNutritionStorageHeaders: jest.fn(),
}));

jest.mock("@/modules/nutrition/services/catalog-search.service", () => ({
  processQueuedFoodLookups: jest.fn(),
}));

import { GET, POST } from "@/app/api/nutrition/foods/enrichment/route";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { processQueuedFoodLookups } from "@/modules/nutrition/services/catalog-search.service";

const getNutritionStorageHeadersMock = jest.mocked(getNutritionStorageHeaders);
const processQueuedFoodLookupsMock = jest.mocked(processQueuedFoodLookups);

describe("nutrition enrichment route", () => {
  const originalIngestToken = process.env.NUTRITION_INGEST_TOKEN;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NUTRITION_INGEST_TOKEN;
    delete process.env.CRON_SECRET;
    getNutritionStorageHeadersMock.mockReturnValue({
      "x-nutrition-storage": "memory",
    });
  });

  afterAll(() => {
    process.env.NUTRITION_INGEST_TOKEN = originalIngestToken;
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("returns 503 when enrichment secrets are not configured", async () => {
    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/enrichment?limit=3", {
        headers: { Authorization: "Bearer anything" },
      }),
    );

    expect(response.status).toBe(503);
    expect(processQueuedFoodLookupsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Nutrition enrichment is not configured.",
    });
  });

  it("rejects unauthorized post requests before reading the body", async () => {
    process.env.NUTRITION_INGEST_TOKEN = "secret-token";

    const response = await POST(
      new Request("http://localhost/api/nutrition/foods/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid-json",
      }),
    );

    expect(response.status).toBe(401);
    expect(processQueuedFoodLookupsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("rejects invalid authorized payloads", async () => {
    process.env.NUTRITION_INGEST_TOKEN = "secret-token";

    const response = await POST(
      new Request("http://localhost/api/nutrition/foods/enrichment", {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: "abc" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(processQueuedFoodLookupsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      code: "nutrition_invalid_payload",
    });
  });

  it("processes authorized requests with the bounded query limit", async () => {
    process.env.CRON_SECRET = "cron-secret";
    processQueuedFoodLookupsMock.mockResolvedValue({
      processed: 2,
      remaining: 1,
      failed: 0,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/nutrition/foods/enrichment?limit=99", {
        headers: { Authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(processQueuedFoodLookupsMock).toHaveBeenCalledWith(25);
    await expect(response.json()).resolves.toEqual({
      limit: 25,
      processed: 2,
      remaining: 1,
      failed: 0,
    });
  });
});
