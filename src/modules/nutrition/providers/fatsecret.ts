import type { FoodItem } from "@/modules/nutrition/domain/types";
import { normalizeFatSecretFood } from "@/modules/nutrition/normalizers/normalize-food";

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";
const FATSECRET_TIMEOUT_MS = 2400;
const FATSECRET_SEARCH_PAGE_SIZE = 25;
const FATSECRET_SEARCH_TARGET_RESULTS = 8;
const FATSECRET_SEARCH_RETURN_LIMIT = 20;
const FATSECRET_PAGE_ONE_FALLBACK_THRESHOLD = 1;

type FatSecretSearchPass = {
  label: string;
  extraParams: Record<string, string>;
};

function getFatSecretProxyConfig(): {
  baseUrl: string;
  sharedSecret?: string;
} | null {
  const baseUrl = process.env.FATSECRET_PROXY_BASE_URL?.trim() ?? "";
  if (!baseUrl) {
    return null;
  }

  const sharedSecret = process.env.FATSECRET_PROXY_SHARED_SECRET?.trim();
  return { baseUrl: baseUrl.replace(/\/+$/, ""), sharedSecret };
}

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
    console.error(
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
    console.error("[FatSecret] No credentials provided");
    return null;
  }

  const cached = globalFatSecretState.__fatSecretTokenCache__;
  if (cached && cached.expiresAt > Date.now() + 5000) {
    console.log("[FatSecret] Using cached token");
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

    console.log("[FatSecret] Got new access token");
    return payload.access_token;
  } catch (error) {
    console.error("[FatSecret] Error parsing token response:", error);
    return null;
  }
}

