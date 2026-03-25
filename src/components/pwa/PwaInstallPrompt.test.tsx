import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const { usePathname } = jest.requireMock("next/navigation") as {
  usePathname: jest.Mock;
};

describe("PwaInstallPrompt", () => {
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    usePathname.mockReturnValue("/");

    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
    });

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches:
          query === "(max-width: 900px), (pointer: coarse)"
            ? true
            : query === "(display-mode: standalone)"
              ? false
              : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  it("opens the native install prompt when beforeinstallprompt is available", async () => {
    render(<PwaInstallPrompt />);

    const promptMock = jest.fn().mockResolvedValue(undefined);
    const preventDefaultMock = jest.fn();
    const installEvent = new Event("beforeinstallprompt");

    Object.assign(installEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({
        outcome: "accepted",
        platform: "web",
      }),
      preventDefault: preventDefaultMock,
    });

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    const installButton = await screen.findByRole("button", {
      name: "Instalar agora",
    });

    await userEvent.click(installButton);

    await waitFor(() => {
      expect(promptMock).toHaveBeenCalledTimes(1);
    });
    expect(preventDefaultMock).toHaveBeenCalledTimes(1);
  });

  it("shows manual iPhone instructions when Safari does not expose the install prompt", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    });

    render(<PwaInstallPrompt />);

    expect(
      screen.getByRole("heading", { name: "Instale o MounTrack no iPhone" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Toque no botão Compartilhar do Safari."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Escolha Adicionar à Tela de Início e confirme.",
      ),
    ).toBeInTheDocument();
  });
});
