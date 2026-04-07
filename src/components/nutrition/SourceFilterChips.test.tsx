import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceFilterChips } from "@/components/nutrition/SourceFilterChips";
import type { FoodSource } from "@/modules/nutrition/domain/types";

type FilterSource = "all" | FoodSource;

describe("SourceFilterChips", () => {
  it("renders a chip for each available source", () => {
    render(
      <SourceFilterChips
        activeSource="all"
        onChange={jest.fn()}
        availableSources={["all", "fatsecret", "custom"]}
      />,
    );

    expect(screen.getByText(/Todos/i)).toBeInTheDocument();
    expect(screen.getByText(/FatSecret/i)).toBeInTheDocument();
    expect(screen.getByText(/Meus Alimentos/i)).toBeInTheDocument();
  });

  it("calls onChange with the selected source when a chip is clicked", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <SourceFilterChips
        activeSource="all"
        onChange={onChange}
        availableSources={["all", "fatsecret", "custom"]}
      />,
    );

    await user.click(screen.getByText(/FatSecret/i));

    expect(onChange).toHaveBeenCalledWith("fatsecret" as FilterSource);
  });

  it("marks the active source chip with aria-pressed=true", () => {
    render(
      <SourceFilterChips
        activeSource="fatsecret"
        onChange={jest.fn()}
        availableSources={["all", "fatsecret"]}
      />,
    );

    const fatsecretChip = screen.getByText(/FatSecret/i).closest("button");
    expect(fatsecretChip).toHaveAttribute("aria-pressed", "true");

    const allChip = screen.getByText(/Todos/i).closest("button");
    expect(allChip).toHaveAttribute("aria-pressed", "false");
  });

  it("does not render when availableSources has only the all option", () => {
    const { container } = render(
      <SourceFilterChips
        activeSource="all"
        onChange={jest.fn()}
        availableSources={["all"]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
