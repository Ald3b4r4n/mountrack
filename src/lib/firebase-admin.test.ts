/** @jest-environment node */

import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
}));

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
  const readFileSyncMock = jest.mocked(readFileSync);
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalServerProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const originalPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const originalServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const originalServiceAccountJsonPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH;
  const originalGoogleApplicationCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    process.env.FIREBASE_PROJECT_ID = originalServerProjectId;
    process.env.FIREBASE_CLIENT_EMAIL = originalClientEmail;
    process.env.FIREBASE_PRIVATE_KEY = originalPrivateKey;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalServiceAccountJson;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH = originalServiceAccountJsonPath;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = originalGoogleApplicationCredentials;
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

describe("getFirebaseAdminUnavailableMessage", () => {
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalServerProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const originalPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const originalServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    process.env.FIREBASE_PROJECT_ID = originalServerProjectId;
    process.env.FIREBASE_CLIENT_EMAIL = originalClientEmail;
    process.env.FIREBASE_PRIVATE_KEY = originalPrivateKey;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalServiceAccountJson;
    jest.unmock("firebase-admin");
  });

  it("explains when Firebase Admin credentials are missing", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "mountrack-app";
    process.env.FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_CLIENT_EMAIL = "";
    process.env.FIREBASE_PRIVATE_KEY = "";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";

    let getFirebaseAdminUnavailableMessage!: typeof import("@/lib/firebase-admin").getFirebaseAdminUnavailableMessage;
    await jest.isolateModulesAsync(async () => {
      ({ getFirebaseAdminUnavailableMessage } = await import("@/lib/firebase-admin"));
    });

    expect(getFirebaseAdminUnavailableMessage()).toBe(
      "Firebase Admin indisponivel. Configure FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.",
    );
  });

  it("explains when FIREBASE_SERVICE_ACCOUNT_JSON is invalid", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "mountrack-app";
    process.env.FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_CLIENT_EMAIL = "";
    process.env.FIREBASE_PRIVATE_KEY = "";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{\"project_id\":\"mountrack-app\"}";

    let getFirebaseAdminUnavailableMessage!: typeof import("@/lib/firebase-admin").getFirebaseAdminUnavailableMessage;
    await jest.isolateModulesAsync(async () => {
      ({ getFirebaseAdminUnavailableMessage } = await import("@/lib/firebase-admin"));
    });

    expect(getFirebaseAdminUnavailableMessage()).toBe(
      "Firebase Admin indisponivel. FIREBASE_SERVICE_ACCOUNT_JSON esta invalida.",
    );
  });
});

describe("searchFirebaseUsers", () => {
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalServerProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const originalPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const originalServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    process.env.FIREBASE_PROJECT_ID = originalServerProjectId;
    process.env.FIREBASE_CLIENT_EMAIL = originalClientEmail;
    process.env.FIREBASE_PRIVATE_KEY = originalPrivateKey;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalServiceAccountJson;
    jest.unmock("firebase-admin");
  });

  it("filters Firebase users across pages and preserves pagination cursor", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_PROJECT_ID = "mountrack-app";
    process.env.FIREBASE_CLIENT_EMAIL = "admin@mountrack.app";
    process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";

    const listUsersMock = jest
      .fn()
      .mockResolvedValueOnce({
        users: [
          {
            uid: "user-1",
            email: "alpha@example.com",
            displayName: "Alpha User",
            disabled: false,
          },
          {
            uid: "user-2",
            email: "other@example.com",
            displayName: "Other Person",
            disabled: false,
          },
        ],
        pageToken: "cursor-2",
      })
      .mockResolvedValueOnce({
        users: [
          {
            uid: "user-3",
            email: "someone@example.com",
            displayName: "Secondary Other",
            disabled: false,
          },
        ],
        pageToken: null,
      });

    jest.doMock("firebase-admin", () => ({
      __esModule: true,
      default: {
        apps: [{}],
        initializeApp: jest.fn(),
        credential: { cert: jest.fn(() => ({})) },
        auth: jest.fn(() => ({
          listUsers: listUsersMock,
        })),
        firestore: jest.fn(),
      },
    }));

    let searchFirebaseUsers!: typeof import("@/lib/firebase-admin").searchFirebaseUsers;
    await jest.isolateModulesAsync(async () => {
      ({ searchFirebaseUsers } = await import("@/lib/firebase-admin"));
    });

    const result = await searchFirebaseUsers("other", 2);

    expect(result).toEqual({
      users: [
        {
          uid: "user-2",
          email: "other@example.com",
          displayName: "Other Person",
          disabled: false,
        },
        {
          uid: "user-3",
          email: "someone@example.com",
          displayName: "Secondary Other",
          disabled: false,
        },
      ],
      nextPageToken: null,
    });
    expect(listUsersMock).toHaveBeenCalledWith(50, undefined);
    expect(listUsersMock).toHaveBeenCalledWith(50, "cursor-2");
  });
});

describe("findFirebaseUsersByUids", () => {
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const originalServerProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const originalPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const originalServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    process.env.FIREBASE_PROJECT_ID = originalServerProjectId;
    process.env.FIREBASE_CLIENT_EMAIL = originalClientEmail;
    process.env.FIREBASE_PRIVATE_KEY = originalPrivateKey;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalServiceAccountJson;
    jest.unmock("firebase-admin");
  });

  it("resolves Firebase users in batches and maps them by uid", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "";
    process.env.FIREBASE_PROJECT_ID = "mountrack-app";
    process.env.FIREBASE_CLIENT_EMAIL = "admin@mountrack.app";
    process.env.FIREBASE_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";

    const getUsersMock = jest.fn().mockResolvedValue({
      users: [
        {
          uid: "owner-1",
          email: "owner@example.com",
          displayName: "Owner User",
          disabled: false,
        },
        {
          uid: "admin-1",
          email: "admin@example.com",
          displayName: "Admin User",
          disabled: false,
        },
      ],
      notFound: [],
    });

    jest.doMock("firebase-admin", () => ({
      __esModule: true,
      default: {
        apps: [{}],
        initializeApp: jest.fn(),
        credential: { cert: jest.fn(() => ({})) },
        auth: jest.fn(() => ({
          getUsers: getUsersMock,
        })),
        firestore: jest.fn(),
      },
    }));

    let findFirebaseUsersByUids!: typeof import("@/lib/firebase-admin").findFirebaseUsersByUids;
    await jest.isolateModulesAsync(async () => {
      ({ findFirebaseUsersByUids } = await import("@/lib/firebase-admin"));
    });

    await expect(
      findFirebaseUsersByUids(["owner-1", "admin-1", "owner-1"]),
    ).resolves.toEqual({
      "owner-1": {
        uid: "owner-1",
        email: "owner@example.com",
        displayName: "Owner User",
        disabled: false,
      },
      "admin-1": {
        uid: "admin-1",
        email: "admin@example.com",
        displayName: "Admin User",
        disabled: false,
      },
    });
    expect(getUsersMock).toHaveBeenCalledWith([
      { uid: "owner-1" },
      { uid: "admin-1" },
    ]);
  });
});
