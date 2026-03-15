import {
  getDefaultFocusedMeal,
  getMealFocusForHour,
} from "@/components/nutrition/nutrition-screen-helpers";

describe("nutrition screen helpers", () => {
  it.each([
    [5, "breakfast"],
    [10, "breakfast"],
    [11, "lunch"],
    [14, "lunch"],
    [15, "snack"],
    [18, "snack"],
    [0, "dinner"],
    [4, "dinner"],
    [19, "dinner"],
    [23, "dinner"],
  ])("maps hour %i to %s", (hour, expectedMeal) => {
    expect(getMealFocusForHour(hour)).toBe(expectedMeal);
  });

  it("derives the focused meal from the provided date", () => {
    expect(getDefaultFocusedMeal(new Date("2026-03-15T12:30:00"))).toBe("lunch");
  });
});
