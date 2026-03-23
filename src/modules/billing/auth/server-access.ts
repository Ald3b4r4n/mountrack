import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AppRole } from "@/modules/billing/domain/types";
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
  getBillingStorageResponse,
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
}

function coerceEmail(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function resolveServerAppAccessFromToken(
  sessionToken: string | null,
  now = new Date(),
): Promise<ServerAppAccessContext | null> {
  if (!sessionToken) {
    return null;
  }

  const decodedToken = await verifyFirebaseIdToken(sessionToken);
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
    };
  }

  if (user.email) {
    await bootstrapBillingOwner(user.uid, user.email);
  }

  await ensureBillingTrialEntitlement(user.uid, now);

  const snapshot = await getBillingAccessSnapshot(user.uid, now);
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

  return {
    user,
    roles,
    accessAllowed: operatorOverride || decision.accessAllowed,
    effectiveStatus: operatorOverride ? "operator_override" : decision.effectiveStatus,
    entitlementStartsAt: snapshot.entitlementStartsAt,
    entitlementEndsAt: snapshot.entitlementEndsAt,
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
