import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";
const FATSECRET_SCOPE = process.env.FATSECRET_SCOPE || "basic";
const PROXY_SHARED_SECRET = process.env.PROXY_SHARED_SECRET || "";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 6500);

const ALLOWED_METHODS = new Set([
  "foods.search",
  "foods.search.v3",
  "food.find_id_for_barcode",
  "food.get.v4",
]);

let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function nowMs() {
  return Date.now();
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getCredentials() {
  const clientId = (process.env.FATSECRET_CLIENT_ID || "").trim();
  const clientSecret = (process.env.FATSECRET_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET");
  }

  return { clientId, clientSecret };
}

async function getAccessToken() {
  if (tokenCache.accessToken && tokenCache.expiresAt > nowMs() + 5000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: FATSECRET_SCOPE,
  });

  const startedAt = nowMs();
  const response = await fetchWithTimeout(FATSECRET_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Token request failed (${response.status}): ${text.slice(0, 250)}`,
    );
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Token response missing access_token");
  }

  const ttlMs = Math.max(10, Number(payload.expires_in || 3600)) * 1000;
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: nowMs() + ttlMs,
  };

  console.log(
    `[Proxy] New token in ${nowMs() - startedAt}ms (scope=${FATSECRET_SCOPE})`,
  );
  return tokenCache.accessToken;
}

async function callFatSecret(method, params) {
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Method not allowed: ${method}`);
  }

  const accessToken = await getAccessToken();
  const body = new URLSearchParams({
    method,
    format: "json",
    ...params,
  });

  const startedAt = nowMs();
  const response = await fetchWithTimeout(FATSECRET_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const duration = nowMs() - startedAt;
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `FatSecret ${method} failed (${response.status}) in ${duration}ms: ${text.slice(0, 300)}`,
    );
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`FatSecret ${method} invalid JSON in ${duration}ms`);
  }

  console.log(`[Proxy] FatSecret ${method} in ${duration}ms`);
  return payload;
}

function ensureAuthorized(req) {
  if (!PROXY_SHARED_SECRET) {
    return true;
  }

  const received = req.headers["x-proxy-secret"];
  if (typeof received !== "string" || received !== PROXY_SHARED_SECRET) {
    return false;
  }

  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, {
        ok: true,
        uptimeSec: Math.round(process.uptime()),
        tokenCached: Boolean(tokenCache.accessToken),
      });
    }

    if (req.method === "POST" && req.url === "/fatsecret/call") {
      if (!ensureAuthorized(req)) {
        return json(res, 401, { ok: false, error: "Unauthorized" });
      }

      const body = await readJsonBody(req);
      const method = String(body.method || "").trim();
      const params =
        body.params && typeof body.params === "object" ? body.params : {};

      if (!method) {
        return json(res, 400, { ok: false, error: "Missing method" });
      }

      const payload = await callFatSecret(method, params);
      return json(res, 200, payload);
    }

    return json(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Proxy] FatSecret proxy listening on :${PORT}`);
});
