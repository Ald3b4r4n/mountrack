export interface WeightChartPoint {
  weight: number;
  date: string;
}

export interface DashboardLogSummary {
  date: string;
  type?: string;
  dose?: number;
}

export interface CalendarLinkInput {
  daysUntil: number;
  isDoseOverdue: boolean;
  title: string;
  details: string;
  now?: Date;
}

export interface DoseCountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
}

export interface JourneyDoseStats {
  ampoulesUsed: number;
  dosesUsedFromCurrentAmpoule: number;
  journeyDays: number | null;
  totalDoseApplications: number;
}

export const DEFAULT_DOSES_PER_AMPOULE = 4;

export function parseLogDate(date: string): Date {
  const [dateOnly] = date.split("T");
  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function formatChartDateLabel(date: string): string {
  return parseLogDate(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getChartDateLabelIndices(pointCount: number): number[] {
  if (pointCount <= 0) return [];

  if (pointCount <= 10) {
    return Array.from({ length: pointCount }, (_, index) => index);
  }

  const indices = new Set<number>([0, pointCount - 1, Math.floor((pointCount - 1) / 2)]);
  const step = 2;

  for (let index = 0; index < pointCount; index += step) {
    indices.add(index);
  }

  return Array.from(indices).sort((left, right) => left - right);
}

export function calculateDoseCountdown(
  targetDate: Date,
  now = new Date(),
): DoseCountdownParts {
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { d: 0, h: 0, m: 0, s: 0 };
  }

  return {
    d: Math.floor(difference / (1000 * 60 * 60 * 24)),
    h: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    m: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    s: Math.floor((difference % (1000 * 60)) / 1000),
  };
}

export function calculateJourneyDoseStats(
  logs: DashboardLogSummary[],
  now = new Date(),
  dosesPerAmpoule = DEFAULT_DOSES_PER_AMPOULE,
  previousDoseApplications = 0,
): JourneyDoseStats {
  const safeDosesPerAmpoule = Math.max(
    1,
    Math.floor(Number.isFinite(dosesPerAmpoule) ? dosesPerAmpoule : DEFAULT_DOSES_PER_AMPOULE),
  );
  const safePreviousDoseApplications = Math.max(
    0,
    Math.floor(Number.isFinite(previousDoseApplications) ? previousDoseApplications : 0),
  );

  if (logs.length === 0 && safePreviousDoseApplications === 0) {
    return {
      ampoulesUsed: 0,
      dosesUsedFromCurrentAmpoule: 0,
      journeyDays: null,
      totalDoseApplications: 0,
    };
  }

  const oldestLog = [...logs].sort(
    (left, right) => parseLogDate(left.date).getTime() - parseLogDate(right.date).getTime(),
  )[0];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const oldestDate = oldestLog ? parseLogDate(oldestLog.date) : null;
  oldestDate?.setHours(0, 0, 0, 0);

  const differenceInDays =
    oldestDate !== null
      ? Math.max(0, Math.round((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const loggedDoseApplications = logs.filter(
    (log) => Boolean(log.dose) || log.type === "dose",
  ).length;
  const totalDoseApplications = loggedDoseApplications + safePreviousDoseApplications;
  const ampoulesUsed =
    totalDoseApplications > 0 ? Math.ceil(totalDoseApplications / safeDosesPerAmpoule) : 0;
  const dosesUsedFromCurrentAmpoule =
    totalDoseApplications > 0 ? ((totalDoseApplications - 1) % safeDosesPerAmpoule) + 1 : 0;

  return {
    ampoulesUsed,
    dosesUsedFromCurrentAmpoule,
    journeyDays: differenceInDays !== null ? differenceInDays + 1 : null,
    totalDoseApplications,
  };
}

export function generateSmoothSvgPath(
  points: WeightChartPoint[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length < 2) return "";

  const maxWeight = Math.max(...points.map((point) => point.weight));
  const minWeight = Math.min(...points.map((point) => point.weight));
  const range = maxWeight - minWeight || 1;

  const coordinates = points.map((point, index) => ({
    x: padding + (index / (points.length - 1)) * (width - padding * 2),
    y: padding + (1 - (point.weight - minWeight) / range) * (height - padding * 2),
  }));

  let path = `M ${coordinates[0]?.x},${coordinates[0]?.y}`;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const current = coordinates[index];
    const next = coordinates[index + 1];
    if (!current || !next) continue;

    const cp1x = current.x + (next.x - current.x) / 3;
    const cp1y = current.y;
    const cp2x = next.x - (next.x - current.x) / 3;
    const cp2y = next.y;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  return path;
}

export function generateAreaFillPath(
  points: WeightChartPoint[],
  width: number,
  height: number,
  padding: number,
): string {
  const linePath = generateSmoothSvgPath(points, width, height, padding);
  if (!linePath || points.length < 2) return "";

  return `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
}

export function buildGoogleCalendarLink({
  daysUntil,
  isDoseOverdue,
  title,
  details,
  now = new Date(),
}: CalendarLinkInput): string {
  const appointmentDate = new Date(now);
  appointmentDate.setDate(appointmentDate.getDate() + (isDoseOverdue ? 0 : daysUntil));
  appointmentDate.setHours(8, 0, 0, 0);

  const endDate = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
  const formatGoogleDate = (value: Date) =>
    value.toISOString().replace(/-|:|\.\d\d\d/g, "");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${formatGoogleDate(appointmentDate)}/${formatGoogleDate(endDate)}`;
}
