import { hasBillingPermission } from "@/modules/billing/access-policy";
import type {
  AppRole,
  ManualAccessGrantRecord,
  ManualAccessGrantType,
} from "@/modules/billing/domain/types";
import type { FirebaseAdminUserSummary } from "@/lib/firebase-admin";

export const MANUAL_GRANT_TYPE_LABELS: Record<ManualAccessGrantType, string> = {
  influencer: "Influencer",
  doctor: "Medico",
  partner: "Parceiro",
  courtesy: "Cortesia",
  staff: "Equipe",
  lifetime: "Vitalicio",
};

export const MANUAL_GRANT_DURATION_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "180 dias" },
  { value: "365", label: "365 dias" },
  { value: "none", label: "Sem prazo" },
] as const;

export type ManualGrantDurationOptionValue =
  (typeof MANUAL_GRANT_DURATION_OPTIONS)[number]["value"];

export interface BillingManualGrantAccessSummary {
  accessAllowed: boolean;
  effectiveStatus: string;
  entitlementStartsAt: string | null;
  entitlementEndsAt: string | null;
  manualGrantType: ManualAccessGrantType | null;
  roles: AppRole[];
}

export interface BillingManualGrantSubscriptionSummary {
  id: string;
  userId: string;
  planId: string | null;
  planName: string | null;
  planCode: string | null;
  providerSubscriptionId: string | null;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  gracePeriodEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingManualGrantsPayload {
  targetUser: FirebaseAdminUserSummary;
  access: BillingManualGrantAccessSummary;
  subscription: BillingManualGrantSubscriptionSummary | null;
  grants: ManualAccessGrantRecord[];
}

export function canManageManualGrants(roles: readonly AppRole[]): boolean {
  return hasBillingPermission(roles, "billing:manual-grants:manage");
}
