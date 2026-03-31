import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import AmpoulesPage from "@/app/ampoules/page";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadAmpouleHistory,
  loadAmpouleSettingsWithUserFallback,
} from "@/modules/dashboard/ampoule-settings";
import { getDocs } from "firebase/firestore";

jest.mock("@/components/ProtectedRoute", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/Logo", () => ({
  __esModule: true,
  default: () => <div data-testid="logo" />,
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/modules/dashboard/ampoule-settings", () => ({
  closeAmpouleHistoryEntry: jest.fn(),
  loadAmpouleHistory: jest.fn(),
  loadAmpouleSettingsWithUserFallback: jest.fn(),
  saveAmpouleSettings: jest.fn(),
  updateAmpouleHistoryEntry: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(),
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
}));

const useAuthMock = jest.mocked(useAuth);
const loadAmpouleHistoryMock = jest.mocked(loadAmpouleHistory);
const loadAmpouleSettingsWithUserFallbackMock = jest.mocked(
  loadAmpouleSettingsWithUserFallback,
);
const getDocsMock = jest.mocked(getDocs);

function createQuerySnapshot(
  docs: Array<Record<string, unknown>>,
): { forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => void } {
  return {
    forEach: (callback) => {
      docs.forEach((documentData) => {
        callback({
          data: () => documentData,
        });
      });
    },
  };
}

describe("AmpoulesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { uid: "user-123" },
    } as never);
    loadAmpouleSettingsWithUserFallbackMock.mockResolvedValue({
      dosesPerAmpoule: 12,
      previousDoseApplications: 0,
      activeAmpouleOpenedOn: "2026-03-31",
      activeAmpouleStartDoseApplications: null,
      activeAmpouleRecordId: null,
      completedAmpoulesCount: 0,
    });
    loadAmpouleHistoryMock.mockResolvedValue([]);
    getDocsMock.mockResolvedValue(
      createQuerySnapshot([
        { date: "2026-03-31", type: "dose", dose: 2.5 },
        { date: "2026-03-24", type: "dose", dose: 2.5 },
      ]) as never,
    );
  });

  it("shows an explicit same-day choice and updates the CTA based on the selected intent", async () => {
    const user = userEvent.setup();

    render(<AmpoulesPage />);

    expect(
      await screen.findByText("Abertura no mesmo dia da ultima dose"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Assumir ampola atual" }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("radio", {
        name: "A dose de hoje ja pertence a nova ampola.",
      }),
    );

    expect(
      screen.getByRole("button", { name: "Iniciar ampola atual" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Voce marcou que a nova ampola comecou depois da aplicacao de hoje. O novo ciclo inicia zerado.",
      ),
    ).toBeInTheDocument();
  });
});
