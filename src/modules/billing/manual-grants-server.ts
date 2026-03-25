import {
  hasPrivilegedAccessBypassRole,
  resolveAccessDecision,
} from "@/modules/billing/access-policy";
import { getBootstrapRolesForEmail } from "@/modules/billing/config/bootstrap-operators";
import type { AppRole } from "@/modules/billing/domain/types";
import type { BillingManualGrantsPayload } from "@/modules/billing/manual-grants";
import {
  getBillingAccessSnapshot,
  getBillingPlanById,
  getLatestBillingSubscriptionForUser,
  listBillingAuditLogsForUser,
  listManualAccessGrantsForUser,
} from "@/modules/billing/repositories/billing-store";
import {
  findFirebaseUsersByUids,
  type FirebaseAdminUserSummary,
} from "@/lib/firebase-admin";

export async function buildBillingManualGrantsPayload(
  targetUser: FirebaseAdminUserSummary,
  now = new Date(),
): Promise<BillingManualGrantsPayload> {
  const [snapshot, subscription, grants, auditLogs] = await Promise.all([
    getBillingAccessSnapshot(targetUser.uid, now),
    getLatestBillingSubscriptionForUser(targetUser.uid, now),
    listManualAccessGrantsForUser(targetUser.uid),
    listBillingAuditLogsForUser(targetUser.uid),
  ]);
  const operatorUsers = await findFirebaseUsersByUids(
    Array.from(
      new Set(
        [
          ...grants.map((grant) => grant.grantedBy),
          ...auditLogs.map((auditLog) => auditLog.actorUserId),
        ].filter(Boolean),
      ),
    ),
  );
  const decision = resolveAccessDecision({
    entitlementStatus: snapshot.entitlementStatus,
    manualGrant: snapshot.manualGrant,
    now,
  });
  const bootstrapRoles = getBootstrapRolesForEmail(targetUser.email ?? undefined);
  const roles = Array.from(new Set<AppRole>([...snapshot.roles, ...bootstrapRoles]));
  const operatorOverride =
    hasPrivilegedAccessBypassRole(roles) && !decision.accessAllowed;
  const plan = subscription?.planId
    ? await getBillingPlanById(subscription.planId)
    : null;

  return {
    targetUser,
    access: {
      accessAllowed: operatorOverride || decision.accessAllowed,
      effectiveStatus: operatorOverride
        ? "operator_override"
        : decision.effectiveStatus,
      entitlementStartsAt: snapshot.entitlementStartsAt,
      entitlementEndsAt: snapshot.entitlementEndsAt,
      manualGrantType: snapshot.manualGrant?.grantType ?? null,
      roles,
    },
    subscription: subscription
      ? {
          ...subscription,
          planName: plan?.name ?? null,
          planCode: plan?.code ?? null,
        }
      : null,
    grants,
    auditLogs,
    operatorUsers,
  };
}
