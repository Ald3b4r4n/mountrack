/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
  saveManualAccessGrant: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants", () => ({
  canManageManualGrants: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants-server", () => ({
  buildBillingManualGrantsPayload: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  findFirebaseUserByEmail: jest.fn(),
  findFirebaseUserByUid: jest.fn(),
  getFirebaseAdminUnavailableMessage: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/billing/manual-grants/route";
import type { ServerAppAccessContext } from "@/modules/billing/auth/server-access";
import type { BillingManualGrantsPayload } from "@/modules/billing/manual-grants";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import {
  getBillingStorageResponse,
  saveManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";
import {
  canManageManualGrants,
} from "@/modules/billing/manual-grants";
import { buildBillingManualGrantsPayload } from "@/modules/billing/manual-grants-server";
import {
  findFirebaseUserByEmail,
  findFirebaseUserByUid,
  getFirebaseAdminUnavailableMessage,
} from "@/lib/firebase-admin";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const saveManualAccessGrantMock = jest.mocked(saveManualAccessGrant);
const buildBillingManualGrantsPayloadMock = jest.mocked(buildBillingManualGrantsPayload);
const canManageManualGrantsMock = jest.mocked(canManageManualGrants);
const findFirebaseUserByEmailMock = jest.mocked(findFirebaseUserByEmail);
const findFirebaseUserByUidMock = jest.mocked(findFirebaseUserByUid);
const getFirebaseAdminUnavailableMessageMock = jest.mocked(getFirebaseAdminUnavailableMessage);

const operatorAccess: ServerAppAccessContext = {
  user: {
    uid: "owner-1",
    email: "owner@mountrack.app",
  },
  roles: ["owner"],
  accessAllowed: true,
  effectiveStatus: "operator_override",
  entitlementStartsAt: null,
  entitlementEndsAt: null,
  subscription: null,
};

const targetUser = {
  uid: "target-1",
  email: "target@example.com",
  displayName: "Target User",
  disabled: false,
};

const payload: BillingManualGrantsPayload = {
  targetUser,
  access: {
    accessAllowed: true,
    effectiveStatus: "manual_grant_active",
    entitlementStartsAt: null,
    entitlementEndsAt: null,
    manualGrantType: "courtesy",
    roles: ["user"],
  },
  subscription: null,
  grants: [],
  auditLogs: [],
};

describe("billing manual grants routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readServerAppAccessMock.mockResolvedValue(operatorAccess);
    canManageManualGrantsMock.mockReturnValue(true);
    getBillingStorageResponseMock.mockReturnValue("database");
    getFirebaseAdminUnavailableMessageMock.mockReturnValue(
      "Firebase Admin indisponivel. Configure FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.",
    );
  });

  it("returns 400 when searching without a target user", async () => {
    const response = (await GET(
      new NextRequest("http://localhost/api/billing/manual-grants"),
    ))!;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing target user",
    });
  });

  it("returns 404 when the target email does not exist", async () => {
    findFirebaseUserByEmailMock.mockResolvedValue(null);

    const response = (await GET(
      new NextRequest(
        "http://localhost/api/billing/manual-grants?email=target@example.com",
      ),
    ))!;

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Target user not found",
    });
  });

  it("returns the manual grant console payload for a valid target", async () => {
    findFirebaseUserByEmailMock.mockResolvedValue(targetUser);
    buildBillingManualGrantsPayloadMock.mockResolvedValue(payload);

    const response = (await GET(
      new NextRequest(
        "http://localhost/api/billing/manual-grants?email=target@example.com",
      ),
    ))!;

    expect(response.status).toBe(200);
    expect(findFirebaseUserByEmailMock).toHaveBeenCalledWith(
      "target@example.com",
    );
    expect(buildBillingManualGrantsPayloadMock).toHaveBeenCalledWith(targetUser);
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("supports loading the target user by uid", async () => {
    findFirebaseUserByUidMock.mockResolvedValue(targetUser);
    buildBillingManualGrantsPayloadMock.mockResolvedValue(payload);

    const response = (await GET(
      new NextRequest(
        "http://localhost/api/billing/manual-grants?uid=target-1",
      ),
    ))!;

    expect(response.status).toBe(200);
    expect(findFirebaseUserByUidMock).toHaveBeenCalledWith("target-1");
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("saves a new manual grant and returns the refreshed payload", async () => {
    findFirebaseUserByEmailMock.mockResolvedValue(targetUser);
    buildBillingManualGrantsPayloadMock.mockResolvedValue(payload);

    const response = (await POST(
      new NextRequest("http://localhost/api/billing/manual-grants", {
        method: "POST",
        body: JSON.stringify({
          targetEmail: "target@example.com",
          grantType: "courtesy",
          reason: "Parceria de lancamento",
          notes: "Ciclo de onboarding",
          durationDays: 30,
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
    ))!;

    expect(response.status).toBe(201);
    expect(saveManualAccessGrantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "target-1",
        grantType: "courtesy",
        reason: "Parceria de lancamento",
        notes: "Ciclo de onboarding",
        grantedBy: "owner-1",
      }),
    );
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("returns 403 when the operator lacks permission", async () => {
    canManageManualGrantsMock.mockReturnValue(false);

    const response = (await POST(
      new NextRequest("http://localhost/api/billing/manual-grants", {
        method: "POST",
        body: JSON.stringify({
          targetEmail: "target@example.com",
          grantType: "courtesy",
          reason: "Parceria",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
    ))!;

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden",
    });
  });

  it("returns an actionable 503 when Firebase Admin is not configured", async () => {
    findFirebaseUserByEmailMock.mockRejectedValue(new Error("AUTH_UNAVAILABLE"));

    const response = (await GET(
      new NextRequest(
        "http://localhost/api/billing/manual-grants?email=target@example.com",
      ),
    ))!;

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "Firebase Admin indisponivel. Configure FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.",
    });
  });
});
