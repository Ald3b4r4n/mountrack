"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./BillingSubscriptionPanel.module.css";

interface BillingAccessPayload {
  authenticated?: boolean;
  effectiveStatus?: string;
  subscription?: {
    id: string;
    planName: string | null;
    planCode: string | null;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    providerSubscriptionId: string | null;
  } | null;
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function resolvePanelCopy(payload: BillingAccessPayload) {
  const subscription = payload.subscription;
  if (!subscription) {
    return null;
  }

  const renewalDate = formatDate(subscription.currentPeriodEnd);
  if (subscription.cancelAtPeriodEnd) {
    return {
      eyebrow: "Renovacao cancelada",
      title: renewalDate
        ? `Seu acesso segue ate ${renewalDate}.`
        : "Sua renovacao automatica foi cancelada.",
      description:
        "Nao haverá nova cobrança depois do ciclo atual. Seu histórico e o acesso pago continuam ativos até o fim do período já confirmado.",
      primaryAction: null,
      secondaryLabel: "Ver assinatura",
    };
  }

  return {
    eyebrow: "Assinatura ativa",
    title: renewalDate
      ? `Proxima renovacao em ${renewalDate}.`
      : "Sua assinatura esta ativa.",
    description:
      "A renovação é mensal pelo Mercado Pago. Se quiser encerrar, você pode cancelar a renovação automática e continuar usando o app até o fim do período já pago.",
    primaryAction: "Cancelar renovacao",
    secondaryLabel: "Ver assinatura",
  };
}

export function BillingSubscriptionPanel() {
  const [payload, setPayload] = useState<BillingAccessPayload | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/billing/access", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as BillingAccessPayload | null;

        if (!cancelled) {
          setPayload(response.ok ? data : null);
        }
      } catch (requestError) {
        console.error("Failed to load billing subscription panel", requestError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const panelCopy = useMemo(() => {
    if (!payload?.authenticated || !payload.subscription?.providerSubscriptionId) {
      return null;
    }

    if (payload.effectiveStatus === "trialing") {
      return null;
    }

    return resolvePanelCopy(payload);
  }, [payload]);

  async function handleCancelRenewal() {
    if (!payload?.subscription || !panelCopy?.primaryAction || isCancelling) {
      return;
    }

    const confirmed = window.confirm(
      "Cancelar a renovacao automatica? O acesso continua ativo ate o fim do periodo ja pago.",
    );

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as BillingAccessPayload | { error?: string } | null;

      if (!response.ok) {
        setError(data && "error" in data && data.error
          ? "Nao foi possivel cancelar a renovacao agora."
          : "Nao foi possivel cancelar a renovacao agora.");
        return;
      }

      if (data && "subscription" in data) {
        setPayload((current) =>
          current
            ? {
                ...current,
                subscription: data.subscription ?? current.subscription,
              }
            : current,
        );
      }

      setMessage("Renovacao automatica cancelada. O acesso segue ativo ate o fim do periodo atual.");
    } catch (requestError) {
      console.error("Failed to cancel billing renewal", requestError);
      setError("Nao foi possivel cancelar a renovacao agora.");
    } finally {
      setIsCancelling(false);
    }
  }

  if (!panelCopy || !payload?.subscription) {
    return null;
  }

  return (
    <section className={`glass-panel anim-enter ${styles.panel}`}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>{panelCopy.eyebrow}</span>
        <h2 className={styles.title}>{panelCopy.title}</h2>
        <p className={styles.description}>{panelCopy.description}</p>

        <div className={styles.metaRow}>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Plano</span>
            <strong className={styles.metaValue}>
              {payload.subscription.planName ?? "MounTrack Pro Mensal"}
            </strong>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Status</span>
            <strong className={styles.metaValue}>
              {payload.subscription.cancelAtPeriodEnd ? "Encerrando no fim do ciclo" : "Renovacao automatica ativa"}
            </strong>
          </article>
        </div>
      </div>

      <aside className={styles.actions}>
        {panelCopy.primaryAction ? (
          <button
            type="button"
            className={`btn-outline ${styles.cancelButton}`}
            onClick={handleCancelRenewal}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelando renovacao..." : panelCopy.primaryAction}
          </button>
        ) : null}

        <Link href="/subscribe" className={styles.linkButton}>
          {panelCopy.secondaryLabel}
        </Link>

        {message ? <p className={`${styles.feedback} ${styles.feedbackSuccess}`}>{message}</p> : null}
        {error ? <p className={`${styles.feedback} ${styles.feedbackError}`}>{error}</p> : null}
      </aside>
    </section>
  );
}
