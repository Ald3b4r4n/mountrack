/** @jest-environment node */

jest.mock("@/modules/billing/access-policy", () => ({
  resolveAccessDecision: jest.fn(),
  hasPrivilegedAccessBypassRole: jest.fn(() => false),
}));

jest.mock("@/modules/billing/config/bootstrap-operators", () => ({
  getBootstrapRolesForEmail: jest.fn(() => []),
}));

jest.mock("@/modules/billing/repositories/billing-store", () => ({
  getBillingAccessSnapshot: jest.fn(),
  getLatestBillingSubscriptionForUser: jest.fn(),
  listManualAccessGrantsForUser: jest.fn(),
  listBillingAuditLogsForUser: jest.fn(),
  getBillingPlanById: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  findFirebaseUsersByUids: jest.fn(),
}));

import { resolveAccessDecision } from "@/modules/billing/access-policy";
import { buildBillingManualGrantsPayload } from "@/modules/billing/manual-grants-server";
import {
  getBillingAccessSnapshot,
  getBillingPlanById,
  getLatestBillingSubscriptionForUser,
  listBillingAuditLogsForUser,
  listManualAccessGrantsForUser,
} from "@/modules/billing/repositories/billing-store";
import { findFirebaseUsersByUids } from "@/lib/firebase-admin";

describe("buildBillingManualGrantsPayload", () => {
  const resolveAccessDecisionMock = jest.mocked(resolveAccessDecision);
  const getBillingAccessSnapshotMock = jest.mocked(getBillingAccessSnapshot);
  const getLatestBillingSubscriptionForUserMock = jest.mocked(
    getLatestBillingSubscriptionForUser,
  );
  const listManualAccessGrantsForUserMock = jest.mocked(
    listManualAccessGrantsForUser,
  );
  const listBillingAuditLogsForUserMock = jest.mocked(listBillingAuditLogsForUser);
  const getBillingPlanByIdMock = jest.mocked(getBillingPlanById);
  const findFirebaseUsersByUidsMock = jest.mocked(findFirebaseUsersByUids);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enriches the payload with operator users from grants and audit logs", async () => {
    getBillingAccessSnapshotMock.mockResolvedValue({
      roles: ["user"],
      entitlementStatus: "active",
      entitlementStartsAt: "2026-03-25T00:00:00.000Z",
      entitlementEndsAt: "2026-04-24T00:00:00.000Z",
      manualGrant: {
        grantType: "courtesy",
        startsAt: "2026-03-25T00:00:00.000Z",
        endsAt: "2026-04-24T00:00:00.000Z",
        revokedAt: null,
      },
    });
    getLatestBillingSubscriptionForUserMock.mockResolvedValue(null);
    listManualAccessGrantsForUserMock.mockResolvedValue([
      {
        id: "grant-1",
        userId: "target-1",
        grantType: "courtesy",
        reason: "Cortesia",
        notes: null,
        startsAt: "2026-03-25T00:00:00.000Z",
        endsAt: "2026-04-24T00:00:00.000Z",
        grantedBy: "owner-1",
        revokedAt: null,
        createdAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    listBillingAuditLogsForUserMock.mockResolvedValue([
      {
        id: "audit-1",
        actorUserId: "admin-1",
        action: "billing.manual_grant_saved",
        targetType: "manual_access_grant",
        targetId: "grant-1",
        metadata: {
          userId: "target-1",
          grantType: "courtesy",
        },
        createdAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    resolveAccessDecisionMock.mockReturnValue({
      accessAllowed: true,
      source: "manual_grant",
      reason: "manual_grant",
      effectiveStatus: "manual_grant_active",
    });
    getBillingPlanByIdMock.mockResolvedValue(null);
    findFirebaseUsersByUidsMock.mockResolvedValue({
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

    const payload = await buildBillingManualGrantsPayload({
      uid: "target-1",
      email: "target@example.com",
      displayName: "Target User",
      disabled: false,
    });

    expect(findFirebaseUsersByUidsMock).toHaveBeenCalledWith([
      "owner-1",
      "admin-1",
    ]);
    expect(payload.operatorUsers).toEqual({
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
  });
});
