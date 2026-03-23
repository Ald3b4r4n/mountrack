import { render, screen } from "@testing-library/react";
import BillingManualGrantsPage from "@/app/billing/grants/page";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";

jest.mock("@/modules/billing/auth/server-access", () => ({
  requireServerAppAccess: jest.fn(),
}));

jest.mock("@/components/billing/BillingManualGrantsConsole", () => ({
  BillingManualGrantsConsole: () => (
    <div data-testid="billing-manual-grants-console">console</div>
  ),
}));

const requireServerAppAccessMock = jest.mocked(requireServerAppAccess);

describe("BillingManualGrantsPage", () => {
  it("renders the internal operator page for manual grants", async () => {
    requireServerAppAccessMock.mockResolvedValue({
      user: {
        uid: "owner-1",
        email: "owner@mountrack.app",
      },
      roles: ["owner"],
      accessAllowed: true,
      effectiveStatus: "operator_override",
      entitlementStartsAt: null,
      entitlementEndsAt: null,
      subscription: null,
    });

    render(await BillingManualGrantsPage());

    expect(
      screen.getByRole("heading", {
        name: "Painel de gratuidade e concessoes.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("billing-manual-grants-console"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para assinatura" }),
    ).toHaveAttribute("href", "/subscription");
  });
});
