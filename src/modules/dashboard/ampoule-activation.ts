import { DEFAULT_DOSES_PER_AMPOULE } from "@/modules/dashboard/utils";

export interface AmpouleActivationState {
  actionLabel: string;
  helperText: string;
  completedAmpoulesCount: number;
  activeAmpouleStartDoseApplications: number;
}

export type SameDayAmpouleIntent = "new-ampoule" | "existing-ampoule";

export interface BuildAmpouleActivationStateInput {
  totalDoseApplications: number;
  dosesPerAmpoule: number;
  trackedCompletedAmpoulesCount?: number;
  hasTrackedHistory?: boolean;
  requestedOpenedOn?: string | null;
  latestDoseApplicationDate?: string | null;
  sameDayIntent?: SameDayAmpouleIntent | null;
}

function normalizeDateOnly(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : null;
}

export function shouldStartFreshAmpoule({
  requestedOpenedOn,
  latestDoseApplicationDate,
  sameDayIntent,
}: {
  requestedOpenedOn?: string | null;
  latestDoseApplicationDate?: string | null;
  sameDayIntent?: SameDayAmpouleIntent | null;
}): boolean {
  const normalizedRequestedOpenedOn = normalizeDateOnly(requestedOpenedOn);
  const normalizedLatestDoseApplicationDate = normalizeDateOnly(
    latestDoseApplicationDate,
  );

  if (!normalizedRequestedOpenedOn || !normalizedLatestDoseApplicationDate) {
    return false;
  }

  if (normalizedRequestedOpenedOn > normalizedLatestDoseApplicationDate) {
    return true;
  }

  if (normalizedRequestedOpenedOn < normalizedLatestDoseApplicationDate) {
    return false;
  }

  return sameDayIntent === "new-ampoule";
}

export function requiresSameDayAmpouleDecision({
  requestedOpenedOn,
  latestDoseApplicationDate,
}: {
  requestedOpenedOn?: string | null;
  latestDoseApplicationDate?: string | null;
}): boolean {
  const normalizedRequestedOpenedOn = normalizeDateOnly(requestedOpenedOn);
  const normalizedLatestDoseApplicationDate = normalizeDateOnly(
    latestDoseApplicationDate,
  );

  return Boolean(
    normalizedRequestedOpenedOn &&
      normalizedLatestDoseApplicationDate &&
      normalizedRequestedOpenedOn === normalizedLatestDoseApplicationDate,
  );
}

export function buildAmpouleActivationState({
  totalDoseApplications,
  dosesPerAmpoule,
  trackedCompletedAmpoulesCount = 0,
  hasTrackedHistory = false,
  requestedOpenedOn,
  latestDoseApplicationDate,
  sameDayIntent,
}: BuildAmpouleActivationStateInput): AmpouleActivationState {
  const safeDosesPerAmpoule = Math.max(
    1,
    Math.round(dosesPerAmpoule || DEFAULT_DOSES_PER_AMPOULE),
  );
  const safeTotalDoseApplications = Math.max(
    0,
    Math.round(totalDoseApplications || 0),
  );
  const safeTrackedCompletedAmpoulesCount = Math.max(
    0,
    Math.floor(trackedCompletedAmpoulesCount || 0),
  );
  const hasExplicitAmpouleTracking =
    hasTrackedHistory || safeTrackedCompletedAmpoulesCount > 0;

  if (safeTotalDoseApplications === 0) {
    return {
      actionLabel: "Iniciar ampola atual",
      helperText: "A ampola atual comeca zerada a partir da data escolhida.",
      completedAmpoulesCount: safeTrackedCompletedAmpoulesCount,
      activeAmpouleStartDoseApplications: 0,
    };
  }

  if (hasExplicitAmpouleTracking) {
    return {
      actionLabel: "Iniciar ampola atual",
      helperText:
        "As ampolas anteriores ja estao separadas no historico. A nova ampola comeca zerada a partir da data escolhida.",
      completedAmpoulesCount: safeTrackedCompletedAmpoulesCount,
      activeAmpouleStartDoseApplications: safeTotalDoseApplications,
    };
  }

  if (
    shouldStartFreshAmpoule({
      requestedOpenedOn,
      latestDoseApplicationDate,
      sameDayIntent,
    })
  ) {
    const helperText = requiresSameDayAmpouleDecision({
      requestedOpenedOn,
      latestDoseApplicationDate,
    })
      ? "Voce marcou que a nova ampola comecou depois da aplicacao de hoje. O novo ciclo inicia zerado."
      : "A data escolhida vem depois da ultima dose registrada. A nova ampola comeca zerada a partir dessa abertura.";

    return {
      actionLabel: "Iniciar ampola atual",
      helperText,
      completedAmpoulesCount: safeTrackedCompletedAmpoulesCount,
      activeAmpouleStartDoseApplications: safeTotalDoseApplications,
    };
  }

  const remainder = safeTotalDoseApplications % safeDosesPerAmpoule;

  if (remainder === 0) {
    return {
      actionLabel: "Iniciar ampola atual",
      helperText:
        "As aplicacoes anteriores ja fecharam ampolas completas. A proxima ampola comeca zerada.",
      completedAmpoulesCount: safeTotalDoseApplications / safeDosesPerAmpoule,
      activeAmpouleStartDoseApplications: safeTotalDoseApplications,
    };
  }

  return {
    actionLabel: "Assumir ampola atual",
    helperText:
      "O sistema preserva o progresso ja em andamento da ampola atual quando voce iniciar o controle manual.",
    completedAmpoulesCount: Math.floor(
      safeTotalDoseApplications / safeDosesPerAmpoule,
    ),
    activeAmpouleStartDoseApplications:
      safeTotalDoseApplications - remainder,
  };
}
