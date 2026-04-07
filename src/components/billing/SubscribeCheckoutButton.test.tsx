import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("@mercadopago/sdk-js", () => ({
  loadMercadoPago: jest.fn(),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = jest.mocked(useAuth);
const loadMercadoPagoMock = jest.mocked(loadMercadoPago);

describe("SubscribeCheckoutButton", () => {
  const originalFetch = global.fetch;
  const assignMock = jest.fn();
  const cardFormDataMock = jest.fn(() => ({ token: "card-token-123" }));
  const cardFormUnmountMock = jest.fn();
  const cardFormMock = jest.fn(
    (config: { callbacks?: { onFormMounted?: (error?: unknown) => void } }) => {
      const instance = {
        getCardFormData: cardFormDataMock,
        unmount: cardFormUnmountMock,
      };
      queueMicrotask(() => {
        config.callbacks?.onFormMounted?.();
      });
      return instance;
    },
  );
  const mercadoPagoConstructorMock = jest.fn().mockImplementation(() => ({
    cardForm: cardFormMock,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    loadMercadoPagoMock.mockResolvedValue(undefined);
    (window as Window & { MercadoPago?: unknown }).MercadoPago =
      mercadoPagoConstructorMock;
    window.history.replaceState({}, "", "/subscribe");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as Window & { MercadoPago?: unknown }).MercadoPago;
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
        mercadoPagoPublicKey=""
        navigate={assignMock}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Entrar para pagar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Entre com sua conta para concluir a assinatura."),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Entrar para pagar" }),
    );

    expect(assignMock).toHaveBeenCalledWith(
      "/login?next=%2Fsubscribe%3Fentry%3Dcheckout",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows direct checkout unavailable when the public key is missing", () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        mercadoPagoPublicKey=""
        navigate={assignMock}
      />,
    );

    expect(
      screen.getByText(
        "O pagamento por cartão ainda não está disponível no momento.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pagar no Mercado Pago" }),
    ).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits the direct checkout with the Mercado Pago card token", async () => {
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
        checkoutUrl: null,
        flow: "direct",
        subscriptionStatus: "authorized",
      }),
    } as Response);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        mercadoPagoPublicKey="TEST-public-key"
        sandboxPayerEmail="buyer@testuser.com"
        navigate={assignMock}
      />,
    );

    await waitFor(() => {
      expect(loadMercadoPagoMock).toHaveBeenCalled();
      expect(mercadoPagoConstructorMock).toHaveBeenCalledWith(
        "TEST-public-key",
        {
          locale: "pt-BR",
        },
      );
    });

    expect(
      await screen.findByRole("button", { name: "Autorizar assinatura" }),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Nome do titular"), "APRO");
    await userEvent.type(
      screen.getByLabelText("Número do documento"),
      "12345678909",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Autorizar assinatura" }),
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
      cardTokenId: "card-token-123",
    });
    expect(
      await screen.findByText(
        "Assinatura autorizada. Aguarde a confirmação do primeiro pagamento.",
      ),
    ).toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("waits for the checkout targets before mounting the Mercado Pago form", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);

    const originalGetElementById = document.getElementById.bind(document);
    let misses = 0;

    jest.spyOn(document, "getElementById").mockImplementation((id) => {
      if (
        typeof id === "string" &&
        id.startsWith("subscribe-checkout__") &&
        misses < 3
      ) {
        misses += 1;
        return null;
      }

      return originalGetElementById(id);
    });

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        mercadoPagoPublicKey="TEST-public-key"
        sandboxPayerEmail="buyer@testuser.com"
        navigate={assignMock}
      />,
    );

    await waitFor(() => {
      expect(cardFormMock).toHaveBeenCalled();
    });

    expect(misses).toBeGreaterThan(0);
  });

  it("submits successfully when Mercado Pago mounts synchronously", async () => {
    const user = userEvent.setup();

    useAuthMock.mockReturnValue({
      user: { uid: "user-123", email: "user@example.com" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);

    const syncCardFormDataMock = jest.fn(() => ({ token: "sync-token-123" }));
    const syncCardFormUnmountMock = jest.fn();
    const syncCardFormMock = jest.fn(
      (config: {
        callbacks?: { onFormMounted?: (error?: unknown) => void };
      }) => {
        const instance = {
          getCardFormData: syncCardFormDataMock,
          unmount: syncCardFormUnmountMock,
        };
        config.callbacks?.onFormMounted?.();
        return instance;
      },
    );

    mercadoPagoConstructorMock.mockImplementationOnce(() => ({
      cardForm: syncCardFormMock,
    }));

    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        checkoutUrl: null,
        flow: "direct",
        subscriptionStatus: "authorized",
      }),
    } as Response);

    render(
      <SubscribeCheckoutButton
        planCode="pro_monthly"
        amountCents={1499}
        mercadoPagoPublicKey="TEST-public-key"
        sandboxPayerEmail="buyer@testuser.com"
        navigate={assignMock}
      />,
    );

    await waitFor(() => {
      expect(syncCardFormMock).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText("Nome do titular"), "APRO");
    await user.type(
      screen.getByLabelText("Número do documento"),
      "12345678909",
    );
    await user.click(
      screen.getByRole("button", { name: "Autorizar assinatura" }),
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
      cardTokenId: "sync-token-123",
    });
  });
});
