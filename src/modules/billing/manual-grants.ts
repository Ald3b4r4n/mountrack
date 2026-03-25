import { hasBillingPermission } from "@/modules/billing/access-policy";
import type {
  AppRole,
  ManualAccessGrantRecord,
  ManualAccessGrantType,
} from "@/modules/billing/domain/types";
import type { FirebaseAdminUserSummary } from "@/lib/firebase-admin";

export const MANUAL_GRANT_TYPE_LABELS: Record<ManualAccessGrantType, string> = {
  influencer: "Influencer",
  doctor: "Médico",
  partner: "Parceiro",
  courtesy: "Cortesia",
  staff: "Equipe",
  lifetime: "Vitalício",
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

export interface ManualGrantPreset {
  id: string;
  label: string;
  description: string;
  grantType: ManualAccessGrantType;
  durationValue: ManualGrantDurationOptionValue;
  reason: string;
  notes: string;
}

export const MANUAL_GRANT_PRESETS: readonly ManualGrantPreset[] = [
  {
    id: "welcome-7",
    label: "7 dias de onboarding",
    description: "Extensão curta para destravar a entrada no app.",
    grantType: "courtesy",
    durationValue: "7",
    reason: "Extensão manual de onboarding por 7 dias.",
    notes: "Concessão operacional curta para usuário em onboarding.",
  },
  {
    id: "courtesy-30",
    label: "30 dias de cortesia",
    description: "Cortesia promocional para relacionamento ou recuperação.",
    grantType: "courtesy",
    durationValue: "30",
    reason: "Cortesia promocional por 30 dias.",
    notes: "Concessão operacional promocional com prazo definido.",
  },
  {
    id: "partner-90",
    label: "Parceiro 90 dias",
    description: "Janela maior para parceiro ativo.",
    grantType: "partner",
    durationValue: "90",
    reason: "Concessão vinculada a parceria ativa.",
    notes: "Parceria comercial com revisão prevista em 90 dias.",
  },
  {
    id: "staff-lifetime",
    label: "Equipe sem prazo",
    description: "Acesso interno para operação recorrente.",
    grantType: "staff",
    durationValue: "none",
    reason: "Acesso interno da equipe.",
    notes: "Concessão operacional sem prazo para rotina interna.",
  },
] as const;

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

export interface BillingAuditLogSummary {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BillingManualGrantsPayload {
  targetUser: FirebaseAdminUserSummary;
  access: BillingManualGrantAccessSummary;
  subscription: BillingManualGrantSubscriptionSummary | null;
  grants: ManualAccessGrantRecord[];
  auditLogs: BillingAuditLogSummary[];
  operatorUsers?: Record<string, FirebaseAdminUserSummary>;
}

export interface BillingManualGrantUsersPayload {
  users: FirebaseAdminUserSummary[];
  nextPageToken: string | null;
}

export function canManageManualGrants(roles: readonly AppRole[]): boolean {
  return hasBillingPermission(roles, "billing:manual-grants:manage");
}
