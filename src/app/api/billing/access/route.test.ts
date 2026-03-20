/** @jest-environment node */

jest.mock("@/modules/billing/auth/server-access", () => ({
  readServerAppAccess: jest.fn(),
}));

import { GET } from "@/app/api/billing/access/route";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";

const readServerAppAccessMock = jest.mocked(readServerAppAccess);

describe("GET /api/billing/access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when there is no authenticated server session", async () => {
    readServerAppAccessMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      accessAllowed: false,
      effectiveStatus: "missing",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      roles: [],
    });
  });

  it("returns 403 when the user is authenticated but billing access is blocked", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: false,
      effectiveStatus: "past_due",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      accessAllowed: false,
      effectiveStatus: "past_due",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      roles: ["user"],
    });
  });

  it("returns 200 when the user can access the paid app", async () => {
    readServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-20T12:00:00.000Z",
      entitlementEndsAt: "2026-04-20T12:00:00.000Z",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-20T12:00:00.000Z",
      entitlementEndsAt: "2026-04-20T12:00:00.000Z",
      roles: ["user"],
    });
  });
});
