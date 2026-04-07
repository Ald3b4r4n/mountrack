import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryPanel } from "@/components/nutrition/DiaryPanel";
import type { DiaryHistoryEntry } from "@/modules/nutrition/domain/types";

const todayEntry: DiaryHistoryEntry = {
  date: "2026-03-15",
  itemCount: 3,
  summary: {
    date: "2026-03-15",
    targetCalories: 2000,
    targetWaterMl: 2200,
    consumedCalories: 518,
    remainingCalories: 1482,
    waterIntakeMl: 1200,
    meals: { breakfast: 185, lunch: 333 },
    calories: 518,
    protein: 54.8,
    carbs: 47.72,
    fat: 11.94,
    fiber: 0,
    sodium: 0,
  },
};

function renderDiaryPanel({
  isMobileLayout = false,
  todayEntry: today = todayEntry,
  onAddToToday = jest.fn(),
  historyEntries = [],
  historyPage = 1,
  historyTotalPages = 1,
  open,
}: {
  isMobileLayout?: boolean;
  todayEntry?: DiaryHistoryEntry;
  onAddToToday?: jest.Mock;
  historyEntries?: DiaryHistoryEntry[];
  historyPage?: number;
  historyTotalPages?: number;
  open?: boolean;
} = {}) {
  const loadHistory = jest.fn();

  render(
    <DiaryPanel
      isMobileLayout={isMobileLayout}
      todayEntry={today}
      onAddToToday={onAddToToday}
      isHistoryLoading={false}
      historyEntries={historyEntries}
      historyPage={historyPage}
      historyTotalPages={historyTotalPages}
      loadHistory={loadHistory}
      open={open}
    />,
  );

  return { loadHistory, onAddToToday };
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ date: "2026-03-15", waterIntakeMl: 0, items: [] }),
  });
});

describe("DiaryPanel", () => {
  it("shows today card with date and calorie summary when section is open", () => {
    renderDiaryPanel({ open: true });

    expect(screen.getByText(/Hoje/i)).toBeInTheDocument();
    expect(screen.getByText(/15\/03\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/518 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/3 item\(ns\)/i)).toBeInTheDocument();
  });

  it("calls onAddToToday when the add button on today card is clicked", async () => {
    const user = userEvent.setup();
    const onAddToToday = jest.fn();
    renderDiaryPanel({ open: true, onAddToToday });

    await user.click(screen.getByRole("button", { name: /Adicionar item ao diário de hoje/i }));

    expect(onAddToToday).toHaveBeenCalledTimes(1);
  });

  it("opens RetroactiveDiaryView when today card is clicked", async () => {
    const user = userEvent.setup();
    renderDiaryPanel({ open: true });

    // The today card is an article with role="button"; click it directly
    const todayCard = screen.getByText("15/03/2026").closest("article");
    expect(todayCard).toBeInTheDocument();
    await user.click(todayCard!);

    // RetroactiveDiaryView opens — verify the dialog is rendered
    expect(await screen.findByText(/Diário retroativo/i)).toBeInTheDocument();
  });

  it("shows history entries below today when section is open", () => {
    renderDiaryPanel({
      open: true,
      historyEntries: [
        {
          date: "2026-03-10",
          itemCount: 2,
          summary: {
            date: "2026-03-10",
            targetCalories: 2000,
            targetWaterMl: 2200,
            consumedCalories: 420,
            remainingCalories: 1580,
            waterIntakeMl: 1800,
            meals: {},
            calories: 420,
            protein: 30,
            carbs: 50,
            fat: 10,
            fiber: 0,
            sodium: 0,
          },
        } as DiaryHistoryEntry,
      ],
    });

    expect(screen.getByText(/10\/03\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/420 kcal/i)).toBeInTheDocument();
  });

  it("opens section when CollapsibleSection header is clicked", async () => {
    const user = userEvent.setup();
    renderDiaryPanel();

    await user.click(screen.getByRole("button", { name: /Histórico/i }));

    expect(screen.getByText(/Hoje/i)).toBeInTheDocument();
  });
});
