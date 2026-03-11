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
  it("renders the mobile meal list without duplicating the active summary card", async () => {
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

    expect(screen.getByRole("button", { name: /Café da manhã/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Almoço/i })).toBeInTheDocument();
    expect(screen.getByText(/Escolha uma refeição para registrar alimentos./i)).toBeInTheDocument();
    expect(screen.getAllByText(/333 kcal/i)).toHaveLength(1);
    expect(screen.getByText(/^Ativa$/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Café da manhã/i }));

    expect(onOpenMeal).toHaveBeenCalledWith("breakfast");
  });
});
