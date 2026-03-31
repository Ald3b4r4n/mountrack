import { buildAmpouleActivationState } from "@/modules/dashboard/ampoule-activation";

describe("ampoule-activation", () => {
  it("starts a new ampoule at zero when there is no prior usage", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 0,
        dosesPerAmpoule: 12,
      }),
    ).toEqual({
      actionLabel: "Iniciar ampola atual",
      helperText: "A ampola atual comeca zerada a partir da data escolhida.",
      completedAmpoulesCount: 0,
      activeAmpouleStartDoseApplications: 0,
    });
  });

  it("preserves tracked ampoule history and starts a fresh cycle from the current total", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 6,
        dosesPerAmpoule: 12,
        trackedCompletedAmpoulesCount: 1,
        hasTrackedHistory: true,
      }),
    ).toEqual({
      actionLabel: "Iniciar ampola atual",
      helperText:
        "As ampolas anteriores ja estao separadas no historico. A nova ampola comeca zerada a partir da data escolhida.",
      completedAmpoulesCount: 1,
      activeAmpouleStartDoseApplications: 6,
    });
  });

  it("keeps legacy arithmetic fallback only when no explicit ampoule history exists", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 6,
        dosesPerAmpoule: 12,
      }),
    ).toEqual({
      actionLabel: "Assumir ampola atual",
      helperText:
        "O sistema preserva o progresso ja em andamento da ampola atual quando voce iniciar o controle manual.",
      completedAmpoulesCount: 0,
      activeAmpouleStartDoseApplications: 0,
    });
  });

  it("starts a fresh ampoule when legacy totals close complete ampoules", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 12,
        dosesPerAmpoule: 6,
      }),
    ).toEqual({
      actionLabel: "Iniciar ampola atual",
      helperText:
        "As aplicacoes anteriores ja fecharam ampolas completas. A proxima ampola comeca zerada.",
      completedAmpoulesCount: 2,
      activeAmpouleStartDoseApplications: 12,
    });
  });
});
