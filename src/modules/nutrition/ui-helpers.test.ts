import { formatGrams } from "@/modules/nutrition/ui-helpers";

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
});
