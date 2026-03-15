import { toStableHistoryDate } from "@/modules/nutrition/history-date";

describe("toStableHistoryDate", () => {
  it("preserves local calendar dates when the source value is a Date", () => {
    expect(toStableHistoryDate(new Date(2026, 2, 14))).toBe("2026-03-14T12:00:00.000Z");
  });

  it("keeps plain calendar strings stable for the client", () => {
    expect(toStableHistoryDate("2026-03-14")).toBe("2026-03-14T12:00:00.000Z");
  });
});
