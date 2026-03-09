import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getNutritionStorageHeaders } from "@/modules/nutrition/repositories/nutrition-store";
import { processQueuedFoodLookups } from "@/modules/nutrition/services/catalog-search.service";

export const runtime = "nodejs";

const DEFAULT_BATCH_LIMIT = 5;
const MAX_BATCH_LIMIT = 25;

function getConfiguredIngestTokens(): string[] {
  return [process.env.NUTRITION_INGEST_TOKEN, process.env.CRON_SECRET]
    .map((value) => value?.trim() || "")
    .filter(Boolean);
}

function isAuthorizedIngestRequest(request: Request, expectedTokens: string[]): boolean {
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-nutrition-ingest-token")?.trim();
  const providedToken = bearerToken || headerToken;

  if (!providedToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken);

  return expectedTokens.some((expectedToken) => {
    const expectedBuffer = Buffer.from(expectedToken);
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  });
}

function resolveBatchLimit(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_BATCH_LIMIT;
  }

  return Math.max(1, Math.min(MAX_BATCH_LIMIT, Math.trunc(numericValue)));
}

async function parseRequestPayload(request: Request): Promise<{ limit?: unknown }> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(rawBody) as { limit?: unknown };
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function resolveLimitFromRequest(request: Request, payloadLimit?: unknown): number {
  const url = new URL(request.url);
  const urlLimit = url.searchParams.get("limit");
  return resolveBatchLimit(payloadLimit ?? urlLimit ?? DEFAULT_BATCH_LIMIT);
}

async function handleAuthorizedEnrichment(request: Request, payloadLimit?: unknown) {
  const ingestTokens = getConfiguredIngestTokens();
  if (!ingestTokens.length) {
    return NextResponse.json(
      { error: "Nutrition enrichment is not configured." },
      { status: 503, headers: getNutritionStorageHeaders() },
    );
  }

  if (!isAuthorizedIngestRequest(request, ingestTokens)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: getNutritionStorageHeaders() },
    );
  }

  try {
    const limit = resolveLimitFromRequest(request, payloadLimit);
    const result = await processQueuedFoodLookups(limit);

    return NextResponse.json(
      {
        limit,
        ...result,
      },
      { headers: getNutritionStorageHeaders() },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected enrichment failure",
      },
      { status: 500, headers: getNutritionStorageHeaders() },
    );
  }
}

export async function GET(request: Request) {
  return handleAuthorizedEnrichment(request);
}

export async function POST(request: Request) {
  const payload = await parseRequestPayload(request);
  return handleAuthorizedEnrichment(request, payload.limit);
}
