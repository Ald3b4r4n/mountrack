/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants", () => ({
  canManageManualGrants: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getManualAccessGrantById: jest.fn(),
  getBillingStorageResponse: jest.fn(),
  revokeManualAccessGrant: jest.fn(),
  updateManualAccessGrant: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants-server", () => ({
  buildBillingManualGrantsPayload: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  findFirebaseUserByUid: jest.fn(),
}));

import { NextRequest } from "next/server";
import { DELETE, PUT } from "@/app/api/billing/manual-grants/[grantId]/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import type { BillingManualGrantsPayload } from "@/modules/billing/manual-grants";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import {
  getManualAccessGrantById,
  getBillingStorageResponse,
  revokeManualAccessGrant,
  updateManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";
import { buildBillingManualGrantsPayload } from "@/modules/billing/manual-grants-server";
import { findFirebaseUserByUid } from "@/lib/firebase-admin";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const canManageManualGrantsMock = jest.mocked(canManageManualGrants);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const getManualAccessGrantByIdMock = jest.mocked(getManualAccessGrantById);
const revokeManualAccessGrantMock = jest.mocked(revokeManualAccessGrant);
const updateManualAccessGrantMock = jest.mocked(updateManualAccessGrant);
const buildBillingManualGrantsPayloadMock = jest.mocked(buildBillingManualGrantsPayload);
const findFirebaseUserByUidMock = jest.mocked(findFirebaseUserByUid);

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
    entitlementEndsAt: "2026-04-22T12:00:00.000Z",
    manualGrantType: "courtesy",
    roles: ["user"],
  },
  subscription: null,
  grants: [],
};

describe("DELETE /api/billing/manual-grants/[grantId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readServerAppAccessMock.mockResolvedValue({
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
    });
    canManageManualGrantsMock.mockReturnValue(true);
    getBillingStorageResponseMock.mockReturnValue("database");
  });

  it("revokes the selected manual grant", async () => {
    revokeManualAccessGrantMock.mockResolvedValue(true);

    const response = (await DELETE(
      new NextRequest("http://localhost/api/billing/manual-grants/grant-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ grantId: "grant-1" }) },
    ))!;

    expect(response.status).toBe(200);
    expect(revokeManualAccessGrantMock).toHaveBeenCalledWith(
      "grant-1",
      "owner-1",
    );
    await expect(response.json()).resolves.toEqual({ revoked: true });
  });

  it("updates an existing active manual grant", async () => {
    getManualAccessGrantByIdMock.mockResolvedValue({
      id: "grant-1",
      userId: "target-1",
      grantType: "courtesy",
      reason: "Acesso inicial",
      notes: null,
      startsAt: "2026-03-23T12:00:00.000Z",
      endsAt: "2026-04-22T12:00:00.000Z",
      grantedBy: "owner-1",
      revokedAt: null,
      createdAt: "2026-03-23T12:00:00.000Z",
    });
    updateManualAccessGrantMock.mockResolvedValue({
      id: "grant-1",
      userId: "target-1",
      grantType: "partner",
      reason: "Parceria ampliada",
      notes: "Novo prazo",
      startsAt: "2026-03-23T12:00:00.000Z",
      endsAt: "2026-06-21T12:00:00.000Z",
      grantedBy: "owner-1",
      revokedAt: null,
      createdAt: "2026-03-23T12:00:00.000Z",
    });
    findFirebaseUserByUidMock.mockResolvedValue(targetUser);
    buildBillingManualGrantsPayloadMock.mockResolvedValue(payload);

    const response = (await PUT(
      new NextRequest("http://localhost/api/billing/manual-grants/grant-1", {
        method: "PUT",
        body: JSON.stringify({
          grantType: "partner",
          reason: "Parceria ampliada",
          notes: "Novo prazo",
          durationDays: 90,
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      { params: Promise.resolve({ grantId: "grant-1" }) },
    ))!;

    expect(response.status).toBe(200);
    expect(updateManualAccessGrantMock).toHaveBeenCalledWith(
      {
        id: "grant-1",
        grantType: "partner",
        reason: "Parceria ampliada",
        notes: "Novo prazo",
        endsAt: "2026-06-21T12:00:00.000Z",
      },
      "owner-1",
    );
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("returns 404 when the grant no longer exists", async () => {
    revokeManualAccessGrantMock.mockResolvedValue(false);

    const response = (await DELETE(
      new NextRequest("http://localhost/api/billing/manual-grants/grant-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ grantId: "grant-1" }) },
    ))!;

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Manual grant not found",
    });
  });

  it("returns 409 when trying to update a revoked grant", async () => {
    getManualAccessGrantByIdMock.mockResolvedValue({
      id: "grant-1",
      userId: "target-1",
      grantType: "courtesy",
      reason: "Acesso inicial",
      notes: null,
      startsAt: "2026-03-23T12:00:00.000Z",
      endsAt: "2026-04-22T12:00:00.000Z",
      grantedBy: "owner-1",
      revokedAt: "2026-03-24T12:00:00.000Z",
      createdAt: "2026-03-23T12:00:00.000Z",
    });

    const response = (await PUT(
      new NextRequest("http://localhost/api/billing/manual-grants/grant-1", {
        method: "PUT",
        body: JSON.stringify({
          grantType: "partner",
          reason: "Parceria ampliada",
          durationDays: 90,
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      { params: Promise.resolve({ grantId: "grant-1" }) },
    ))!;

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Manual grant already revoked",
    });
  });
});
