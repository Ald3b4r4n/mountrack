import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BarcodeScannerDialog } from "@/components/nutrition/BarcodeScannerDialog";

const startMock = jest.fn();
const stopMock = jest.fn();
const clearMock = jest.fn();
let latestSuccessHandler: ((decodedText: string) => void) | null = null;

jest.mock("html5-qrcode", () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    start: (...args: unknown[]) => {
      latestSuccessHandler = args[2] as (decodedText: string) => void;
      return startMock(...args);
    },
    stop: (...args: unknown[]) => stopMock(...args),
    clear: (...args: unknown[]) => clearMock(...args),
  })),
  Html5QrcodeSupportedFormats: {
    EAN_13: "EAN_13",
    EAN_8: "EAN_8",
    UPC_A: "UPC_A",
    UPC_E: "UPC_E",
    CODE_128: "CODE_128",
    QR_CODE: "QR_CODE",
  },
}));

describe("BarcodeScannerDialog", () => {
  beforeEach(() => {
    latestSuccessHandler = null;
    startMock.mockReset();
    stopMock.mockReset();
    clearMock.mockReset();
    startMock.mockResolvedValue(undefined);
    stopMock.mockResolvedValue(undefined);
    clearMock.mockImplementation(() => undefined);
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: jest.fn() },
    });
  });

  it("does not render when closed", () => {
    const { container } = render(<BarcodeScannerDialog open={false} onClose={jest.fn()} onDetected={jest.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("starts the real scanner with supported barcode formats and handles detection", async () => {
    const onClose = jest.fn();
    const onDetected = jest.fn();

    render(<BarcodeScannerDialog open onClose={onClose} onDetected={onDetected} />);

    await waitFor(() => expect(startMock).toHaveBeenCalled());

    const scannerConfig = startMock.mock.calls[0]?.[1] as { formatsToSupport: string[] };
    expect(scannerConfig.formatsToSupport).toEqual([
      "EAN_13",
      "EAN_8",
      "UPC_A",
      "UPC_E",
      "CODE_128",
      "QR_CODE",
    ]);

    latestSuccessHandler?.("7891234567890");

    await waitFor(() => {
      expect(onDetected).toHaveBeenCalledWith("7891234567890");
      expect(stopMock).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("renders an accessible dialog and moves initial focus to the close button", async () => {
    render(<BarcodeScannerDialog open onClose={jest.fn()} onDetected={jest.fn()} />);

    const dialog = await screen.findByRole("dialog", { name: /Leitor de codigo de barras/i });
    const closeButton = screen.getByRole("button", { name: /^Fechar$/i });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(closeButton).toHaveFocus());
  });

  it("shows a permission error when camera access is denied", async () => {
    startMock.mockRejectedValueOnce(new Error("NotAllowedError"));

    render(<BarcodeScannerDialog open onClose={jest.fn()} onDetected={jest.fn()} />);

    expect(await screen.findByText(/Permissao da camera negada/i)).toBeInTheDocument();
  });

  it("falls back gracefully when the browser does not expose camera access", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    render(<BarcodeScannerDialog open onClose={jest.fn()} onDetected={jest.fn()} />);

    expect(
      await screen.findByText(/Este navegador nao liberou a camera aqui/i),
    ).toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("lets the user close the dialog manually", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<BarcodeScannerDialog open onClose={onClose} onDetected={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Fechar$/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("closes the dialog when the user presses Escape", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<BarcodeScannerDialog open onClose={onClose} onDetected={jest.fn()} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
