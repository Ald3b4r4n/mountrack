import { render, waitFor } from "@testing-library/react";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";

const registerMock = jest.fn().mockResolvedValue({
  update: jest.fn(),
});

describe("PwaRegistrar", () => {
  const originalEnv = process.env;
  const originalServiceWorker = navigator.serviceWorker;
  const originalSecureContext = window.isSecureContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, "env", {
      ...originalEnv,
      NODE_ENV: "production",
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock,
      },
    });
  });

  afterAll(() => {
    jest.replaceProperty(process, "env", originalEnv);
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalSecureContext,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it("registers the root service worker in production", async () => {
    render(<PwaRegistrar />);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
      });
    });
  });
});
