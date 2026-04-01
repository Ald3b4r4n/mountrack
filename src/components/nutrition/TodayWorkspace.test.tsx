import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayWorkspace } from "@/components/nutrition/TodayWorkspace";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

const mealDefinitions: MealDefinition[] = [
  { key: "breakfast", label: "Café da manhã", isDefault: true },
  { key: "lunch", label: "Almoço", isDefault: true },
  { key: "custom:pre_treino", label: "Pré-treino", isDefault: false },
];

describe("TodayWorkspace", () => {
  it("omits the mobile meal block and keeps only diary content", async () => {
    const user = userEvent.setup();
    const onOpenMeal = jest.fn();

    render(
      <TodayWorkspace
        activeDiaryMeal="lunch"
        groupedDiaryItems={{
          breakfast: [{ id: "1" } as never],
          lunch: [{ id: "2" } as never, { id: "3" } as never],
          "custom:pre_treino": [],
        }}
        mealDefinitions={mealDefinitions}
        mealSummary={{
          breakfast: 185,
          lunch: 333,
          "custom:pre_treino": 0,
        }}
        embedded={false}
        isMobileLayout
        mealsSectionOpen
        onOpenMeal={onOpenMeal}
        onOpenSearchForMeal={jest.fn()}
        onManageMeal={jest.fn()}
        onAddMeal={jest.fn()}
      >
        <div>conteudo do diario</div>
      </TodayWorkspace>,
    );

    expect(screen.queryByText(/Refeições do dia/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Escolha uma refeição para registrar alimentos./i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/conteudo do diario/i)).toBeInTheDocument();

    await user.click(screen.getByText(/conteudo do diario/i));

    expect(onOpenMeal).not.toHaveBeenCalled();
  });

  it("opens the meal dialog from the summary card and forwards inline edits", async () => {
    const user = userEvent.setup();
    const onOpenMeal = jest.fn();
    const onUpdateDiaryItem = jest.fn(async () => {});

    render(
      <TodayWorkspace
        activeDiaryMeal="lunch"
        groupedDiaryItems={{
          breakfast: [],
          lunch: [
            {
              id: "item-2",
              foodName: "Arroz branco",
              quantity: 120,
              unit: "g",
              calories: 156,
              protein: 3,
              carbs: 34,
              fat: 0.3,
              fiber: 0.8,
              sodium: 1,
              mealType: "lunch",
              foodId: "food-rice",
              diaryId: "diary-1",
              consumedAt: "2026-03-15T12:30:00.000Z",
            } as never,
          ],
          dinner: [],
          snack: [],
          "custom:pre_treino": [],
        }}
        mealDefinitions={[
          ...mealDefinitions,
          { key: "dinner", label: "Jantar", isDefault: true },
          { key: "snack", label: "Lanche", isDefault: true },
        ]}
        mealSummary={{
          breakfast: 185,
          lunch: 333,
          dinner: 0,
          snack: 0,
          "custom:pre_treino": 0,
        }}
        embedded={false}
        mealsSectionOpen
        onOpenMeal={onOpenMeal}
        onOpenSearchForMeal={jest.fn()}
        onUpdateDiaryItem={onUpdateDiaryItem}
        onDeleteDiaryItem={jest.fn()}
        onManageMeal={jest.fn()}
        onAddMeal={jest.fn()}
      >
        <div>conteudo do diario</div>
      </TodayWorkspace>,
    );

    await user.click(screen.getByRole("button", { name: /Almoço/i }));

    expect(
      screen.getByRole("dialog", { name: /Almoço/i }),
    ).toBeInTheDocument();
    expect(onOpenMeal).toHaveBeenCalledWith("lunch");

    await user.click(screen.getByRole("button", { name: /Editar/i }));
    await user.clear(screen.getByRole("spinbutton", { name: /Quantidade/i }));
    await user.type(screen.getByRole("spinbutton", { name: /Quantidade/i }), "150");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Refeicao/i }),
      "snack",
    );
    await user.click(screen.getByRole("button", { name: /^Salvar$/i }));

    expect(onUpdateDiaryItem).toHaveBeenCalledWith({
      itemId: "item-2",
      quantity: 150,
      mealType: "snack",
    });
  });
});
