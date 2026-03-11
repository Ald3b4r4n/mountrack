import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import type { MealDefinition } from "@/modules/nutrition/domain/types";

const mealDefinitions: MealDefinition[] = [
  { key: "breakfast", label: "Café da manhã", isDefault: true },
  { key: "lunch", label: "Almoço", isDefault: true },
  { key: "custom:ceia", label: "Ceia", isDefault: false },
];

function renderDiaryPanel({
  activeDiaryView = "today",
  recentlyLoggedFoodLabel = null,
  activeDiaryItems = [{ id: "item-1", foodName: "Iogurte", quantity: 40, unit: "g", calories: 26 } as never],
  pagedDiaryItems = [{ id: "item-1", foodName: "Iogurte", quantity: 40, unit: "g", calories: 26 } as never],
  groupedDiaryItems = {
    breakfast: [],
    lunch: [],
    "custom:ceia": [{ id: "item-1" } as never],
  },
  isHistoryLoading = false,
  historyEntries = [],
  historyPage = 1,
  historyTotalPages = 1,
}: {
  activeDiaryView?: "today" | "history";
  recentlyLoggedFoodLabel?: string | null;
  activeDiaryItems?: never[];
  pagedDiaryItems?: never[];
  groupedDiaryItems?: Record<string, never[]>;
  isHistoryLoading?: boolean;
  historyEntries?: never[];
  historyPage?: number;
  historyTotalPages?: number;
} = {}) {
  const setActiveDiaryView = jest.fn();
  const setDiaryPage = jest.fn();
  const handleSelectHydrationMode = jest.fn();
  const onOpenSearchForMeal = jest.fn();
  const onOpenMealChooser = jest.fn();
  const loadHistory = jest.fn();

  render(
    <DiaryPanel
      activeDiaryView={activeDiaryView}
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
      groupedDiaryItems={groupedDiaryItems}
      activeDiaryItems={activeDiaryItems}
      diaryPage={1}
      diaryTotalPages={1}
      isLoading={false}
      pagedDiaryItems={pagedDiaryItems}
      handleDeleteDiaryItem={jest.fn()}
      isHistoryLoading={isHistoryLoading}
      historyEntries={historyEntries}
      historyPage={historyPage}
      historyTotalPages={historyTotalPages}
      loadHistory={loadHistory}
      onManageMeal={jest.fn()}
      recentlyLoggedFoodLabel={recentlyLoggedFoodLabel}
    />,
  );

  return {
    setActiveDiaryView,
    setDiaryPage,
    handleSelectHydrationMode,
    onOpenSearchForMeal,
    onOpenMealChooser,
    loadHistory,
  };
}

describe("DiaryPanel", () => {
  it("uses the mobile daybook hierarchy with a secondary history action", async () => {
    const user = userEvent.setup();
    const { setActiveDiaryView, setDiaryPage } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));

    expect(screen.getByText(/Tudo na refeição atual/i)).toBeInTheDocument();
    expect(screen.getByText(/^Refeição ativa$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Ceia$/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: /^Almoço$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Histórico$/i }));

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
    await user.click(screen.getByRole("button", { name: /Adicionar à refeição Ceia/i }));

    expect(onOpenSearchForMeal).toHaveBeenCalledWith("custom:ceia");
  });

  it("lets the user jump back to meal selection from the selected meal card", async () => {
    const user = userEvent.setup();
    const { onOpenMealChooser } = renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));
    await user.click(screen.getByRole("button", { name: /Trocar refeição/i }));

    expect(onOpenMealChooser).toHaveBeenCalledTimes(1);
  });

  it("surfaces the latest logged item inside the selected meal card on mobile", async () => {
    const user = userEvent.setup();
    const { onOpenSearchForMeal } = renderDiaryPanel({ recentlyLoggedFoodLabel: "Banana prata" });

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));

    expect(screen.getAllByText(/Registrado agora/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Banana prata/i).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /Adicionar à refeição Ceia/i }));

    expect(onOpenSearchForMeal).toHaveBeenCalledWith("custom:ceia");
  });

  it("shows the compact empty state copy on mobile when the meal has no items", async () => {
    const user = userEvent.setup();
    renderDiaryPanel({
      activeDiaryItems: [],
      pagedDiaryItems: [],
      groupedDiaryItems: {
        breakfast: [],
        lunch: [],
        "custom:ceia": [],
      },
    });

    await user.click(screen.getByRole("button", { name: /Registro do dia/i }));

    expect(screen.getByText(/Nada nesta refeição ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/Toque em Adicionar para lançar o primeiro item desta refeição./i)).toBeInTheDocument();
  });

  it("renders the compact history review cards on mobile", async () => {
    const user = userEvent.setup();
    renderDiaryPanel({
      activeDiaryView: "history",
      historyEntries: [
        {
          date: "2026-03-10",
          itemCount: 3,
          summary: {
            consumedCalories: 420,
            waterIntakeMl: 1800,
            protein: 42,
            carbs: 55,
            fat: 11,
          },
        } as never,
      ],
    });

    await user.click(screen.getByRole("button", { name: /Histórico do diário/i }));

    expect(screen.getByText(/Dias fechados/i)).toBeInTheDocument();
    expect(screen.getByText(/Revise só o que já ficou para trás./i)).toBeInTheDocument();
    expect(screen.getByText(/^3 item\(ns\)$/i)).toBeInTheDocument();
    expect(screen.getByText(/420 kcal/i)).toBeInTheDocument();
  });

  it("uses compact pagination for the history view on mobile", async () => {
    const user = userEvent.setup();
    const { loadHistory } = renderDiaryPanel({
      activeDiaryView: "history",
      historyEntries: [
        {
          date: "2026-03-10",
          itemCount: 1,
          summary: {
            consumedCalories: 200,
            waterIntakeMl: 900,
            protein: 12,
            carbs: 20,
            fat: 7,
          },
        } as never,
      ],
      historyPage: 2,
      historyTotalPages: 3,
    });

    await user.click(screen.getByRole("button", { name: /Histórico do diário/i }));
    expect(screen.getByText(/^Dias$/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Próxima página do diário/i }));

    expect(loadHistory).toHaveBeenCalledWith(3);
  });
});
