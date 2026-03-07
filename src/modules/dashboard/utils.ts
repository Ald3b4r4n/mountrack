export interface WeightChartPoint {
  weight: number;
  date: string;
}

export interface CalendarLinkInput {
  daysUntil: number;
  isDoseOverdue: boolean;
  title: string;
  details: string;
  now?: Date;
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

