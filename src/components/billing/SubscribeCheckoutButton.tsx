"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildLoginNavigationUrl } from "@/modules/billing/auth/login-navigation";
import { buildSubscribePath } from "@/modules/billing/subscribe-navigation";
import styles from "./SubscribeCheckoutButton.module.css";

interface SubscribeCheckoutButtonProps {
  planCode: string;
  amountCents: number;
  navigate?: (url: string) => void;
}

interface CheckoutResponse {
  session?: {
    id: string;
    status: string;
    expiresAt: string;
  };
  checkoutUrl?: string | null;
  provider?: "stripe" | string;
  flow?: "redirect" | "direct";
  paymentMethods?: string[];
  error?: string;
}

function resolveDisplayError(errorMessage?: string | null): string {
  const normalized = errorMessage?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.";
  }

  if (normalized.includes("missing authenticated session")) {
    return "Sua sessão expirou. Faça login novamente para continuar.";
  }

  if (normalized.includes("unavailable")) {
    return "O checkout não está disponível agora. Tente novamente em instantes.";
  }

  return "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.";
}

export function SubscribeCheckoutButton({
  planCode,
  amountCents,
  navigate = (url) => window.location.assign(url),
}: SubscribeCheckoutButtonProps) {
  const { user, loading, sessionReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiresLogin = !loading && !user;
  const monthlyPrice = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(amountCents / 100),
    [amountCents],
  );

  function navigateToLogin() {
    if (typeof window === "undefined") {
      navigate(
        `/login?next=${encodeURIComponent(buildSubscribePath("checkout"))}`,
      );
      return;
    }

    navigate(
      buildLoginNavigationUrl(window.location, buildSubscribePath("checkout")),
    );
  }

  async function requestCheckout(): Promise<void> {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planCode,
      }),
    });

    const data = (await response
      .json()
      .catch(() => null)) as CheckoutResponse | null;

    if (!response.ok) {
      setError(resolveDisplayError(data?.error));
      return;
    }

    if (!data?.checkoutUrl) {
      setError("Não foi possível abrir o checkout seguro agora.");
      return;
    }

    navigate(data.checkoutUrl);
  }

  async function handleHostedCheckout() {
    if (!user) {
      navigateToLogin();
      return;
    }

    if (!sessionReady || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await requestCheckout();
    } catch (requestError) {
      console.error("Failed to create Stripe checkout session", requestError);
      setError("Não foi possível iniciar o checkout agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (requiresLogin) {
    return (
      <div className={styles.guestState}>
        <button
          type="button"
          className={`btn-primary ${styles.loginButton}`}
          onClick={navigateToLogin}
          disabled={loading}
        >
          Entrar para pagar
        </button>

        <p className={styles.guestCopy}>
          Entre com sua conta para concluir a assinatura.
        </p>
      </div>
    );
  }

  const buttonLabel = isSubmitting
    ? "Abrindo checkout seguro..."
    : "Continuar para pagamento";

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`btn-primary ${styles.submitButton}`}
        disabled={loading || !sessionReady || isSubmitting}
        onClick={handleHostedCheckout}
      >
        {buttonLabel}
      </button>

      {error ? (
        <p className={`${styles.message} ${styles.messageError}`}>{error}</p>
      ) : null}

      <div className={styles.walletCard}>
        <strong>Checkout seguro com Stripe</strong>
        <p>
          Você será redirecionado para concluir {monthlyPrice}/mês no ambiente
          seguro da Stripe.
        </p>
        <ul className={styles.walletList}>
          <li>Cartões de crédito e débito</li>
          <li>Apple Pay</li>
          <li>Google Pay</li>
          <li>Link (checkout acelerado da Stripe)</li>
        </ul>
      </div>

      <p className={styles.footerNote}>
        Apple Pay, Google Pay e Link aparecem quando dispositivo, navegador e
        conta Stripe são compatíveis.
      </p>
    </div>
  );
}
