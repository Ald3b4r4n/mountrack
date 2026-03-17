import {
  buildNextHydrationDraft,
  buildNextWaterIntake,
} from "@/modules/nutrition/services/hydration-input";

describe("hydration input helpers", () => {
  it("adds quick increments to the draft instead of replacing with the current total", () => {
    expect(buildNextHydrationDraft("", 250)).toBe("250");
    expect(buildNextHydrationDraft("250", 500)).toBe("750");
  });

  it("adds the typed amount on top of the current daily intake", () => {
    expect(buildNextWaterIntake(500, "500")).toBe(1000);
    expect(buildNextWaterIntake(1250, "250")).toBe(1500);
  });

  it("never resets existing intake during quick add", () => {
    expect(buildNextWaterIntake(1800, "250", "increment")).toBe(2050);
    expect(buildNextWaterIntake(1800, "500", "increment")).toBe(2300);
  });

  it("lets the user correct the absolute daily total when they logged water incorrectly", () => {
    expect(buildNextWaterIntake(2000, "1500", "absolute")).toBe(1500);
    expect(buildNextWaterIntake(750, "0", "absolute")).toBe(0);
  });

  it("rejects empty or non-positive increments", () => {
    expect(buildNextWaterIntake(500, "")).toBeNull();
    expect(buildNextWaterIntake(500, "0")).toBeNull();
  });

  it("rejects invalid absolute corrections", () => {
    expect(buildNextWaterIntake(500, "", "absolute")).toBeNull();
    expect(buildNextWaterIntake(500, "-10", "absolute")).toBeNull();
  });
});
