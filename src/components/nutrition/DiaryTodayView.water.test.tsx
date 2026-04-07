import { fireEvent, render, screen } from "@testing-library/react";
import { DiaryTodayView } from "@/components/nutrition/DiaryTodayView";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

describe("DiaryTodayView water quick-add", () => {
  const mealDefinitions: MealDefinition[] = [
    { key: "breakfast", label: "Cafe" },
    { key: "lunch", label: "Almoco" },
  ];

  it("triggers only quick-add adjustment for 250ml and 500ml buttons", () => {
    const handleAdjustWater = jest.fn();

    render(
      <DiaryTodayView
        summary={{
          targetWaterMl: 2200,
          waterIntakeMl: 1200,
          meals: { breakfast: 300, lunch: 450 },
        }}
        waterRatio={55}
        isMobileLayout
        handleAdjustWater={handleAdjustWater}
        isUpdatingWater={false}
        mealDefinitions={mealDefinitions}
        activeDiaryMeal="breakfast"
        groupedDiaryItems={{ breakfast: [], lunch: [] }}
        handleDeleteDiaryItem={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /250/i }));
    fireEvent.click(screen.getByRole("button", { name: /500/i }));

    expect(handleAdjustWater).toHaveBeenNthCalledWith(1, 250);
    expect(handleAdjustWater).toHaveBeenNthCalledWith(2, 500);
    expect(handleAdjustWater).toHaveBeenCalledTimes(2);
  });
});
