import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscribeExperience } from "@/components/billing/SubscribeExperience";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("@/components/billing/SubscribeCheckoutButton", () => ({
  SubscribeCheckoutButton: () => <div data-testid="subscribe-checkout">checkout</div>,
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = jest.mocked(useAuth);

describe("SubscribeExperience", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      sessionReady: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
      media: "",
      onchange: null,
    }));
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("navigates through the subscription slides until the checkout step", async () => {
    render(
      <SubscribeExperience
        planCode="pro_monthly"
        amountCents={1499}
        monthlyPrice="R$ 14,99"
        trialDays={3}
        mercadoPagoPublicKey=""
      />,
    );

    expect(screen.getByText("Seu historico continua com voce.")).toBeInTheDocument();
    expect(screen.getByText("Etapa 1 de 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver como funciona" }));

    expect(
      screen.getByRole("heading", {
        name: /Os 3 dias gratis comecam no primeiro acesso./,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Etapa 2 de 3")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Ir para pagamento" }));

    expect(screen.getByText("Assine sem sair da sua rotina.")).toBeInTheDocument();
    expect(screen.getByTestId("subscribe-checkout")).toBeInTheDocument();
    expect(screen.getByText("Etapa 3 de 3")).toBeInTheDocument();
  });
});
