import { DEFAULT_DOSES_PER_AMPOULE } from "@/modules/dashboard/utils";

export interface AmpouleActivationState {
  actionLabel: string;
  helperText: string;
  completedAmpoulesCount: number;
  activeAmpouleStartDoseApplications: number;
}

export interface BuildAmpouleActivationStateInput {
  totalDoseApplications: number;
  dosesPerAmpoule: number;
  trackedCompletedAmpoulesCount?: number;
  hasTrackedHistory?: boolean;
}

export function buildAmpouleActivationState({
  totalDoseApplications,
  dosesPerAmpoule,
  trackedCompletedAmpoulesCount = 0,
  hasTrackedHistory = false,
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
