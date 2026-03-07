import type { User } from "firebase/auth";

interface NutritionAuthLike {
  uid: string;
  getIdToken?: () => Promise<string>;
  devBypass?: boolean;
}

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
