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
});
