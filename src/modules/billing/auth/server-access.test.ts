/** @jest-environment node */

jest.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  bootstrapBillingOwner: jest.fn(),
  ensureBillingTrialEntitlement: jest.fn(),
  getBillingAccessSnapshot: jest.fn(),
  getBillingPlanById: jest.fn(),
  getBillingStorageResponse: jest.fn(),
  getLatestBillingSubscriptionForUser: jest.fn(),
}));

import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  bootstrapBillingOwner,
  ensureBillingTrialEntitlement,
  getBillingAccessSnapshot,
  getBillingPlanById,
  getBillingStorageResponse,
  getLatestBillingSubscriptionForUser,
} from "@/modules/billing/repositories/billing-store";
import { resolveServerAppAccessFromToken } from "@/modules/billing/auth/server-access";

const verifyFirebaseIdTokenMock = jest.mocked(verifyFirebaseIdToken);
const bootstrapBillingOwnerMock = jest.mocked(bootstrapBillingOwner);
const ensureBillingTrialEntitlementMock = jest.mocked(ensureBillingTrialEntitlement);
const getBillingAccessSnapshotMock = jest.mocked(getBillingAccessSnapshot);
const getBillingPlanByIdMock = jest.mocked(getBillingPlanById);
const getBillingStorageResponseMock = jest.mocked(getBillingStorageResponse);
const getLatestBillingSubscriptionForUserMock = jest.mocked(getLatestBillingSubscriptionForUser);
const originalBootstrapOwnerEmail = process.env.BOOTSTRAP_OWNER_EMAIL;
const originalBootstrapAdminEmails = process.env.BOOTSTRAP_ADMIN_EMAILS;
const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

describe("server-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableEnv.BOOTSTRAP_OWNER_EMAIL = "";
    mutableEnv.BOOTSTRAP_ADMIN_EMAILS = "";
    mutableEnv.NODE_ENV = originalNodeEnv ?? "test";
    getBillingStorageResponseMock.mockReturnValue("database");
    verifyFirebaseIdTokenMock.mockResolvedValue({
      uid: "user-123",
      email: "owner@mountrack.app",
    });
    bootstrapBillingOwnerMock.mockResolvedValue(["owner"]);
    ensureBillingTrialEntitlementMock.mockResolvedValue(null);
    getLatestBillingSubscriptionForUserMock.mockResolvedValue(null);
    getBillingPlanByIdMock.mockResolvedValue(null);
  });

  it("returns null when there is no session token", async () => {
    await expect(resolveServerAppAccessFromToken(null)).resolves.toBeNull();
    expect(verifyFirebaseIdTokenMock).not.toHaveBeenCalled();
  });

  it("returns null when the Firebase session token has expired", async () => {
    verifyFirebaseIdTokenMock.mockRejectedValue({
      code: "auth/id-token-expired",
      message: "Firebase ID token has expired",
    });

    await expect(
      resolveServerAppAccessFromToken("expired-firebase-session-token"),
    ).resolves.toBeNull();

    expect(bootstrapBillingOwnerMock).not.toHaveBeenCalled();
    expect(ensureBillingTrialEntitlementMock).not.toHaveBeenCalled();
  });

  it("returns null when the Firebase session token is invalid", async () => {
    verifyFirebaseIdTokenMock.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(
      resolveServerAppAccessFromToken("invalid-firebase-session-token"),
    ).resolves.toBeNull();

    expect(bootstrapBillingOwnerMock).not.toHaveBeenCalled();
    expect(ensureBillingTrialEntitlementMock).not.toHaveBeenCalled();
  });

  it("allows access when the billing snapshot resolves to an allowed entitlement", async () => {
    getBillingAccessSnapshotMock.mockResolvedValue({
      entitlementStatus: "trialing",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      manualGrant: null,
      roles: ["owner"],
    });

    await expect(
      resolveServerAppAccessFromToken("firebase-session-token", new Date("2026-03-15T12:00:00.000Z")),
    ).resolves.toEqual({
      user: {
        uid: "user-123",
        email: "owner@mountrack.app",
      },
      roles: ["owner"],
      accessAllowed: true,
      effectiveStatus: "trialing",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      subscription: null,
    });

    expect(bootstrapBillingOwnerMock).toHaveBeenCalledWith("user-123", "owner@mountrack.app");
    expect(ensureBillingTrialEntitlementMock).toHaveBeenCalledWith(
      "user-123",
      new Date("2026-03-15T12:00:00.000Z"),
    );
  });

  afterAll(() => {
    mutableEnv.BOOTSTRAP_OWNER_EMAIL = originalBootstrapOwnerEmail;
    mutableEnv.BOOTSTRAP_ADMIN_EMAILS = originalBootstrapAdminEmails;
    mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it("blocks access when the entitlement snapshot is not allowed", async () => {
    getBillingAccessSnapshotMock.mockResolvedValue({
      entitlementStatus: "past_due",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      manualGrant: null,
      roles: ["user"],
    });

    await expect(resolveServerAppAccessFromToken("firebase-session-token")).resolves.toEqual({
      user: {
        uid: "user-123",
        email: "owner@mountrack.app",
      },
      roles: ["user"],
      accessAllowed: false,
      effectiveStatus: "past_due",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      subscription: null,
    });
  });

  it("restores the owner and admin bypass when entitlement is blocked", async () => {
    getBillingAccessSnapshotMock.mockResolvedValue({
      entitlementStatus: "past_due",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      manualGrant: null,
      roles: ["owner", "admin"],
    });

    await expect(resolveServerAppAccessFromToken("firebase-session-token")).resolves.toEqual({
      user: {
        uid: "user-123",
        email: "owner@mountrack.app",
      },
      roles: ["owner", "admin"],
      accessAllowed: true,
      effectiveStatus: "operator_override",
      entitlementStartsAt: "2026-03-15T12:00:00.000Z",
      entitlementEndsAt: "2026-03-18T12:00:00.000Z",
      subscription: null,
    });
  });

  it("allows access in non-production when billing storage is unavailable", async () => {
    getBillingStorageResponseMock.mockReturnValue("unavailable");

    await expect(resolveServerAppAccessFromToken("firebase-session-token")).resolves.toEqual({
      user: {
        uid: "user-123",
        email: "owner@mountrack.app",
      },
      roles: [],
      accessAllowed: true,
      effectiveStatus: "missing",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      subscription: null,
    });
    expect(ensureBillingTrialEntitlementMock).not.toHaveBeenCalled();
    expect(getBillingAccessSnapshotMock).not.toHaveBeenCalled();
  });

  it("keeps the bootstrap operator online in production when billing storage is unavailable", async () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = "owner@mountrack.app";
    process.env.BOOTSTRAP_ADMIN_EMAILS = "owner@mountrack.app";
    mutableEnv.NODE_ENV = "production";
    getBillingStorageResponseMock.mockReturnValue("unavailable");

    await expect(resolveServerAppAccessFromToken("firebase-session-token")).resolves.toEqual({
      user: {
        uid: "user-123",
        email: "owner@mountrack.app",
      },
      roles: ["owner", "admin"],
      accessAllowed: true,
      effectiveStatus: "operator_override",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      subscription: null,
    });
  });
});
