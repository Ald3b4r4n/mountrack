import type { DefaultMealType } from "@/modules/nutrition/domain/types";

export interface MealFocusWindow {
  mealType: DefaultMealType;
  startMinutes: number;
  endMinutes: number;
}

export const MEAL_FOCUS_WINDOWS: ReadonlyArray<MealFocusWindow> = [
  { mealType: "breakfast", startMinutes: 0, endMinutes: 660 },
  { mealType: "lunch", startMinutes: 661, endMinutes: 840 },
  { mealType: "snack", startMinutes: 841, endMinutes: 1080 },
  { mealType: "dinner", startMinutes: 1081, endMinutes: 1439 },
];

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function getMealFocusForHour(
  hour: number,
  minute: number,
): DefaultMealType {
  const safeHour = Number.isFinite(hour) ? clamp(Math.trunc(hour), 0, 23) : 0;
  const safeMinute = Number.isFinite(minute)
    ? clamp(Math.trunc(minute), 0, 59)
    : 0;
  const minutes = safeHour * 60 + safeMinute;

  for (const window of MEAL_FOCUS_WINDOWS) {
    if (minutes >= window.startMinutes && minutes <= window.endMinutes) {
      return window.mealType;
    }
  }

  return "breakfast";
}

export function getMealFocusWindow(mealType: DefaultMealType): {
  start: number;
  end: number;
} {
  const window = MEAL_FOCUS_WINDOWS.find((w) => w.mealType === mealType);
  if (!window) {
    return { start: 0, end: 660 };
  }
  return { start: window.startMinutes, end: window.endMinutes };
}

export function getDefaultFocusedMeal(
  now: Date = new Date(),
): DefaultMealType {
  return getMealFocusForHour(now.getHours(), now.getMinutes());
}

export function getMinutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}
