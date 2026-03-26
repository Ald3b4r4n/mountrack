import {
  getDefaultFocusedMeal,
  getMealFocusForHour,
} from "@/components/nutrition/nutrition-screen-helpers";

describe("nutrition screen helpers", () => {
  it.each([
    [0, "breakfast"],
    [8, "breakfast"],
    [11, "breakfast"],
    [12, "lunch"],
    [13, "lunch"],
    [14, "snack"],
    [17, "snack"],
    [18, "dinner"],
    [23, "dinner"],
  ])("maps hour %i to %s", (hour, expectedMeal) => {
    expect(getMealFocusForHour(hour)).toBe(expectedMeal);
  });

  it("derives the focused meal from the provided date", () => {
    expect(getDefaultFocusedMeal(new Date("2026-03-15T12:30:00"))).toBe("lunch");
  });

  it("switches to snack at 14:00 and dinner at 18:00", () => {
    expect(getDefaultFocusedMeal(new Date("2026-03-15T14:00:00"))).toBe(
      "snack",
    );
    expect(getDefaultFocusedMeal(new Date("2026-03-15T18:00:00"))).toBe(
      "dinner",
    );
  });
});
