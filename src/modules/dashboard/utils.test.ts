import {
  buildGoogleCalendarLink,
  generateAreaFillPath,
  generateSmoothSvgPath,
} from "@/modules/dashboard/utils";

const points = [
  { weight: 90, date: "2026-03-01" },
  { weight: 88.5, date: "2026-03-08" },
  { weight: 87.2, date: "2026-03-15" },
];

describe("dashboard utils", () => {
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
});

