import { formatGrams, formatHistoryDate } from "@/modules/nutrition/ui-helpers";

describe("nutrition ui helpers", () => {
  it("keeps useful decimal precision for gram values", () => {
    expect(formatGrams(1.8)).toBe("1,8 g");
    expect(formatGrams(3.54)).toBe("3,54 g");
    expect(formatGrams(15.72)).toBe("15,72 g");
  });

  it("keeps whole gram values without trailing decimals", () => {
    expect(formatGrams(2)).toBe("2 g");
    expect(formatGrams(140)).toBe("140 g");
  });

  it("formats plain calendar dates without shifting them to the previous day", () => {
    const expected = new Date(2026, 2, 15)
      .toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
      .replace(".", "");

    expect(formatHistoryDate("2026-03-15")).toBe(expected);
  });

  it("keeps invalid calendar dates untouched", () => {
    expect(formatHistoryDate("2026-99-99")).toBe("2026-99-99");
  });
});
