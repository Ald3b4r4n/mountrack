'use client';

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SubscribeCheckoutButtonProps {
  planCode: string;
  navigate?: (url: string) => void;
}

interface CheckoutResponse {
  session?: {
    id: string;
    status: string;
    expiresAt: string;
  };
  checkoutUrl?: string | null;
  provider?: string;
  error?: string;
}

export function SubscribeCheckoutButton({
  planCode,
  navigate = (url) => window.location.assign(url),
}: SubscribeCheckoutButtonProps) {
  const { user, loading, sessionReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requiresLogin = !loading && !user;

  async function handleCheckout() {
    setError(null);
    setMessage(null);

    if (!user) {
      navigate("/login");
      return;
    }

    if (!sessionReady) {
      setError("Sua sessao nao esta pronta. Faca login novamente para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planCode }),
      });

      const data = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel preparar o checkout agora.");
        return;
      }

      if (data?.checkoutUrl) {
        navigate(data.checkoutUrl);
        return;
      }

      setMessage("Checkout preparado. Se o redirecionamento nao acontecer, tente novamente.");
    } catch (requestError) {
      console.error("Failed to create billing checkout session", requestError);
      setError("Nao foi possivel preparar o checkout agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.65rem" }}>
      <button
        type="button"
        className="btn-primary"
        onClick={handleCheckout}
        disabled={loading || isSubmitting}
        style={{ width: "100%" }}
      >
        {isSubmitting
          ? "Preparando checkout..."
          : requiresLogin
            ? "Entrar para pagar"
            : "Continuar para pagamento"}
      </button>

      {requiresLogin ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Faça login com sua conta para abrir o checkout do Mercado Pago.
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "#fca5a5", fontSize: "0.92rem", lineHeight: 1.6 }}>{error}</p>
      ) : null}

      {message ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>{message}</p>
      ) : null}
    </div>
  );
}
