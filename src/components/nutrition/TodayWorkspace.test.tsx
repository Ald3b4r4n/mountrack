import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayWorkspace } from "@/components/nutrition/TodayWorkspace";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

const mealDefinitions: MealDefinition[] = [
  { key: "breakfast", label: "Cafe da manha", isDefault: true },
  { key: "lunch", label: "Almoco", isDefault: true },
  { key: "custom:pre_treino", label: "Pre treino", isDefault: false },
];

describe("TodayWorkspace", () => {
  it("renders the mobile meal rail with the active meal summary", async () => {
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

    expect(screen.getByText(/Em foco/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Almoco$/i)).toHaveLength(2);
    expect(screen.getByText(/2 item\(ns\) neste bloco/i)).toBeInTheDocument();
    expect(screen.getAllByText(/333 kcal/i)).toHaveLength(2);
    expect(screen.getByText(/^Ativa$/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cafe da manha/i }));

    expect(onOpenMeal).toHaveBeenCalledWith("breakfast");
  });
});
