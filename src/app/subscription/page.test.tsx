import { render, screen } from "@testing-library/react";
import SubscriptionPage from "@/app/subscription/page";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";

jest.mock("@/modules/billing/auth/server-access", () => ({
  requireServerAppAccess: jest.fn(),
}));

jest.mock("@/components/billing/BillingSubscriptionPanel", () => ({
  BillingSubscriptionPanel: ({
    initialPayload,
  }: {
    initialPayload: { subscription?: { planName: string | null } | null };
  }) => (
    <div data-testid="billing-subscription-panel">
      {initialPayload.subscription?.planName ?? "sem-plano"}
    </div>
  ),
}));

const requireServerAppAccessMock = jest.mocked(requireServerAppAccess);

describe("SubscriptionPage", () => {
  it("renders the dedicated subscription management screen", async () => {
    requireServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "user-123",
        email: "user@example.com",
      },
      roles: ["user"],
      accessAllowed: true,
      effectiveStatus: "active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-23T12:00:00.000Z",
      subscription: {
        id: "billing-subscription:preapproval-123",
        userId: "user-123",
        planId: "billing-plan-pro-monthly",
        providerSubscriptionId: "preapproval-123",
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: "2026-03-23T12:00:00.000Z",
        currentPeriodEnd: "2026-04-23T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        gracePeriodEndsAt: null,
        createdAt: "2026-03-23T12:00:00.000Z",
        updatedAt: "2026-03-23T12:00:00.000Z",
        planName: "MounTrack Pro Mensal",
        planCode: "pro_monthly",
      },
    });

    render(await SubscriptionPage());

    expect(
      screen.getByRole("heading", {
        name: "Gerencie sua renovacao com clareza.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("billing-subscription-panel")).toHaveTextContent(
      "MounTrack Pro Mensal",
    );
    expect(
      screen.getByRole("link", { name: "Voltar para o painel" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Ver plano e pagamento" }),
    ).toHaveAttribute("href", "/subscribe");
  });
});
