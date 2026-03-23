/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants", () => ({
  canManageManualGrants: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
  revokeManualAccessGrant: jest.fn(),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/billing/manual-grants/[grantId]/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import {
  getBillingStorageResponse,
  revokeManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const canManageManualGrantsMock = jest.mocked(canManageManualGrants);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const revokeManualAccessGrantMock = jest.mocked(revokeManualAccessGrant);

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
});
