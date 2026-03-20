'use client';

import { loadMercadoPago } from "@mercadopago/sdk-js";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildLoginNavigationUrl } from "@/modules/billing/auth/login-navigation";
import styles from "./SubscribeCheckoutButton.module.css";

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
    return "Assinatura autorizada. Aguarde a confirmacao do primeiro pagamento.";
  }

  if (status === "pending" || status === "in_process") {
    return "Assinatura criada. Aguarde a confirmacao do pagamento para liberar o acesso.";
  }

  return "Pedido criado. Se a confirmacao nao chegar em instantes, tente novamente.";
}

function resolveCardholderEmail(
  userEmail?: string | null,
  sandboxPayerEmail?: string | null,
): string {
  const sandboxEmail = sandboxPayerEmail?.trim() ?? "";
  if (sandboxEmail) {
    return sandboxEmail;
  }

  return userEmail?.trim() ?? "";
}

function resolveDisplayError(errorMessage?: string | null): string {
  const normalized = errorMessage?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "Nao foi possivel iniciar o pagamento agora. Tente novamente em instantes.";
  }

  if (normalized.includes("missing authenticated session")) {
    return "Sua sessao expirou. Faca login novamente para continuar.";
  }

  if (normalized.includes("test buyer email missing")) {
    return "O pagamento nao esta disponivel agora. Tente novamente em instantes.";
  }

  if (normalized.includes("public key")) {
    return "O pagamento por cartao ainda nao esta disponivel no momento.";
  }

  if (normalized.includes("service unavailable")) {
    return "O checkout nao esta disponivel agora. Tente novamente em instantes.";
  }

  return "Nao foi possivel iniciar o pagamento agora. Tente novamente em instantes.";
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
  const payerEmail = resolveCardholderEmail(
    typeof user?.email === "string" ? user.email : null,
    sandboxPayerEmail,
  );
  const formPrefix = "subscribe-checkout";

  function navigateToLogin() {
    if (typeof window === "undefined") {
      navigate("/login");
      return;
    }

    const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    navigate(buildLoginNavigationUrl(window.location, nextPath));
  }

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

    const data = (await response.json().catch(() => null)) as
      | CheckoutResponse
      | null;
    if (!response.ok) {
      setError(resolveDisplayError(data?.error));
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
      navigateToLogin();
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
      console.error(
        "Failed to create hosted billing checkout session",
        requestError,
      );
      setError(
        "Nao foi possivel iniciar o pagamento agora. Tente novamente em instantes.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDirectCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!cardFormRef.current) {
      setError(
        "O formulario de pagamento ainda esta carregando. Tente novamente em alguns segundos.",
      );
      return;
    }

    const cardTokenId = cardFormRef.current.getCardFormData().token?.trim();
    if (!cardTokenId) {
      setError("Revise os dados do cartao e tente novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestCheckout(cardTokenId);
    } catch (requestError) {
      console.error(
        "Failed to create direct billing checkout session",
        requestError,
      );
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
      setSdkError("O pagamento por cartao ainda nao esta disponivel no momento.");
      return;
    }

    if (!payerEmail) {
      cardFormRef.current = null;
      setIsDirectFormReady(false);
      setSdkError("Nao foi possivel preparar o pagamento agora.");
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
                console.error(
                  "Failed to mount Mercado Pago card form",
                  mountError,
                );
                setSdkError("Nao foi possivel carregar o formulario de pagamento.");
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
        console.error(
          "Failed to bootstrap Mercado Pago card form",
          mountError,
        );
        if (!isMounted) {
          return;
        }

        setSdkError("Nao foi possivel iniciar o formulario de pagamento.");
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
  }, [
    amountCents,
    formPrefix,
    mercadoPagoPublicKey,
    payerEmail,
    sessionReady,
    user,
  ]);

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

  const canUseDirectCheckout = Boolean(
    mercadoPagoPublicKey.trim() && payerEmail && !sdkError,
  );
  const directButtonLabel = isSubmitting
    ? "Autorizando assinatura..."
    : isFormLoading
      ? "Carregando formulario seguro..."
      : "Autorizar assinatura";

  return (
    <div className={styles.root}>
      {canUseDirectCheckout ? (
        <form
          id={`${formPrefix}__form`}
          onSubmit={handleDirectCheckout}
          className={styles.form}
        >
          <div className={styles.fieldGroup}>
            <label
              htmlFor={`${formPrefix}__card-number`}
              className={styles.label}
            >
              Numero do cartao
            </label>
            <div
              id={`${formPrefix}__card-number`}
              className={styles.secureMount}
            />
          </div>

          <div className={styles.fieldRowTwo}>
            <div className={styles.fieldGroup}>
              <label
                htmlFor={`${formPrefix}__expiration-date`}
                className={styles.label}
              >
                Validade
              </label>
              <div
                id={`${formPrefix}__expiration-date`}
                className={styles.secureMount}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label
                htmlFor={`${formPrefix}__security-code`}
                className={styles.label}
              >
                Codigo de seguranca
              </label>
              <div
                id={`${formPrefix}__security-code`}
                className={styles.secureMount}
              />
            </div>
          </div>

          <label className={styles.fieldGroup}>
            <span className={styles.label}>Nome do titular</span>
            <input
              id={`${formPrefix}__cardholder-name`}
              type="text"
              placeholder="Nome como impresso no cartao"
              required
              autoComplete="cc-name"
              className={styles.input}
            />
          </label>

          <div className={styles.fieldRowDoc}>
            <label className={styles.fieldGroup}>
              <span className={styles.label}>Documento</span>
              <select
                id={`${formPrefix}__identification-type`}
                defaultValue="CPF"
                className={styles.select}
              >
                <option value="CPF">CPF</option>
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.label}>Numero do documento</span>
              <input
                id={`${formPrefix}__identification-number`}
                type="text"
                inputMode="numeric"
                placeholder="CPF do titular"
                required
                autoComplete="off"
                className={styles.input}
              />
            </label>
          </div>

          <label className={styles.fieldGroup}>
            <span className={styles.label}>Email do pagador</span>
            <input
              id={`${formPrefix}__cardholder-email`}
              type="email"
              value={payerEmail}
              readOnly
              required
              className={styles.input}
            />
          </label>

          <select
            id={`${formPrefix}__issuer`}
            defaultValue=""
            hidden
            aria-hidden="true"
            className={styles.hiddenNative}
          >
            <option value="">Selecionado automaticamente</option>
          </select>
          <select
            id={`${formPrefix}__installments`}
            defaultValue="1"
            hidden
            aria-hidden="true"
            className={styles.hiddenNative}
          >
            <option value="1">1x</option>
          </select>

          <button
            type="submit"
            className={`btn-primary ${styles.submitButton}`}
            disabled={
              !sessionReady ||
              !isDirectFormReady ||
              isSubmitting ||
              isFormLoading
            }
          >
            {directButtonLabel}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className={`btn-primary ${styles.fallbackButton}`}
          onClick={handleHostedCheckout}
          disabled={loading || isSubmitting}
        >
          {isSubmitting ? "Preparando checkout..." : "Continuar para pagamento"}
        </button>
      )}

      {sdkError ? (
        <p className={`${styles.message} ${styles.messageError}`}>{sdkError}</p>
      ) : null}
      {error ? (
        <p className={`${styles.message} ${styles.messageError}`}>{error}</p>
      ) : null}
      {message ? (
        <p className={`${styles.message} ${styles.messageSuccess}`}>{message}</p>
      ) : null}

      {canUseDirectCheckout ? (
        <p className={styles.footerNote}>Pagamento seguro via Mercado Pago.</p>
      ) : (
        <p className={styles.footerNote}>
          Se preferir, voce tambem pode continuar no checkout do Mercado Pago.
        </p>
      )}
    </div>
  );
}
