import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealSectionHeader } from "@/components/nutrition/MealSectionHeader";

describe("MealSectionHeader", () => {
  // T018a — calorie total hidden when 0 items
  it("does not show calorie total when totalCalories is 0", () => {
    render(
      <MealSectionHeader
        label="Café da Manhã"
        mealType="breakfast"
        totalCalories={0}
        isExpanded={false}
        onToggle={jest.fn()}
        onAddItem={jest.fn()}
      />,
    );

    expect(screen.queryByText(/kcal/i)).not.toBeInTheDocument();
  });

  // T018b — calorie total shown when items exist
  it("shows calorie total when totalCalories is greater than 0", () => {
    render(
      <MealSectionHeader
        label="Café da Manhã"
        mealType="breakfast"
        totalCalories={274}
        isExpanded={false}
        onToggle={jest.fn()}
        onAddItem={jest.fn()}
      />,
    );

    expect(screen.getByText(/274/)).toBeInTheDocument();
  });

  // T019a — toggle callback on header tap
  it("calls onToggle when the header area is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    render(
      <MealSectionHeader
        label="Almoço"
        mealType="lunch"
        totalCalories={0}
        isExpanded={false}
        onToggle={onToggle}
        onAddItem={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Almoço" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // T019b — add item callback on + button
  it("calls onAddItem when the + button is clicked", async () => {
    const user = userEvent.setup();
    const onAddItem = jest.fn();

    render(
      <MealSectionHeader
        label="Jantar"
        mealType="dinner"
        totalCalories={0}
        isExpanded={false}
        onToggle={jest.fn()}
        onAddItem={onAddItem}
      />,
    );

    await user.click(screen.getByRole("button", { name: /adicionar/i }));

    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it("does not call onAddItem when the header toggle button is clicked", async () => {
    const user = userEvent.setup();
    const onAddItem = jest.fn();

    render(
      <MealSectionHeader
        label="Jantar"
        mealType="dinner"
        totalCalories={0}
        isExpanded={false}
        onToggle={jest.fn()}
        onAddItem={onAddItem}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Jantar" }));

    expect(onAddItem).not.toHaveBeenCalled();
  });
});
