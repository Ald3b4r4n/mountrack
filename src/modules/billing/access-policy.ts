import type {
  AppRole,
  BillingAccessStatus,
  BillingPermission,
  ManualAccessGrantSnapshot,
  ResolveAccessDecisionInput,
  AccessDecision,
} from "@/modules/billing/domain/types";
import {
  ACCESS_ALLOWED_STATUSES,
  HARD_BLOCKED_STATUSES,
} from "@/modules/billing/domain/types";

const permissionMatrix: Record<BillingPermission, readonly AppRole[]> = {
  "billing:dashboard:view": ["owner", "admin", "finance"],
  "billing:payments:view": ["owner", "admin", "finance"],
  "billing:webhooks:view": ["owner", "admin", "finance"],
  "billing:user-access:view": ["owner", "admin", "finance", "support"],
  "billing:manual-grants:manage": ["owner", "admin"],
  "billing:roles:view": ["owner"],
  "billing:roles:assign-admin": ["owner"],
  "billing:roles:assign-operator": ["owner"],
};

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function coerceDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsedValue = value instanceof Date ? value : new Date(value);
  return isValidDate(parsedValue) ? parsedValue : null;
}

export function isAllowedAccessStatus(status: BillingAccessStatus | null | undefined): boolean {
  return status != null && ACCESS_ALLOWED_STATUSES.includes(status as (typeof ACCESS_ALLOWED_STATUSES)[number]);
}

export function isHardBlockedStatus(status: BillingAccessStatus | null | undefined): boolean {
  return status != null && HARD_BLOCKED_STATUSES.includes(status as (typeof HARD_BLOCKED_STATUSES)[number]);
}

export function isManualAccessGrantActive(
  grant: ManualAccessGrantSnapshot | null | undefined,
  now = new Date(),
): boolean {
  if (!grant) {
    return false;
  }

  const startsAt = coerceDate(grant.startsAt);
  const endsAt = coerceDate(grant.endsAt);
  const revokedAt = coerceDate(grant.revokedAt);

  if (!startsAt) {
    return false;
  }

  if (revokedAt) {
    return false;
  }

  if (startsAt.getTime() > now.getTime()) {
    return false;
  }

  if (endsAt && endsAt.getTime() <= now.getTime()) {
    return false;
  }

  return true;
}

export function resolveAccessDecision({
  entitlementStatus = null,
  manualGrant = null,
  now = new Date(),
}: ResolveAccessDecisionInput): AccessDecision {
  if (isHardBlockedStatus(entitlementStatus)) {
    return {
      accessAllowed: false,
      source: "entitlement",
      reason: "blocked_hard_status",
      effectiveStatus: entitlementStatus!,
    };
  }

  if (isManualAccessGrantActive(manualGrant, now)) {
    return {
      accessAllowed: true,
      source: "manual_grant",
      reason: "manual_grant",
      effectiveStatus: "manual_grant_active",
    };
  }

  if (isAllowedAccessStatus(entitlementStatus)) {
    return {
      accessAllowed: true,
      source: "entitlement",
      reason: "active_entitlement",
      effectiveStatus: entitlementStatus!,
    };
  }

  if (!entitlementStatus) {
    return {
      accessAllowed: false,
      source: "none",
      reason: "missing_entitlement",
      effectiveStatus: "missing",
    };
  }

  return {
    accessAllowed: false,
    source: "entitlement",
    reason: "blocked_entitlement",
    effectiveStatus: entitlementStatus,
  };
}

export function hasBillingPermission(
  roles: readonly AppRole[],
  permission: BillingPermission,
): boolean {
  const allowedRoles = permissionMatrix[permission];
  return roles.some((role) => allowedRoles.includes(role));
}

export function canAssignRole(
  actorRoles: readonly AppRole[],
  targetRole: AppRole,
): boolean {
  if (targetRole === "user") {
    return false;
  }

  if (targetRole === "owner") {
    return false;
  }

  if (targetRole === "admin") {
    return hasBillingPermission(actorRoles, "billing:roles:assign-admin");
  }

  return hasBillingPermission(actorRoles, "billing:roles:assign-operator");
}
