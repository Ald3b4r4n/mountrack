import {
  formatGrams,
  formatHistoryDate,
  getFoodLabel,
} from "@/modules/nutrition/ui-helpers";

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
    expect(formatHistoryDate("2026-03-15")).toBe("15/03/2026");
  });

  it("keeps invalid calendar dates untouched", () => {
    expect(formatHistoryDate("2026-99-99")).toBe("2026-99-99");
  });

  it("formats stable history timestamps without shifting the calendar day", () => {
    const d = new Date("2026-03-14T12:00:00.000Z");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const expected = `${day}/${month}/${year}`;

    expect(formatHistoryDate("2026-03-14T12:00:00.000Z")).toBe(expected);
  });

  it("sanitizes mojibake artifacts in food labels", () => {
    expect(
      getFoodLabel({
        id: "food-1",
        source: "tbca",
        name: "Frango, filé, �� milanesa",
        baseUnit: "g",
        confidenceScore: 1,
        mealCategories: [],
      }),
    ).toBe("Frango, filé, à milanesa");
  });
});
