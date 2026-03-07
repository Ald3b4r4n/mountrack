/** @jest-environment node */

import { generateKeyPairSync, sign } from "node:crypto";

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function buildFirebaseToken(privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"], projectId: string): string {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: "RS256", kid: "kid-1", typ: "JWT" }));
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      aud: projectId,
      auth_time: nowInSeconds - 60,
      exp: nowInSeconds + 3600,
      iat: nowInSeconds - 60,
      iss: `https://securetoken.google.com/${projectId}`,
      sub: "user-123",
      user_id: "user-123",
    }),
  );
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const encodedSignature = sign("RSA-SHA256", Buffer.from(signedContent), privateKey).toString("base64url");

  return `${signedContent}.${encodedSignature}`;
}

describe("verifyFirebaseIdToken", () => {
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalServerProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const originalPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const originalServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    process.env.FIREBASE_PROJECT_ID = originalServerProjectId;
    process.env.FIREBASE_CLIENT_EMAIL = originalClientEmail;
    process.env.FIREBASE_PRIVATE_KEY = originalPrivateKey;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalServiceAccountJson;
    global.fetch = originalFetch;
  });

  it("verifies Firebase ID tokens with Google public keys when the Admin SDK is not configured", async () => {
    const projectId = "mountrack-app";
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
    const token = buildFirebaseToken(privateKey, projectId);

    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
    process.env.FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_CLIENT_EMAIL = "";
    process.env.FIREBASE_PRIVATE_KEY = "";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "cache-control": "public, max-age=3600" }),
      json: async () => ({ "kid-1": publicKeyPem }),
    } as Response);

    let verifyFirebaseIdToken!: (token: string) => Promise<{ uid: string }>;
    await jest.isolateModulesAsync(async () => {
      ({ verifyFirebaseIdToken } = await import("@/lib/firebase-admin"));
    });

    await expect(verifyFirebaseIdToken(token)).resolves.toMatchObject({ uid: "user-123" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces an auth-unavailable error when the project id is missing", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_CLIENT_EMAIL = "";
    process.env.FIREBASE_PRIVATE_KEY = "";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";

    let verifyFirebaseIdToken!: (token: string) => Promise<{ uid: string }>;
    await jest.isolateModulesAsync(async () => {
      ({ verifyFirebaseIdToken } = await import("@/lib/firebase-admin"));
    });

    await expect(verifyFirebaseIdToken("invalid-token")).rejects.toThrow("AUTH_UNAVAILABLE");
  });
});
