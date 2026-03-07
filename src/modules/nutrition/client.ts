import type { User } from "firebase/auth";

interface NutritionAuthLike {
  uid: string;
  getIdToken?: () => Promise<string>;
  devBypass?: boolean;
}

type NutritionErrorPayload = {
  code?: string;
  error?: string;
};

export type NutritionResponseStorage = "database" | "memory";

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export async function authorizedNutritionFetch(
  authUser: User | NutritionAuthLike,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = await authUser.getIdToken?.().catch(() => "") ?? "";
  const headers = new Headers(init.headers);
  const devBypassEnabled = "devBypass" in authUser && authUser.devBypass === true;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!token && devBypassEnabled && isLocalDevHost()) {
    headers.set("x-dev-user-id", authUser.uid);
    headers.set("x-dev-auth-mode", "preview");
  }

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export function getNutritionStorageMode(response: Response): NutritionResponseStorage {
  return response.headers.get("x-nutrition-storage") === "memory" ? "memory" : "database";
}

export async function getNutritionErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  let payload: NutritionErrorPayload | null = null;

  try {
    payload = (await response.clone().json()) as NutritionErrorPayload;
  } catch {
    payload = null;
  }

  if (payload?.code === "nutrition_auth_unavailable" || response.status === 503) {
    return "A autenticacao da nutricao nao esta disponivel neste deploy. Confira as variaveis do Firebase na Vercel.";
  }

  if (payload?.code === "nutrition_auth_unauthorized" || response.status === 401) {
    return "Sua sessao da nutricao expirou ou nao foi validada. Entre novamente e tente de novo.";
  }

  return fallbackMessage;
}
