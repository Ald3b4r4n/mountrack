const STABLE_HISTORY_TIME_SUFFIX = "T12:00:00.000Z";

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatCalendarDate(date: Date): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function toStableHistoryDate(dateValue: string | Date): string {
  if (dateValue instanceof Date) {
    return `${formatCalendarDate(dateValue)}${STABLE_HISTORY_TIME_SUFFIX}`;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? `${dateValue}${STABLE_HISTORY_TIME_SUFFIX}`
    : dateValue;
}
