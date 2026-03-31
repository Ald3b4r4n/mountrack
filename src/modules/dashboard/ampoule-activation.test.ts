import {
  buildAmpouleActivationState,
  requiresSameDayAmpouleDecision,
  shouldStartFreshAmpoule,
} from "@/modules/dashboard/ampoule-activation";

describe("ampoule-activation", () => {
  it("flags when the opening date matches the latest recorded dose", () => {
    expect(
      requiresSameDayAmpouleDecision({
        requestedOpenedOn: "2026-03-31",
        latestDoseApplicationDate: "2026-03-31",
      }),
    ).toBe(true);
    expect(
      requiresSameDayAmpouleDecision({
        requestedOpenedOn: "2026-03-30",
        latestDoseApplicationDate: "2026-03-31",
      }),
    ).toBe(false);
  });

  it("detects when a chosen opening date should start a fresh ampoule", () => {
    expect(
      shouldStartFreshAmpoule({
        requestedOpenedOn: "2026-03-31",
        latestDoseApplicationDate: "2026-03-24",
      }),
    ).toBe(true);
    expect(
      shouldStartFreshAmpoule({
        requestedOpenedOn: "2026-03-24",
        latestDoseApplicationDate: "2026-03-24",
      }),
    ).toBe(false);
    expect(
      shouldStartFreshAmpoule({
        requestedOpenedOn: "2026-03-24",
        latestDoseApplicationDate: "2026-03-24",
        sameDayIntent: "new-ampoule",
      }),
    ).toBe(true);
  });

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

  it("starts a fresh ampoule when the chosen opening date is after the latest recorded dose", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 6,
        dosesPerAmpoule: 12,
        requestedOpenedOn: "2026-03-31",
        latestDoseApplicationDate: "2026-03-24",
      }),
    ).toEqual({
      actionLabel: "Iniciar ampola atual",
      helperText:
        "A data escolhida vem depois da ultima dose registrada. A nova ampola comeca zerada a partir dessa abertura.",
      completedAmpoulesCount: 0,
      activeAmpouleStartDoseApplications: 6,
    });
  });

  it("lets the user start a fresh ampoule on the same day when that intent is explicit", () => {
    expect(
      buildAmpouleActivationState({
        totalDoseApplications: 6,
        dosesPerAmpoule: 12,
        requestedOpenedOn: "2026-03-31",
        latestDoseApplicationDate: "2026-03-31",
        sameDayIntent: "new-ampoule",
      }),
    ).toEqual({
      actionLabel: "Iniciar ampola atual",
      helperText:
        "Voce marcou que a nova ampola comecou depois da aplicacao de hoje. O novo ciclo inicia zerado.",
      completedAmpoulesCount: 0,
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