function parseFoodsFromPayload(payload: unknown): FoodItem[] {
  if (!payload || typeof payload !== "object") {
    console.error("[FatSecret] Empty or invalid payload:", payload);
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

  // Handle v3 API response structure: foods_search.results.food
  const v3Payload = payload as {
    foods_search?: { results?: { food?: unknown } };
  };
  let foodsNode = v3Payload.foods_search?.results?.food;

  // Fallback to basic API response structure: foods.food
  if (!foodsNode) {
    foodsNode = (payload as { foods?: { food?: unknown } }).foods?.food;
  }

  if (!foodsNode) {
    console.log(
      "[FatSecret] No foods node in payload. Full payload:",
      JSON.stringify(payload).slice(0, 200),
    );
    return [];
  }

  const foodEntries = Array.isArray(foodsNode)
    ? foodsNode
    : foodsNode
      ? [foodsNode]
      : [];

  console.log(`[FatSecret] Got ${foodEntries.length} raw food entries`);

  return foodEntries
    .map((foodEntry) =>
      normalizeFatSecretFood(foodEntry as Record<string, unknown>),
    )
    .filter((food): food is FoodItem => Boolean(food));
}

function dedupeFoodsById(foods: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();
  return foods.filter((food) => {
    if (seen.has(food.id)) {
      return false;
    }

    seen.add(food.id);
    return true;
  });
}

function normalizeSearchExpression(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchExpressions(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const normalized = normalizeSearchExpression(trimmed);
  const expressions = new Set<string>([trimmed]);

  if (normalized) {
    expressions.add(normalized);
  }

  const normalizedTokens = normalized
    ? normalized.split(/\s+/).filter(Boolean)
    : [];
  const hasBeanIntent = normalizedTokens.some(
    (token) => token === "feijao" || token === "feijoes",
  );

  if (hasBeanIntent) {
    expressions.add("beans");
    expressions.add("black beans");
    expressions.add("pinto beans");
  }

  return Array.from(expressions);
}

function resolvePreferredLocaleParams(): Record<string, string> {
  const language = process.env.FATSECRET_SEARCH_LANGUAGE?.trim() || "pt";
  const region = process.env.FATSECRET_SEARCH_REGION?.trim() || "BR";

  const params: Record<string, string> = {};
  if (language) {
    params.language = language;
  }

  if (region) {
    params.region = region;
  }

  return params;
}

function buildSearchPasses(): FatSecretSearchPass[] {
  const localeParams = resolvePreferredLocaleParams();
  const hasLocaleHints = Object.keys(localeParams).length > 0;

  if (!hasLocaleHints) {
    return [{ label: "default", extraParams: {} }];
  }

  return [
    { label: "localized", extraParams: localeParams },
    { label: "default", extraParams: {} },
  ];
}

async function callFatSecretApi(
  method: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const proxyConfig = getFatSecretProxyConfig();
  if (proxyConfig) {
    const startedAt = Date.now();
    const proxyHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (proxyConfig.sharedSecret) {
      proxyHeaders["x-proxy-secret"] = proxyConfig.sharedSecret;
    }

    const proxyResponse = await fetchWithTimeout(
      `${proxyConfig.baseUrl}/fatsecret/call`,
      {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify({ method, params }),
      },
      FATSECRET_TIMEOUT_MS + 2200,
    );

    if (proxyResponse?.ok) {
      try {
        const proxyPayload = (await proxyResponse.json()) as unknown;
        const durationMs = Date.now() - startedAt;
        console.log(
          `[FatSecret] Proxy response for ${method} in ${durationMs}ms`,
        );
        return proxyPayload;
      } catch (error) {
        console.error("[FatSecret] Proxy payload parse error:", error);
      }
    } else {
      console.error(
        `[FatSecret] Proxy request failed for ${method}: ${proxyResponse?.status ?? "no-response"}. Not falling back to direct call (proxy required).`,
      );
      return null;
    }
  }

  const startedAt = Date.now();
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

  const durationMs = Date.now() - startedAt;

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
    console.log(
      `[FatSecret] Got response for method: ${method} in ${durationMs}ms`,
    );
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
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const searchExpressions = buildSearchExpressions(trimmedQuery);
  const searchPasses = buildSearchPasses();
  let mergedResults: FoodItem[] = [];

  console.log(
    `[FatSecret] Searching for: "${trimmedQuery}" (${searchExpressions.join(", ")})`,
  );

  const collectMethodResults = async (
    method: "foods.search.v3" | "foods.search",
    expression: string,
    searchPass: FatSecretSearchPass,
    pageNumber = 0,
  ): Promise<void> => {
    const payload = await callFatSecretApi(method, {
      search_expression: expression,
      max_results: String(FATSECRET_SEARCH_PAGE_SIZE),
      page_number: String(pageNumber),
      ...searchPass.extraParams,
    });
    const foods = parseFoodsFromPayload(payload);

    if (!foods.length) {
      console.log(
        `[FatSecret] ${method}(${searchPass.label}) expression="${expression}" page=${pageNumber} -> 0`,
      );
      return;
    }

    mergedResults = dedupeFoodsById([...mergedResults, ...foods]);
    console.log(
      `[FatSecret] ${method}(${searchPass.label}) expression="${expression}" page=${pageNumber} -> +${foods.length} (unique=${mergedResults.length})`,
    );
  };

  for (const expression of searchExpressions) {
    for (const searchPass of searchPasses) {
      await collectMethodResults("foods.search.v3", expression, searchPass, 0);
      await collectMethodResults("foods.search", expression, searchPass, 0);

      if (mergedResults.length >= FATSECRET_SEARCH_TARGET_RESULTS) {
        break;
      }
    }

    if (mergedResults.length >= FATSECRET_SEARCH_TARGET_RESULTS) {
      break;
    }
  }

  if (mergedResults.length <= FATSECRET_PAGE_ONE_FALLBACK_THRESHOLD) {
    for (const expression of searchExpressions) {
      for (const searchPass of searchPasses) {
        await collectMethodResults("foods.search", expression, searchPass, 1);
        if (mergedResults.length > FATSECRET_PAGE_ONE_FALLBACK_THRESHOLD) {
          break;
        }
      }

      if (mergedResults.length > FATSECRET_PAGE_ONE_FALLBACK_THRESHOLD) {
        break;
      }
    }
  }

  const results = mergedResults.slice(0, FATSECRET_SEARCH_RETURN_LIMIT);
  console.log(
    `[FatSecret] Returning ${results.length} foods for "${trimmedQuery}"`,
  );
  return results;
}

function normalizeBarcodeCandidate(value: string): string {
  return value.replace(/\D/g, "");
}

export async function fetchFatSecretBarcode(
  barcode: string,
): Promise<FoodItem | null> {
  const normalizedBarcode = normalizeBarcodeCandidate(barcode);
  if (!normalizedBarcode) {
    console.log(`[FatSecret] Invalid barcode format: "${barcode}"`);
    return null;
  }

  console.log(`[FatSecret] Looking up barcode: ${normalizedBarcode}`);

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
