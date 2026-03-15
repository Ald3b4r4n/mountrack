const STABLE_HISTORY_TIME_SUFFIX = "T12:00:00.000Z";

export function toStableHistoryDate(dateString: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? `${dateString}${STABLE_HISTORY_TIME_SUFFIX}`
    : dateString;
}
