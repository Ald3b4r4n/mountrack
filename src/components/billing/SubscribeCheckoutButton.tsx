'use client';

import { loadMercadoPago } from "@mercadopago/sdk-js";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SubscribeCheckoutButtonProps {
  planCode: string;
  amountCents: number;
  mercadoPagoPublicKey: string;
  sandboxPayerEmail?: string;
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
  flow?: "redirect" | "direct";
  subscriptionStatus?: string;
  error?: string;
}

interface MercadoPagoCardFormData {
  token?: string | null;
}

interface MercadoPagoCardFormInstance {
  getCardFormData(): MercadoPagoCardFormData;
  unmount?: () => void;
}

interface MercadoPagoInstance {
  cardForm(config: {
    amount: string;
    iframe: boolean;
    form: Record<string, unknown>;
    callbacks?: {
      onFormMounted?: (error?: unknown) => void;
      onFetching?: (resource?: string) => (() => void) | void;
    };
  }): MercadoPagoCardFormInstance;
}

type MercadoPagoWindow = Window & {
  MercadoPago?: new (
    publicKey: string,
    options?: {
      locale?: string;
    },
  ) => MercadoPagoInstance;
};

function resolveSuccessMessage(status?: string): string {
  if (status === "authorized") {
    return "Assinatura autorizada. Aguarde a confirmacao segura do primeiro pagamento.";
  }

  if (status === "pending" || status === "in_process") {
    return "Assinatura criada. Aguarde a confirmacao do Mercado Pago para liberar o acesso.";
  }

  return "Checkout preparado. Se a confirmacao nao chegar em instantes, tente novamente.";
}

function resolveCardholderEmail(userEmail?: string | null, sandboxPayerEmail?: string | null): string {
  const sandboxEmail = sandboxPayerEmail?.trim() ?? "";
  if (sandboxEmail) {
    return sandboxEmail;
  }

  return userEmail?.trim() ?? "";
}

