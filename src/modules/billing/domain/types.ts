export const BILLING_MONTHLY_PLAN_CODE = "pro_monthly";
export const BILLING_MONTHLY_PRICE_CENTS = 1499;
export const BILLING_CURRENCY = "BRL";
export const BILLING_TRIAL_DAYS = 7;

export const BILLING_ACCESS_STATUSES = [
  "trialing",
  "active",
  "grace_period",
  "past_due",
  "cancelled",
  "expired",
  "fraud_hold",
  "chargeback_hold",
  "suspended",
] as const;

export type BillingAccessStatus = (typeof BILLING_ACCESS_STATUSES)[number];

export const ACCESS_ALLOWED_STATUSES = ["trialing", "active", "grace_period"] as const;
export type AllowedAccessStatus = (typeof ACCESS_ALLOWED_STATUSES)[number];

export const HARD_BLOCKED_STATUSES = ["fraud_hold", "chargeback_hold", "suspended"] as const;
export type HardBlockedStatus = (typeof HARD_BLOCKED_STATUSES)[number];

export const MANUAL_ACCESS_GRANT_TYPES = [
  "influencer",
  "doctor",
  "partner",
  "courtesy",
  "staff",
  "lifetime",
] as const;

export type ManualAccessGrantType = (typeof MANUAL_ACCESS_GRANT_TYPES)[number];

export const BILLING_ENTITLEMENT_SOURCE_TYPES = [
  "trial",
  "subscription",
  "manual_grant",
  "staff",
] as const;

export type BillingEntitlementSourceType = (typeof BILLING_ENTITLEMENT_SOURCE_TYPES)[number];

export const APP_ROLES = ["owner", "admin", "finance", "support", "user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const BILLING_PERMISSIONS = [
  "billing:dashboard:view",
  "billing:payments:view",
  "billing:webhooks:view",
  "billing:user-access:view",
  "billing:manual-grants:manage",
  "billing:roles:view",
  "billing:roles:assign-admin",
  "billing:roles:assign-operator",
] as const;

export type BillingPermission = (typeof BILLING_PERMISSIONS)[number];

export interface ManualAccessGrantSnapshot {
  grantType: ManualAccessGrantType;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  revokedAt?: string | Date | null;
}

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  billingInterval: string;
  amountCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
}

export const BILLING_CHECKOUT_SESSION_STATUSES = [
  "pending",
  "redirect_ready",
  "completed",
  "expired",
  "cancelled",
] as const;

export type BillingCheckoutSessionStatus = (typeof BILLING_CHECKOUT_SESSION_STATUSES)[number];

export interface BillingCheckoutSessionRecord {
  id: string;
  userId: string;
  planId: string;
  expectedAmountCents: number;
  currency: string;
  nonce: string;
  providerCheckoutId?: string | null;
  providerCheckoutUrl?: string | null;
  status: BillingCheckoutSessionStatus;
  expiresAt: string;
  createdAt: string;
}

export interface BillingEntitlementRecord {
  id: string;
  userId: string;
  sourceType: BillingEntitlementSourceType;
  sourceId: string;
  status: BillingAccessStatus;
  startsAt: string;
  endsAt?: string | null;
}

export interface BillingPaymentRecord {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  provider: string;
  providerPaymentId: string;
  providerStatus: string;
  internalStatus: string;
  amountCents: number;
  currency: string;
  paidAt?: string | null;
  rawReferenceId?: string | null;
}

export interface ManualAccessGrantRecord extends ManualAccessGrantSnapshot {
  id: string;
  userId: string;
  reason: string;
  notes?: string | null;
  grantedBy: string;
  createdAt: string;
}

export interface BillingEventRecord {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  processingStatus: string;
  idempotencyKey?: string | null;
  processedAt?: string | null;
}

export interface BillingAccessSnapshot {
  entitlementStatus: BillingAccessStatus | null;
  entitlementStartsAt: string | null;
  entitlementEndsAt: string | null;
  manualGrant: ManualAccessGrantSnapshot | null;
  roles: AppRole[];
}

export type AccessDecisionReason =
  | "active_entitlement"
  | "manual_grant"
  | "blocked_hard_status"
  | "blocked_entitlement"
  | "missing_entitlement";

export type AccessDecisionSource = "entitlement" | "manual_grant" | "none";
export type EffectiveAccessStatus = BillingAccessStatus | "manual_grant_active" | "missing";

export interface AccessDecision {
  accessAllowed: boolean;
  source: AccessDecisionSource;
  reason: AccessDecisionReason;
  effectiveStatus: EffectiveAccessStatus;
}

export interface ResolveAccessDecisionInput {
  entitlementStatus?: BillingAccessStatus | null;
  manualGrant?: ManualAccessGrantSnapshot | null;
  now?: Date;
}
