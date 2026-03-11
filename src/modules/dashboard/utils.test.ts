import {
  buildGoogleCalendarLink,
  calculateDoseCountdown,
  calculateJourneyDoseStats,
  calculateWeightGoalProgress,
  formatChartDateLabel,
  generateAreaFillPath,
  generateSmoothSvgPath,
  getChartDateLabelIndices,
  parseLogDate,
} from "@/modules/dashboard/utils";

const points = [
  { weight: 90, date: "2026-03-01" },
  { weight: 88.5, date: "2026-03-08" },
  { weight: 87.2, date: "2026-03-15" },
];

describe("dashboard utils", () => {
  it("parses log dates in local-safe mode", () => {
    const parsed = parseLogDate("2026-03-09");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(9);
    expect(parsed.getHours()).toBe(12);
  });

  it("generates a smooth SVG path for chart points", () => {
    const path = generateSmoothSvgPath(points, 600, 260, 40);

    expect(path.startsWith("M ")).toBe(true);
    expect(path.includes(" C ")).toBe(true);
  });

  it("generates an area fill path under the curve", () => {
    const path = generateAreaFillPath(points, 600, 260, 40);

    expect(path.endsWith(" Z")).toBe(true);
  });

  it("builds a Google Calendar reminder link", () => {
    const link = buildGoogleCalendarLink({
      daysUntil: 3,
      isDoseOverdue: false,
      title: "Aplicação Mounjaro",
      details: "Lembrete semanal",
      now: new Date("2026-03-07T12:00:00.000Z"),
    });

    expect(link).toContain("calendar.google.com");
    expect(link).toContain("action=TEMPLATE");
  });

  it("calculates journey and ampoule stats from dose logs", () => {
    const stats = calculateJourneyDoseStats(
      [
        { date: "2026-03-09", type: "weight" },
        { date: "2026-03-03", type: "dose", dose: 2.5 },
        { date: "2026-02-24", type: "dose", dose: 2.5 },
        { date: "2026-02-17", type: "dose", dose: 2.5 },
        { date: "2026-02-10", type: "dose", dose: 2.5 },
        { date: "2026-02-03", type: "dose", dose: 2.5 },
      ],
      new Date("2026-03-09T09:00:00.000Z"),
    );

    expect(stats.totalDoseApplications).toBe(5);
    expect(stats.ampoulesUsed).toBe(2);
    expect(stats.dosesUsedFromCurrentAmpoule).toBe(1);
    expect(stats.hasActiveAmpoule).toBe(false);
    expect(stats.currentAmpouleOpenedOn).toBeNull();
    expect(stats.isCurrentAmpouleComplete).toBe(false);
    expect(stats.journeyDays).toBeGreaterThan(30);
  });

  it("returns zeroed countdown when target already passed", () => {
    const countdown = calculateDoseCountdown(
      new Date("2026-03-09T08:00:00.000Z"),
      new Date("2026-03-09T09:00:00.000Z"),
    );

    expect(countdown).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });

  it("formats chart labels and picks readable indices", () => {
    expect(formatChartDateLabel("2026-03-09")).toBe("09/03");
    expect(getChartDateLabelIndices(8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("includes prior manual applications in ampoule stats", () => {
    const stats = calculateJourneyDoseStats(
      [{ date: "2026-03-09", type: "dose", dose: 2.5 }],
      new Date("2026-03-09T09:00:00.000Z"),
      4,
      3,
    );

    expect(stats.totalDoseApplications).toBe(4);
    expect(stats.ampoulesUsed).toBe(1);
    expect(stats.dosesUsedFromCurrentAmpoule).toBe(4);
    expect(stats.hasActiveAmpoule).toBe(false);
    expect(stats.isCurrentAmpouleComplete).toBe(true);
  });

  it("prefers explicit ampoule lifecycle tracking over arithmetic fallback", () => {
    const stats = calculateJourneyDoseStats(
      [
        { date: "2026-03-10", type: "dose", dose: 2.5 },
        { date: "2026-03-03", type: "dose", dose: 2.5 },
        { date: "2026-02-24", type: "dose", dose: 2.5 },
        { date: "2026-02-17", type: "dose", dose: 2.5 },
        { date: "2026-02-10", type: "dose", dose: 2.5 },
      ],
      new Date("2026-03-10T09:00:00.000Z"),
      4,
      0,
      {
        completedAmpoulesCount: 1,
        activeAmpouleOpenedOn: "2026-03-01",
        activeAmpouleStartDoseApplications: 4,
      },
    );

    expect(stats.totalDoseApplications).toBe(5);
    expect(stats.ampoulesUsed).toBe(2);
    expect(stats.dosesUsedFromCurrentAmpoule).toBe(1);
    expect(stats.hasActiveAmpoule).toBe(true);
    expect(stats.currentAmpouleOpenedOn).toBe("2026-03-01");
    expect(stats.isCurrentAmpouleComplete).toBe(false);
  });

  it("keeps manual ampoule completion count even when there is no active ampoule", () => {
    const stats = calculateJourneyDoseStats(
      [
        { date: "2026-03-10", type: "dose", dose: 2.5 },
        { date: "2026-03-03", type: "dose", dose: 2.5 },
        { date: "2026-02-24", type: "dose", dose: 2.5 },
        { date: "2026-02-17", type: "dose", dose: 2.5 },
      ],
      new Date("2026-03-10T09:00:00.000Z"),
      4,
      0,
      {
        completedAmpoulesCount: 2,
      },
    );

    expect(stats.totalDoseApplications).toBe(4);
    expect(stats.ampoulesUsed).toBe(2);
    expect(stats.dosesUsedFromCurrentAmpoule).toBe(0);
    expect(stats.hasActiveAmpoule).toBe(false);
    expect(stats.isCurrentAmpouleComplete).toBe(false);
  });

  it("calculates goal progress by completed weight loss instead of target/current ratio", () => {
    const progress = calculateWeightGoalProgress(
      [
        { weight: 99.2, date: "2026-03-10" },
        { weight: 106, date: "2026-02-01" },
      ],
      80,
    );

    expect(progress.startingWeight).toBe(106);
    expect(progress.currentWeight).toBe(99.2);
    expect(progress.totalRequiredChange).toBe(26);
    expect(progress.completedChange).toBe(6.8);
    expect(progress.remainingChange).toBe(19.2);
    expect(progress.progressPercent).toBe(26.2);
  });

  it("clamps goal progress at 100 percent when the target is reached", () => {
    const progress = calculateWeightGoalProgress(
      [
        { weight: 79.8, date: "2026-03-10" },
        { weight: 106, date: "2026-02-01" },
      ],
      80,
    );

    expect(progress.progressPercent).toBe(100);
    expect(progress.isGoalReached).toBe(true);
    expect(progress.remainingChange).toBe(0);
  });
});
