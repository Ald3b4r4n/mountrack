import {
  getDefaultFocusedMeal,
  getMealFocusForHour,
} from "@/components/nutrition/nutrition-screen-helpers";
import { MEAL_FOCUS_WINDOWS } from "@/modules/nutrition/meal-focus-windows";

describe("nutrition screen helpers — meal focus windows", () => {
  it.each([
    [0, 0, "breakfast"],
    [5, 59, "breakfast"],
    [6, 0, "breakfast"],
    [11, 0, "breakfast"],
    [11, 1, "lunch"],
    [14, 0, "lunch"],
    [14, 1, "snack"],
    [18, 0, "snack"],
    [18, 1, "dinner"],
    [23, 59, "dinner"],
  ])("maps %i:%i to %s", (hour, minute, expectedMeal) => {
    expect(getMealFocusForHour(hour, minute)).toBe(expectedMeal);
  });

  it("derives the focused meal from the provided date", () => {
    expect(getDefaultFocusedMeal(new Date("2026-04-18T07:30:00"))).toBe(
      "breakfast",
    );
    expect(getDefaultFocusedMeal(new Date("2026-04-18T11:01:00"))).toBe(
      "lunch",
    );
    expect(getDefaultFocusedMeal(new Date("2026-04-18T00:10:00"))).toBe(
      "breakfast",
    );
  });

  it("never returns a custom:* value from getDefaultFocusedMeal", () => {
    const allowed = new Set(MEAL_FOCUS_WINDOWS.map((w) => w.mealType));
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 1, 30, 59]) {
        const result = getDefaultFocusedMeal(
          new Date(2026, 3, 18, hour, minute, 0),
        );
        expect(allowed.has(result)).toBe(true);
      }
    }
  });
});
