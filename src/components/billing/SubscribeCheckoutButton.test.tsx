import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = jest.mocked(useAuth);

describe("SubscribeCheckoutButton", () => {
  const originalFetch = global.fetch;
  const assignMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("redirects guests to login instead of calling checkout", async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      sessionReady: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        navigate={assignMock}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Entrar para pagar" }),
    );

    expect(assignMock).toHaveBeenCalledWith(
      "/login?next=%2Fsubscribe%3Fentry%3Dcheckout",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("opens Stripe checkout when the API returns checkoutUrl", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
        provider: "stripe",
        flow: "redirect",
      }),
    } as Response);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        navigate={assignMock}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/checkout",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(
      JSON.parse(jest.mocked(global.fetch).mock.calls[0][1]?.body as string),
    ).toEqual({
      planCode: "pro_monthly",
    });
    expect(assignMock).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_123",
    );
  });

  it("shows a friendly error when checkout API fails", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Stripe checkout unavailable" }),
    } as Response);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        navigate={assignMock}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );

    expect(
      await screen.findByText(
        "O checkout não está disponível agora. Tente novamente em instantes.",
      ),
    ).toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("shows an error when checkout URL is missing", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ provider: "stripe", flow: "redirect" }),
    } as Response);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        navigate={assignMock}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para pagamento" }),
    );

    expect(
      await screen.findByText(
        "Não foi possível abrir o checkout seguro agora.",
      ),
    ).toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
