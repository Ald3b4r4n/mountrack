import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

const mealDefinitions: MealDefinition[] = [
  { key: "breakfast", label: "Cafe da manha", isDefault: true },
  { key: "lunch", label: "Almoco", isDefault: true },
  { key: "custom:ceia", label: "Ceia", isDefault: false },
];

function renderDiaryPanel() {
  const setActiveDiaryView = jest.fn();
  const setDiaryPage = jest.fn();
  const handleSelectHydrationMode = jest.fn();
  const onOpenSearchForMeal = jest.fn();
  const onOpenMealChooser = jest.fn();

  render(
    <DiaryPanel
      activeDiaryView="today"
      setActiveDiaryView={setActiveDiaryView}
      setDiaryPage={setDiaryPage}
      summary={{
        targetWaterMl: 2200,
        waterIntakeMl: 1200,
        meals: {
          breakfast: 185,
          lunch: 333,
          "custom:ceia": 90,
        },
        protein: 54.8,
        carbs: 47.72,
        fat: 11.94,
        consumedCalories: 518,
      }}
      waterRatio={55}
      hydrationMode="increment"
      handleSelectHydrationMode={handleSelectHydrationMode}
      isMobileLayout
      handleAdjustWater={jest.fn()}
      waterDraft="250"
      setWaterDraft={jest.fn()}
      handleSaveWater={jest.fn()}
      isUpdatingWater={false}
      mealDefinitions={mealDefinitions}
      activeDiaryMeal="custom:ceia"
      setActiveDiaryMeal={jest.fn()}
      onOpenSearchForMeal={onOpenSearchForMeal}
      onOpenMealChooser={onOpenMealChooser}
      groupedDiaryItems={{
        breakfast: [],
        lunch: [],
        "custom:ceia": [{ id: "item-1" } as never],
      }}
      activeDiaryItems={[{ id: "item-1", foodName: "Iogurte", quantity: 40, unit: "g", calories: 26 } as never]}
      diaryPage={1}
      diaryTotalPages={1}
      isLoading={false}
      pagedDiaryItems={[{ id: "item-1", foodName: "Iogurte", quantity: 40, unit: "g", calories: 26 } as never]}
      handleDeleteDiaryItem={jest.fn()}
      isHistoryLoading={false}
      historyEntries={[]}
      historyPage={1}
      historyTotalPages={1}
      loadHistory={jest.fn()}
      onManageMeal={jest.fn()}
    />,
  );

  return {
    setActiveDiaryView,
    setDiaryPage,
    handleSelectHydrationMode,
    onOpenSearchForMeal,
    onOpenMealChooser,
  };
}

describe("DiaryPanel", () => {
  it("uses the mobile daybook hierarchy with a secondary history action", async () => {
    const user = userEvent.setup();
    const { setActiveDiaryView, setDiaryPage } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));

    expect(screen.getByText(/Diario vivo do dia/i)).toBeInTheDocument();
    expect(screen.getByText(/Refeicao selecionada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Ceia$/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Almoco$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Historico$/i }));

    expect(setActiveDiaryView).toHaveBeenCalledWith("history");
    expect(setDiaryPage).toHaveBeenCalledWith(1);
  });

  it("switches mobile hydration into correction mode from the compact action", async () => {
    const user = userEvent.setup();
    const { handleSelectHydrationMode } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));
    await user.click(screen.getByRole("button", { name: /Corrigir total/i }));

    expect(handleSelectHydrationMode).toHaveBeenCalledWith("absolute", 1200);
  });

  it("offers a direct add-food action from the selected meal card on mobile", async () => {
    const user = userEvent.setup();
    const { onOpenSearchForMeal } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));
    await user.click(screen.getByRole("button", { name: /Adicionar alimento/i }));

    expect(onOpenSearchForMeal).toHaveBeenCalledWith("custom:ceia");
  });

  it("lets the user jump back to meal selection from the selected meal card", async () => {
    const user = userEvent.setup();
    const { onOpenMealChooser } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));
    await user.click(screen.getByRole("button", { name: /Trocar refeicao/i }));

    expect(onOpenMealChooser).toHaveBeenCalledTimes(1);
  });
});
