import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingSubscriptionPanel } from "@/components/billing/BillingSubscriptionPanel";

describe("BillingSubscriptionPanel", () => {
  const originalFetch = global.fetch;
  const originalConfirm = window.confirm;
  const activePayload = {
    authenticated: true,
    accessAllowed: true,
    effectiveStatus: "active",
    entitlementStartsAt: "2026-03-23T15:00:00.000Z",
    entitlementEndsAt: "2026-04-23T15:00:00.000Z",
    subscription: {
      id: "billing-subscription:preapproval-123",
      userId: "user-123",
      planId: "billing-plan-pro-monthly",
      providerSubscriptionId: "preapproval-123",
      status: "active",
      trialEndsAt: null,
      currentPeriodStart: "2026-03-23T15:00:00.000Z",
      currentPeriodEnd: "2026-04-23T15:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriodEndsAt: null,
      createdAt: "2026-03-23T15:00:00.000Z",
      updatedAt: "2026-03-23T15:00:00.000Z",
      planName: "MounTrack Pro Mensal",
      planCode: "pro_monthly",
    },
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    window.confirm = originalConfirm;
  });

  it("renders the subscription cycle and keeps the access window after cancellation", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          ...activePayload.subscription,
          cancelAtPeriodEnd: true,
          canceledAt: "2026-03-24T09:00:00.000Z",
          updatedAt: "2026-03-24T09:00:00.000Z",
        },
      }),
    } as Response);

    render(<BillingSubscriptionPanel initialPayload={activePayload} />);

    expect(screen.getByText("Assinatura ativa")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acesso liberado ate 23/04/2026." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mercado Pago · mensal")).toBeInTheDocument();
    expect(screen.getByText("23/03/2026 ate 23/04/2026")).toBeInTheDocument();
    expect(
      screen.getByText("Cobranca processada pelo Mercado Pago"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar renovacao" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Cancelar a renovacao automatica? O acesso continua ativo ate o fim do periodo ja pago.",
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/subscription/cancel",
        { method: "POST" },
      );
    });

    expect(
      await screen.findByText(
        "Renovacao automatica cancelada. O acesso segue ativo ate o fim do periodo atual.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Renovacao cancelada")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Seu acesso segue ate 23/04/2026." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancelada em 24/03/2026")).toBeInTheDocument();
  });

  it("stays hidden while the user is still in the trial window", () => {
    const { container } = render(
      <BillingSubscriptionPanel
        initialPayload={{
          authenticated: true,
          accessAllowed: true,
          effectiveStatus: "trialing",
          entitlementStartsAt: "2026-03-23T15:00:00.000Z",
          entitlementEndsAt: "2026-03-30T15:00:00.000Z",
          subscription: {
            ...activePayload.subscription,
            id: "billing-subscription:trial-123",
            status: "trialing",
            trialEndsAt: "2026-03-30T15:00:00.000Z",
            currentPeriodStart: null,
            currentPeriodEnd: null,
          },
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
