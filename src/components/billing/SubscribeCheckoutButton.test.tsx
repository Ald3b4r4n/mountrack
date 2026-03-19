import { render, screen } from "@testing-library/react";
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

  afterEach(() => {
    jest.restoreAllMocks();
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

    render(<SubscribeCheckoutButton planCode="pro_monthly" navigate={assignMock} />);

    expect(screen.getByRole("button", { name: "Entrar para pagar" })).toBeInTheDocument();
    expect(
      screen.getByText("Faça login com sua conta para abrir o checkout do Mercado Pago."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Entrar para pagar" }));

    expect(assignMock).toHaveBeenCalledWith("/login");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects authenticated users to the provider checkout url", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
      }),
    } as Response);

    render(<SubscribeCheckoutButton planCode="pro_monthly" navigate={assignMock} />);

    await userEvent.click(screen.getByRole("button", { name: "Continuar para pagamento" }));

    expect(global.fetch).toHaveBeenCalledWith("/api/billing/checkout", expect.objectContaining({
      method: "POST",
    }));
    expect(assignMock).toHaveBeenCalledWith(
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123",
    );
  });
});
