import { createPublicKey, verify as verifySignature } from "node:crypto";
import admin from "firebase-admin";

const GOOGLE_SECURE_TOKEN_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type FirebaseTokenHeader = {
  alg?: string;
  kid?: string;
};

type FirebaseTokenPayload = {
  aud?: string;
  auth_time?: number;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
  user_id?: string;
  [key: string]: unknown;
};

type CachedGoogleCerts = {
  certs: Record<string, string>;
  expiresAt: number;
};

let googleCertCache: CachedGoogleCerts | null = null;

function readEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function normalizePrivateKey(value?: string): string | undefined {
  return value?.replace(/\\n/g, "\n");
}

function resolveFirebaseProjectId(): string | undefined {
  return readEnvValue(
    "FIREBASE_PROJECT_ID",
    "FIREBASE_ADMIN_PROJECT_ID",
    "GOOGLE_CLOUD_PROJECT",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  );
}

function parseServiceAccountJson(rawValue: string): admin.ServiceAccount | null {
  try {
    const parsedValue = JSON.parse(rawValue) as ServiceAccountJson;
    if (!parsedValue.project_id || !parsedValue.client_email || !parsedValue.private_key) {
      return null;
    }

    return {
      projectId: parsedValue.project_id,
      clientEmail: parsedValue.client_email,
      privateKey: normalizePrivateKey(parsedValue.private_key),
    };
  } catch {
    return null;
  }
}

function resolveFirebaseServiceAccount(): admin.ServiceAccount | null {
  const serviceAccountJson = readEnvValue("FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    const parsedServiceAccount = parseServiceAccountJson(serviceAccountJson);
    if (parsedServiceAccount) {
      return parsedServiceAccount;
    }
  }

  const projectId = readEnvValue("FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = readEnvValue("FIREBASE_CLIENT_EMAIL", "FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(readEnvValue("FIREBASE_PRIVATE_KEY", "FIREBASE_ADMIN_PRIVATE_KEY"));

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function decodeJwtSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

function parseCacheMaxAge(cacheControlHeader: string | null): number {
  const matchedValue = cacheControlHeader?.match(/max-age=(\d+)/i)?.[1];
  const parsedSeconds = matchedValue ? Number(matchedValue) : Number.NaN;

  if (!Number.isFinite(parsedSeconds) || parsedSeconds <= 0) {
    return ONE_HOUR_IN_MS;
  }

  return parsedSeconds * 1000;
}

async function fetchGoogleSecureTokenCerts(forceRefresh = false): Promise<Record<string, string>> {
  if (!forceRefresh && googleCertCache && googleCertCache.expiresAt > Date.now()) {
    return googleCertCache.certs;
  }

  const response = await fetch(GOOGLE_SECURE_TOKEN_CERTS_URL, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("AUTH_UNAVAILABLE");
  }

  const certs = (await response.json()) as Record<string, string>;
  if (!certs || !Object.keys(certs).length) {
    throw new Error("AUTH_UNAVAILABLE");
  }

  googleCertCache = {
    certs,
    expiresAt: Date.now() + parseCacheMaxAge(response.headers.get("cache-control")),
  };

  return certs;
}

function validateFirebaseTokenPayload(payload: FirebaseTokenPayload, projectId: string): void {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error("UNAUTHORIZED");
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("UNAUTHORIZED");
  }

  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128) {
    throw new Error("UNAUTHORIZED");
  }

  if (typeof payload.iat !== "number" || payload.iat > nowInSeconds) {
    throw new Error("UNAUTHORIZED");
  }

  if (typeof payload.exp !== "number" || payload.exp <= nowInSeconds) {
    throw new Error("UNAUTHORIZED");
  }
}

async function verifyFirebaseTokenWithGoogleCerts(token: string, projectId: string): Promise<{ uid: string } & FirebaseTokenPayload> {
  const tokenSegments = token.split(".");
  if (tokenSegments.length !== 3) {
    throw new Error("UNAUTHORIZED");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = tokenSegments;

  let header: FirebaseTokenHeader;
  let payload: FirebaseTokenPayload;

  try {
    header = decodeJwtSegment<FirebaseTokenHeader>(encodedHeader);
    payload = decodeJwtSegment<FirebaseTokenPayload>(encodedPayload);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("UNAUTHORIZED");
  }

  validateFirebaseTokenPayload(payload, projectId);

  let certs = await fetchGoogleSecureTokenCerts();
  let signingKey = certs[header.kid];

  if (!signingKey) {
    certs = await fetchGoogleSecureTokenCerts(true);
    signingKey = certs[header.kid];
  }

  if (!signingKey) {
    throw new Error("UNAUTHORIZED");
  }

  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const isValidSignature = verifySignature(
    "RSA-SHA256",
    Buffer.from(signedContent),
    createPublicKey(signingKey),
    Buffer.from(encodedSignature, "base64url"),
  );

  if (!isValidSignature) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    ...payload,
    uid: typeof payload.user_id === "string" && payload.user_id ? payload.user_id : payload.sub!,
  };
}

const firebaseServiceAccount = resolveFirebaseServiceAccount();

if (!admin.apps.length && firebaseServiceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccount),
  });
}

const adminApp = admin.apps[0] ?? null;

export const adminDb = adminApp ? admin.firestore(adminApp) : null;
export const adminAuth = adminApp ? admin.auth(adminApp) : null;
export const hasFirebaseAdmin = Boolean(adminApp);
export const firebaseProjectId = resolveFirebaseProjectId() ?? null;

export interface FirebaseAdminUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
}

export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string } & Record<string, unknown>> {
  if (adminAuth) {
    return adminAuth.verifyIdToken(token) as Promise<{ uid: string } & Record<string, unknown>>;
  }

  if (!firebaseProjectId) {
    throw new Error("AUTH_UNAVAILABLE");
  }

  return verifyFirebaseTokenWithGoogleCerts(token, firebaseProjectId);
}

export async function findFirebaseUserByEmail(
  email: string,
): Promise<FirebaseAdminUserSummary | null> {
  if (!adminAuth) {
    throw new Error("AUTH_UNAVAILABLE");
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(email);

    return {
      uid: userRecord.uid,
      email: userRecord.email ?? null,
      displayName: userRecord.displayName ?? null,
      disabled: userRecord.disabled,
    };
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (errorCode === "auth/user-not-found") {
      return null;
    }

    throw new Error("AUTH_UNAVAILABLE");
  }
}