export function SubscribeCheckoutButton({
  planCode,
  amountCents,
  mercadoPagoPublicKey,
  sandboxPayerEmail,
  navigate = (url) => window.location.assign(url),
}: SubscribeCheckoutButtonProps) {
  const { user, loading, sessionReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isDirectFormReady, setIsDirectFormReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const cardFormRef = useRef<MercadoPagoCardFormInstance | null>(null);
  const requiresLogin = !loading && !user;
  const payerEmail = resolveCardholderEmail(typeof user?.email === "string" ? user.email : null, sandboxPayerEmail);
  const showSandboxPayerHint = Boolean(sandboxPayerEmail?.trim());
  const formPrefix = "subscribe-checkout";

  async function requestCheckout(cardTokenId?: string): Promise<void> {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planCode,
        cardTokenId,
      }),
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

    setMessage(resolveSuccessMessage(data?.subscriptionStatus));
  }

  async function handleHostedCheckout() {
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
      await requestCheckout();
    } catch (requestError) {
      console.error("Failed to create hosted billing checkout session", requestError);
      setError("Nao foi possivel preparar o checkout agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDirectCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!cardFormRef.current) {
      setError("O formulario seguro ainda nao terminou de carregar. Tente novamente em alguns segundos.");
      return;
    }

    const cardTokenId = cardFormRef.current.getCardFormData().token?.trim();
    if (!cardTokenId) {
      setError("Nao foi possivel tokenizar o cartao. Revise os dados e tente novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestCheckout(cardTokenId);
    } catch (requestError) {
      console.error("Failed to create direct billing checkout session", requestError);
      setError("Nao foi possivel autorizar a assinatura agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!user || !sessionReady) {
      cardFormRef.current = null;
      setIsDirectFormReady(false);
      setSdkError(null);
      return;
    }

    if (!mercadoPagoPublicKey.trim()) {
      cardFormRef.current = null;
      setIsDirectFormReady(false);
      setSdkError(
        "Checkout direto indisponivel: configure NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY para liberar o formulario seguro.",
      );
      return;
    }

    if (!payerEmail) {
      cardFormRef.current = null;
      setIsDirectFormReady(false);
      setSdkError("Nao foi possivel determinar o email do pagador para tokenizar o cartao.");
      return;
    }

    let isMounted = true;
    let cardFormInstance: MercadoPagoCardFormInstance | null = null;

    setIsFormLoading(true);
    setIsDirectFormReady(false);
    setSdkError(null);

    void (async () => {
      try {
        await loadMercadoPago();
        if (!isMounted) {
          return;
        }

        const MercadoPago = (window as MercadoPagoWindow).MercadoPago;
        if (!MercadoPago) {
          throw new Error("MERCADO_PAGO_SDK_UNAVAILABLE");
        }

        const mp = new MercadoPago(mercadoPagoPublicKey.trim(), {
          locale: "pt-BR",
        });

        cardFormInstance = mp.cardForm({
          amount: (amountCents / 100).toFixed(2),
          iframe: true,
          form: {
            id: `${formPrefix}__form`,
            cardNumber: {
              id: `${formPrefix}__card-number`,
              placeholder: "Numero do cartao",
            },
            expirationDate: {
              id: `${formPrefix}__expiration-date`,
              placeholder: "MM/AA",
            },
            securityCode: {
              id: `${formPrefix}__security-code`,
              placeholder: "CVV",
            },
            cardholderName: {
              id: `${formPrefix}__cardholder-name`,
              placeholder: "Nome como impresso no cartao",
            },
            issuer: {
              id: `${formPrefix}__issuer`,
            },
            installments: {
              id: `${formPrefix}__installments`,
            },
            identificationType: {
              id: `${formPrefix}__identification-type`,
            },
            identificationNumber: {
              id: `${formPrefix}__identification-number`,
              placeholder: "CPF do titular",
            },
            cardholderEmail: {
              id: `${formPrefix}__cardholder-email`,
              placeholder: "Email do pagador",
            },
          },
          callbacks: {
            onFormMounted: (mountError) => {
              if (!isMounted) {
                return;
              }

              if (mountError) {
                console.error("Failed to mount Mercado Pago card form", mountError);
                setSdkError("Nao foi possivel carregar o formulario seguro do Mercado Pago.");
                setIsFormLoading(false);
                return;
              }

              cardFormRef.current = cardFormInstance;
              setIsDirectFormReady(true);
              setIsFormLoading(false);
            },
            onFetching: () => {
              if (!isMounted) {
                return;
              }

              setIsFormLoading(true);

              return () => {
                if (!isMounted) {
                  return;
                }

                setIsFormLoading(false);
              };
            },
          },
        });
      } catch (mountError) {
        console.error("Failed to bootstrap Mercado Pago card form", mountError);
        if (!isMounted) {
          return;
        }

        setSdkError("Nao foi possivel iniciar o formulario seguro do Mercado Pago.");
        setIsFormLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      cardFormRef.current = null;
      if (typeof cardFormInstance?.unmount === "function") {
        cardFormInstance.unmount();
      }
    };
  }, [amountCents, formPrefix, mercadoPagoPublicKey, payerEmail, sessionReady, user]);

  if (requiresLogin) {
    return (
      <div style={{ display: "grid", gap: "0.65rem" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate("/login")}
          disabled={loading}
          style={{ width: "100%" }}
        >
          Entrar para pagar
        </button>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Faca login com sua conta para abrir o checkout do Mercado Pago.
        </p>
      </div>
    );
  }

  const canUseDirectCheckout = Boolean(mercadoPagoPublicKey.trim() && payerEmail && !sdkError);
  const directButtonLabel = isSubmitting
    ? "Autorizando assinatura..."
    : isFormLoading
      ? "Carregando formulario seguro..."
      : "Autorizar assinatura";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {canUseDirectCheckout ? (
        <form
          id={`${formPrefix}__form`}
          onSubmit={handleDirectCheckout}
          style={{ display: "grid", gap: "0.9rem" }}
        >
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Numero do cartao</span>
            <div
              id={`${formPrefix}__card-number`}
              style={{
                minHeight: "52px",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.02)",
                padding: "0.9rem 1rem",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Validade</span>
              <div
                id={`${formPrefix}__expiration-date`}
                style={{
                  minHeight: "52px",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "0.9rem 1rem",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.45rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Codigo de seguranca</span>
              <div
                id={`${formPrefix}__security-code`}
                style={{
                  minHeight: "52px",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "0.9rem 1rem",
                }}
              />
            </div>
          </div>

          <label style={{ display: "grid", gap: "0.45rem" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Nome do titular</span>
            <input
              id={`${formPrefix}__cardholder-name`}
              type="text"
              placeholder="Nome como impresso no cartao"
              required
              autoComplete="cc-name"
              style={{
                minHeight: "52px",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.02)",
                padding: "0.9rem 1rem",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "140px 1fr" }}>
            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Documento</span>
              <select
                id={`${formPrefix}__identification-type`}
                defaultValue="CPF"
                style={{
                  minHeight: "52px",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "0.9rem 1rem",
                  color: "var(--text-primary)",
                }}
              >
                <option value="CPF">CPF</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Numero do documento</span>
              <input
                id={`${formPrefix}__identification-number`}
                type="text"
                inputMode="numeric"
                placeholder="CPF do titular"
                required
                autoComplete="off"
                style={{
                  minHeight: "52px",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "0.9rem 1rem",
                  color: "var(--text-primary)",
                }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: "0.45rem" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Email do pagador</span>
            <input
              id={`${formPrefix}__cardholder-email`}
              type="email"
              value={payerEmail}
              readOnly
              required
              style={{
                minHeight: "52px",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.02)",
                padding: "0.9rem 1rem",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <select id={`${formPrefix}__issuer`} defaultValue="" hidden aria-hidden="true">
            <option value="">Selecionado automaticamente</option>
          </select>
          <select id={`${formPrefix}__installments`} defaultValue="1" hidden aria-hidden="true">
            <option value="1">1x</option>
          </select>

          {showSandboxPayerHint ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.6 }}>
              Sandbox do Mercado Pago ativo: o checkout usa o comprador de teste configurado na Vercel.
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            disabled={!sessionReady || !isDirectFormReady || isSubmitting || isFormLoading}
            style={{ width: "100%" }}
          >
            {directButtonLabel}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={handleHostedCheckout}
          disabled={loading || isSubmitting}
          style={{ width: "100%" }}
        >
          {isSubmitting ? "Preparando checkout..." : "Continuar para pagamento"}
        </button>
      )}

      {sdkError ? (
        <p style={{ color: "#fca5a5", fontSize: "0.92rem", lineHeight: 1.6 }}>{sdkError}</p>
      ) : null}

      {error ? (
        <p style={{ color: "#fca5a5", fontSize: "0.92rem", lineHeight: 1.6 }}>{error}</p>
      ) : null}

      {message ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>{message}</p>
      ) : null}

      {canUseDirectCheckout ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.6 }}>
          Os dados do cartao sao tokenizados no navegador pelo Mercado Pago antes de chegarem ao backend.
        </p>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.6 }}>
          Se o formulario seguro nao estiver disponivel, o app usa o checkout hospedado como fallback.
        </p>
      )}
    </div>
  );
}
