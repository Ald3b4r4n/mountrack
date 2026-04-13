import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealSwitchDialog } from "@/components/nutrition/MealSwitchDialog";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

describe("MealSwitchDialog", () => {
  const mealDefinitions: MealDefinition[] = [
    { key: "breakfast", label: "Cafe da manha", isDefault: true },
    { key: "lunch", label: "Almoco", isDefault: true },
    { key: "custom:ceia", label: "Ceia", isDefault: false },
  ];

  it("switches active meal and exposes create/manage actions", async () => {
    const user = userEvent.setup();
    const onSelectMeal = jest.fn();
    const onCreateMeal = jest.fn();
    const onManageMeal = jest.fn();

    render(
      <MealSwitchDialog
        open
        onClose={jest.fn()}
        activeMeal="breakfast"
        mealDefinitions={mealDefinitions}
        mealCalories={{ breakfast: 120, lunch: 350, "custom:ceia": 90 }}
        mealItemsCount={{ breakfast: 1, lunch: 3, "custom:ceia": 2 }}
        onSelectMeal={onSelectMeal}
        onCreateMeal={onCreateMeal}
        onManageMeal={onManageMeal}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Almoco/i }));
    expect(onSelectMeal).toHaveBeenCalledWith("lunch");

    await user.click(screen.getByRole("button", { name: /Criar refeição/i }));
    expect(onCreateMeal).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Gerenciar Ceia/i }));
    expect(onManageMeal).toHaveBeenCalledWith(
      expect.objectContaining({ key: "custom:ceia", label: "Ceia" }),
    );
  });

  it("can be reused to choose a copy target meal without meal management actions", async () => {
    const user = userEvent.setup();
    const onSelectMeal = jest.fn();

    render(
      <MealSwitchDialog
        open
        onClose={jest.fn()}
        activeMeal="breakfast"
        mealDefinitions={mealDefinitions}
        mealCalories={{ breakfast: 120, lunch: 350, "custom:ceia": 90 }}
        mealItemsCount={{ breakfast: 1, lunch: 3, "custom:ceia": 2 }}
        onSelectMeal={onSelectMeal}
        onCreateMeal={jest.fn()}
        onManageMeal={jest.fn()}
        title="Escolha a refeição"
        description="Selecione a refeição de destino para copiar o alimento."
        selectLabel="Copiar"
        showMealManagement={false}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: /Escolha a refeição/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Criar refeição/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Almoco/i }));

    expect(onSelectMeal).toHaveBeenCalledWith("lunch");
  });
});
