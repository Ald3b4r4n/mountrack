const LOCAL_PREVIEW_HOST = "127.0.0.1";
const FIREBASE_LOCAL_AUTH_HOST = "localhost";

interface LocationLike {
  href: string;
  hostname: string;
}

export function sanitizeNextPath(candidate?: string | null): string {
  if (!candidate || !candidate.trim()) {
    return "/";
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  return trimmed;
}

export function buildLoginPath(nextPath: string): string {
  const params = new URLSearchParams({
    next: sanitizeNextPath(nextPath),
  });

  return `/login?${params.toString()}`;
}

export function needsLocalAuthHost(locationLike: LocationLike): boolean {
  return locationLike.hostname === LOCAL_PREVIEW_HOST;
}

export function resolveLocalAuthUrl(locationLike: LocationLike, path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;

  if (!needsLocalAuthHost(locationLike)) {
    return safePath;
  }

  const target = new URL(locationLike.href);
  const nextTarget = new URL(safePath, `${target.protocol}//${target.host}`);
  target.hostname = FIREBASE_LOCAL_AUTH_HOST;
  target.pathname = nextTarget.pathname;
  target.search = nextTarget.search;
  target.hash = nextTarget.hash;

  return target.toString();
}

export function buildLoginNavigationUrl(locationLike: LocationLike, nextPath: string): string {
  return resolveLocalAuthUrl(locationLike, buildLoginPath(nextPath));
}
