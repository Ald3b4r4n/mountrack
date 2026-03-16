import type { FoodItem } from "@/modules/nutrition/domain/types";
import { normalizeFatSecretFood } from "@/modules/nutrition/normalizers/normalize-food";

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";
const FATSECRET_TIMEOUT_MS = 2400;

type FatSecretTokenCache = {
  accessToken: string;
  expiresAt: number;
};

const globalFatSecretState = globalThis as typeof globalThis & {
  __fatSecretTokenCache__?: FatSecretTokenCache;
};

function getFatSecretCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.FATSECRET_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET?.trim() ?? "";

  if (!clientId || !clientSecret) {
    console.warn(
      "[FatSecret] Missing credentials: clientId=" +
        (clientId ? "set" : "missing") +
        ", clientSecret=" +
        (clientSecret ? "set" : "missing"),
    );
    return null;
  }

  return { clientId, clientSecret };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FATSECRET_TIMEOUT_MS,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getFatSecretAccessToken(): Promise<string | null> {
  const credentials = getFatSecretCredentials();
  if (!credentials) {
    console.warn("[FatSecret] No credentials provided");
    return null;
  }

  const cached = globalFatSecretState.__fatSecretTokenCache__;
  if (cached && cached.expiresAt > Date.now() + 5000) {
    console.debug("[FatSecret] Using cached token");
    return cached.accessToken;
  }

  const basicAuth = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "basic",
  });

  const response = await fetchWithTimeout(FATSECRET_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response?.ok) {
    console.error(
      "[FatSecret] Token request failed:",
      response?.status,
      response?.statusText,
    );
    return null;
  }

  try {
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      console.error("[FatSecret] No access token in response", payload);
      return null;
    }

    const ttlMs = Math.max(10, payload.expires_in ?? 3600) * 1000;
    globalFatSecretState.__fatSecretTokenCache__ = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + ttlMs,
    };

    console.debug("[FatSecret] Got new access token");
    return payload.access_token;
  } catch (error) {
    console.error("[FatSecret] Error parsing token response:", error);
    return null;
  }
}

function parseFoodsFromPayload(payload: unknown): FoodItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  // Check for API errors in response
  const errorPayload = payload as {
    error?: { code?: number; message?: string };
  };
  if (errorPayload.error) {
    console.error("[FatSecret] API error:", errorPayload.error);
    return [];
  }

  const foodsNode = (payload as { foods?: { food?: unknown } }).foods?.food;
  const foodEntries = Array.isArray(foodsNode)
    ? foodsNode
    : foodsNode
      ? [foodsNode]
      : [];

  return foodEntries
    .map((foodEntry) =>
      normalizeFatSecretFood(foodEntry as Record<string, unknown>),
    )
    .filter((food): food is FoodItem => Boolean(food));
}

async function callFatSecretApi(
  method: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const accessToken = await getFatSecretAccessToken();
  if (!accessToken) {
    console.warn(`[FatSecret] No access token for method: ${method}`);
    return null;
  }

  const body = new URLSearchParams({
    method,
    format: "json",
    ...params,
  });

  const response = await fetchWithTimeout(FATSECRET_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response?.ok) {
    console.error(
      `[FatSecret] Request failed for method ${method}:`,
      response?.status,
      response?.statusText,
    );
    return null;
  }

  try {
    const payload = (await response.json()) as unknown;
    console.debug(`[FatSecret] Got response for method: ${method}`);
    return payload;
  } catch (error) {
    console.error(
      `[FatSecret] Failed to parse response for method ${method}:`,
      error,
    );
    return null;
  }
}

export async function searchFatSecretFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) {
    return [];
  }

  console.debug(`[FatSecret] Searching for: "${query}"`);

  const payload = await callFatSecretApi("foods.search.v3", {
    search_expression: query.trim(),
    max_results: "8",
    page_number: "0",
  });

  if (payload) {
    const foods = parseFoodsFromPayload(payload);
    if (foods.length) {
      console.debug(`[FatSecret] Found ${foods.length} foods for "${query}"`);
      return foods;
    }
  }

  console.debug(`[FatSecret] Fallback search for: "${query}"`);
  const fallbackPayload = await callFatSecretApi("foods.search", {
    search_expression: query.trim(),
    max_results: "8",
    page_number: "0",
  });

  const fallbackResults = parseFoodsFromPayload(fallbackPayload);
  console.debug(
    `[FatSecret] Fallback found ${fallbackResults.length} foods for "${query}"`,
  );
  return fallbackResults;
}

function normalizeBarcodeCandidate(value: string): string {
  return value.replace(/\D/g, "");
}

export async function fetchFatSecretBarcode(
  barcode: string,
): Promise<FoodItem | null> {
  const normalizedBarcode = normalizeBarcodeCandidate(barcode);
  if (!normalizedBarcode) {
    console.debug(`[FatSecret] Invalid barcode format: "${barcode}"`);
    return null;
  }

  console.debug(`[FatSecret] Looking up barcode: ${normalizedBarcode}`);

  const directMatchPayload = await callFatSecretApi(
    "food.find_id_for_barcode",
    {
      barcode: normalizedBarcode,
    },
  );

  const foundFoodId = (
    directMatchPayload as {
      food_id?: { value?: string | number } | string | number;
    } | null
  )?.food_id;

  const resolvedFoodId =
    typeof foundFoodId === "object" && foundFoodId
      ? String((foundFoodId as { value?: string | number }).value ?? "")
      : foundFoodId != null
        ? String(foundFoodId)
        : "";

  if (resolvedFoodId) {
    console.debug(
      `[FatSecret] Found food ID ${resolvedFoodId} for barcode ${normalizedBarcode}`,
    );
    const detailPayload = await callFatSecretApi("food.get.v4", {
      food_id: resolvedFoodId,
    });

    const detailFood = (
      detailPayload as { food?: Record<string, unknown> } | null
    )?.food;
    const normalized = detailFood ? normalizeFatSecretFood(detailFood) : null;

    if (normalized) {
      normalized.barcode = normalized.barcode ?? normalizedBarcode;
      console.debug(
        `[FatSecret] Returning food: ${normalized.name} for barcode ${normalizedBarcode}`,
      );
      return normalized;
    }
  }

  console.debug(`[FatSecret] No direct match, searching by barcode number`);
  const searchPayload = await callFatSecretApi("foods.search", {
    search_expression: normalizedBarcode,
    max_results: "5",
    page_number: "0",
  });

  const candidates = parseFoodsFromPayload(searchPayload);
  const strictMatch =
    candidates.find(
      (food) => food.barcode?.replace(/\D/g, "") === normalizedBarcode,
    ) ??
    candidates[0] ??
    null;

  if (strictMatch && !strictMatch.barcode) {
    strictMatch.barcode = normalizedBarcode;
  }

  if (!strictMatch) {
    console.debug(
      `[FatSecret] No match found for barcode: ${normalizedBarcode}`,
    );
  } else {
    console.debug(
      `[FatSecret] Found match via search: ${strictMatch.name} for barcode ${normalizedBarcode}`,
    );
  }

  return strictMatch;
}
