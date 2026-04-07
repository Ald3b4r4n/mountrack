import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RetroactiveDiaryView } from "@/components/nutrition/RetroactiveDiaryView";

const TARGET_DATE = "2026-04-04";
const authUser = {
  uid: "retro-test-user",
  getIdToken: jest.fn(async () => "token"),
};

beforeEach(() => {
  jest.clearAllMocks();
  authUser.getIdToken.mockResolvedValue("token");
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      diary: {
        date: TARGET_DATE,
        waterIntakeMl: 0,
        items: [],
      },
    }),
  });
});

describe("RetroactiveDiaryView", () => {
  // T028 — fetches the targetDate diary endpoint on mount
  it("fetches the diary for the given targetDate on mount", async () => {
    render(
      <RetroactiveDiaryView
        authUser={authUser}
        targetDate={TARGET_DATE}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(TARGET_DATE),
        expect.anything(),
      );
    });
  });

  // T028b — does NOT use today's date in the API call
  it("does not use today's date in the API call", async () => {
    const today = new Date().toISOString().slice(0, 10);

    render(
      <RetroactiveDiaryView
        authUser={authUser}
        targetDate={TARGET_DATE}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const urls = calls.map(([url]: [string]) => url);
      expect(
        urls.every((url) => !url.includes(today) || url.includes(TARGET_DATE)),
      ).toBe(true);
    });
  });

  it("renders previously registered items returned by the diary payload", async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        diary: {
          date: TARGET_DATE,
          waterIntakeMl: 0,
          items: [
            {
              id: "item-1",
              diaryId: "diary-1",
              foodId: "food-1",
              foodName: "Arroz branco",
              mealType: "breakfast",
              quantity: 100,
              unit: "g",
              consumedAt: `${TARGET_DATE}T08:00:00.000Z`,
              calories: 130,
              protein: 2.4,
              carbs: 28,
              fat: 0.2,
              fiber: 0.3,
              sodium: 1,
            },
          ],
        },
      }),
    });

    render(
      <RetroactiveDiaryView
        authUser={authUser}
        targetDate={TARGET_DATE}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    await user.click(
      await screen.findByRole("button", { name: /^Café da manhã$/i }),
    );

    expect(await screen.findByText(/Arroz branco/i)).toBeInTheDocument();
  });
});
