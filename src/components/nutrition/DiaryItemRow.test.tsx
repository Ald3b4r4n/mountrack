import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryItemRow } from "@/components/nutrition/DiaryItemRow";
import type { DiaryItemSnapshot } from "@/modules/nutrition/domain/types";

const item: DiaryItemSnapshot = {
  id: "item-1",
  diaryId: "diary-1",
  foodId: "food-1",
  foodName: "Pão Francês",
  mealType: "breakfast",
  quantity: 1,
  unit: "unit",
  consumedAt: new Date().toISOString(),
  calories: 137,
  protein: 4.4,
  carbs: 25.95,
  fat: 1.5,
  fiber: 0,
  sodium: 0,
};

describe("DiaryItemRow", () => {
  // T020a — delete callback fires with item id
  it("calls onDelete with the item id when the delete button is activated", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();

    render(
      <DiaryItemRow item={item} onEdit={jest.fn()} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: /remover/i }));

    expect(onDelete).toHaveBeenCalledWith("item-1");
  });

  // T020b — edit callback fires with item
  it("calls onEdit with the full item when the edit button is activated", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    render(
      <DiaryItemRow item={item} onEdit={onEdit} onDelete={jest.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /editar/i }));

    expect(onEdit).toHaveBeenCalledWith(item);
  });

  it("renders the food name and calorie value", () => {
    render(
      <DiaryItemRow item={item} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(screen.getByText(/Pão Francês/i)).toBeInTheDocument();
    expect(screen.getByText(/137/)).toBeInTheDocument();
  });

  it("calls onCopy with the full item and keeps the aria label in Portuguese", async () => {
    const user = userEvent.setup();
    const onCopy = jest.fn();

    render(
      <DiaryItemRow
        item={item}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onCopy={onCopy}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /Copiar Pão Francês para outra refeição/i,
      }),
    );

    expect(onCopy).toHaveBeenCalledWith(item);
  });
});
