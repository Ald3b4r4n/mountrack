import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AppRole, BillingSubscriptionSnapshot } from "@/modules/billing/domain/types";
import {
  hasPrivilegedAccessBypassRole,
  resolveAccessDecision,
} from "@/modules/billing/access-policy";
import { APP_SESSION_COOKIE_NAME } from "@/modules/billing/auth/session-cookie";
import { getBootstrapRolesForEmail } from "@/modules/billing/config/bootstrap-operators";
import {
  bootstrapBillingOwner,
  ensureBillingTrialEntitlement,
  getBillingAccessSnapshot,
  getBillingPlanById,
  getBillingStorageResponse,
  getLatestBillingSubscriptionForUser,
} from "@/modules/billing/repositories/billing-store";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

export interface ServerSessionUser {
  uid: string;
  email?: string;
}

export interface ServerAppAccessContext {
  user: ServerSessionUser;
  roles: AppRole[];
  accessAllowed: boolean;
  effectiveStatus: string;
  entitlementStartsAt: string | null;
  entitlementEndsAt: string | null;
  subscription: (BillingSubscriptionSnapshot & {
    planName: string | null;
    planCode: string | null;
  }) | null;
}

function coerceEmail(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isInvalidSessionError(error: unknown): boolean {
  if (
    error instanceof Error &&
    (error.message === "UNAUTHORIZED" || error.message === "auth/invalid-id-token")
  ) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  return (
    code === "auth/id-token-expired" ||
    code === "auth/id-token-revoked" ||
    code === "auth/invalid-id-token" ||
    code === "auth/argument-error"
  );
}

export async function resolveServerAppAccessFromToken(
  sessionToken: string | null,
  now = new Date(),
): Promise<ServerAppAccessContext | null> {
  if (!sessionToken) {
    return null;
  }

  let decodedToken: Awaited<ReturnType<typeof verifyFirebaseIdToken>>;

  try {
    decodedToken = await verifyFirebaseIdToken(sessionToken);
  } catch (error) {
    if (isInvalidSessionError(error)) {
      return null;
    }

    throw error;
  }

  const user = {
    uid: decodedToken.uid,
    email: coerceEmail(decodedToken.email),
  };
  const bootstrapRoles = getBootstrapRolesForEmail(user.email);

  if (getBillingStorageResponse() === "unavailable") {
    const operatorOverride = hasPrivilegedAccessBypassRole(bootstrapRoles);

    return {
      user,
      roles: bootstrapRoles,
      accessAllowed: operatorOverride || process.env.NODE_ENV !== "production",
      effectiveStatus: operatorOverride ? "operator_override" : "missing",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      subscription: null,
    };
  }

  if (user.email) {
    await bootstrapBillingOwner(user.uid, user.email);
  }

  await ensureBillingTrialEntitlement(user.uid, now);

  const [snapshot, subscription] = await Promise.all([
    getBillingAccessSnapshot(user.uid, now),
    getLatestBillingSubscriptionForUser(user.uid, now),
  ]);
  const decision = resolveAccessDecision({
    entitlementStatus: snapshot.entitlementStatus,
    manualGrant: snapshot.manualGrant,
    now,
  });
  const roles = Array.from(
    new Set<AppRole>([...snapshot.roles, ...bootstrapRoles]),
  );
  const operatorOverride =
    hasPrivilegedAccessBypassRole(roles) && !decision.accessAllowed;
  const plan = subscription?.planId
    ? await getBillingPlanById(subscription.planId)
    : null;

  return {
    user,
    roles,
    accessAllowed: operatorOverride || decision.accessAllowed,
    effectiveStatus: operatorOverride ? "operator_override" : decision.effectiveStatus,
    entitlementStartsAt: snapshot.entitlementStartsAt,
    entitlementEndsAt: snapshot.entitlementEndsAt,
    subscription: subscription
      ? {
          ...subscription,
          planName: plan?.name ?? null,
          planCode: plan?.code ?? null,
        }
      : null,
  };
}

export async function readServerAppAccess(
  now = new Date(),
): Promise<ServerAppAccessContext | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value ?? null;
  return resolveServerAppAccessFromToken(sessionToken, now);
}

export async function requireServerAppAccess(): Promise<ServerAppAccessContext> {
  const access = await readServerAppAccess();

  if (!access?.user) {
    redirect("/login");
  }

  if (!access.accessAllowed) {
    redirect("/subscribe");
  }

  return access;
}
