/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

jest.mock("@/modules/billing/manual-grants", () => ({
  canManageManualGrants: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingStorageResponse: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  listFirebaseUsers: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/billing/manual-grants/users/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import { getBillingStorageResponse } from "@/modules/billing/repositories/billing-store";
import { listFirebaseUsers } from "@/lib/firebase-admin";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);
const canManageManualGrantsMock = jest.mocked(canManageManualGrants);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const listFirebaseUsersMock = jest.mocked(listFirebaseUsers);

describe("GET /api/billing/manual-grants/users", () => {
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

  it("returns a paginated directory of firebase users", async () => {
    listFirebaseUsersMock.mockResolvedValue({
      users: [
        {
          uid: "user-1",
          email: "user-1@example.com",
          displayName: "User One",
          disabled: false,
        },
      ],
      nextPageToken: "cursor-2",
    });

    const response = (await GET(
      new NextRequest(
        "http://localhost/api/billing/manual-grants/users?cursor=cursor-1",
      ),
    ))!;

    expect(response.status).toBe(200);
    expect(listFirebaseUsersMock).toHaveBeenCalledWith(25, "cursor-1");
    await expect(response.json()).resolves.toEqual({
      users: [
        {
          uid: "user-1",
          email: "user-1@example.com",
          displayName: "User One",
          disabled: false,
        },
      ],
      nextPageToken: "cursor-2",
    });
  });

  it("returns 403 when the operator lacks permission", async () => {
    canManageManualGrantsMock.mockReturnValue(false);

    const response = (await GET(
      new NextRequest("http://localhost/api/billing/manual-grants/users"),
    ))!;

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden",
    });
  });
});
