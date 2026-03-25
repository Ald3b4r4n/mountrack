import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscribeExperience } from "@/components/billing/SubscribeExperience";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/billing/SubscribeCheckoutButton", () => ({
  SubscribeCheckoutButton: () => <div data-testid="subscribe-checkout">checkout</div>,
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = jest.mocked(useAuth);
const { useRouter } = jest.requireMock("next/navigation") as {
  useRouter: jest.Mock;
};

describe("SubscribeExperience", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    useRouter.mockReturnValue({ replace, push: jest.fn() });
    global.fetch = jest.fn();
  });

  it("navigates through the subscription slides until the checkout step", async () => {
    render(
      <SubscribeExperience
        planCode="pro_monthly"
        amountCents={1499}
        monthlyPrice="R$ 14,99"
        trialDays={7}
        mercadoPagoPublicKey=""
      />,
    );

    expect(screen.getByText("Seu histórico continua com você.")).toBeInTheDocument();
    expect(screen.getByText("Etapa 1 de 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver como funciona" }));

    expect(
      screen.getByRole("heading", {
        name: /Os 7 dias grátis começam no primeiro acesso./,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Etapa 2 de 3")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Ir para pagamento" }));

    expect(screen.getByText("Assine sem sair da sua rotina.")).toBeInTheDocument();
    expect(screen.getByTestId("subscribe-checkout")).toBeInTheDocument();
    expect(screen.getByText("Etapa 3 de 3")).toBeInTheDocument();
  });

  it("shows an existing-customer login CTA on the landing step", () => {
    render(
      <SubscribeExperience
        planCode="pro_monthly"
        amountCents={1499}
        monthlyPrice="R$ 14,99"
        trialDays={7}
        mercadoPagoPublicKey=""
      />,
    );

    expect(
      screen.getByRole("button", { name: "Fazer login" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Se você já usa o MounTrack, faça login para retomar o acompanhamento com a mesma conta e o mesmo histórico.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Acesse a sua conta.")).toBeInTheDocument();
  });

  it("redirects authenticated users with active access back into the app", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-1", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ accessAllowed: true }),
    });

    render(
      <SubscribeExperience
        planCode="pro_monthly"
        amountCents={1499}
        monthlyPrice="R$ 14,99"
        trialDays={7}
        mercadoPagoPublicKey=""
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/billing/access", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
    });
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
  });
});
