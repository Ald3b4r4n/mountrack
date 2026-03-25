import { act, render, screen, waitFor } from "@testing-library/react";
import { BillingTrialBanner } from "@/components/billing/BillingTrialBanner";

describe("BillingTrialBanner", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-20T12:00:00.000Z"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("renders the attention-state countdown and CTA during the last two days", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        accessAllowed: true,
        effectiveStatus: "trialing",
        entitlementStartsAt: "2026-03-20T09:00:00.000Z",
        entitlementEndsAt: "2026-03-22T09:00:00.000Z",
      }),
    }) as typeof fetch;

    await act(async () => {
      render(<BillingTrialBanner />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Seu teste entrou na reta final:/,
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", {
        name: /Seu teste entrou na reta final:\s*faltam 2 dias para decidir\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Garantir acesso",
      }),
    ).toHaveAttribute("href", "/subscribe?entry=checkout");
    expect(
      screen.getByRole("link", {
        name: "Ver detalhes do plano",
      }),
    ).toHaveAttribute("href", "/subscribe?entry=plan");
  });

  it("renders the urgent-state countdown and CTA in the last 24 hours", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        accessAllowed: true,
        effectiveStatus: "trialing",
        entitlementStartsAt: "2026-03-20T09:00:00.000Z",
        entitlementEndsAt: "2026-03-20T18:00:00.000Z",
      }),
    }) as typeof fetch;

    await act(async () => {
      render(<BillingTrialBanner />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Últimas horas do seu teste:/,
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", {
        name: "Assinar agora",
      }),
    ).toHaveAttribute("href", "/subscribe?entry=checkout");
  });

  it("stays hidden when the user is not in trial", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        accessAllowed: true,
        effectiveStatus: "active",
        entitlementStartsAt: "2026-03-20T09:00:00.000Z",
        entitlementEndsAt: "2026-04-20T09:00:00.000Z",
      }),
    }) as typeof fetch;

    await act(async () => {
      render(<BillingTrialBanner />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole("heading", { name: /Seu teste está em andamento:/ }),
    ).not.toBeInTheDocument();
  });
});
