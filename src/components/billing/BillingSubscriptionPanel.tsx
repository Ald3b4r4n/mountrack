"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildSubscribePath } from "@/modules/billing/subscribe-navigation";
import styles from "./BillingSubscriptionPanel.module.css";

export interface BillingAccessPayload {
  authenticated?: boolean;
  accessAllowed?: boolean;
  effectiveStatus?: string;
  entitlementStartsAt?: string | null;
  entitlementEndsAt?: string | null;
  subscription?: {
    id: string;
    userId: string;
    planId: string | null;
    planName: string | null;
    planCode: string | null;
    status: string;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    providerSubscriptionId: string | null;
    gracePeriodEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
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

function resolveEffectiveStatusLabel(payload: BillingAccessPayload): string {
  if (payload.subscription?.cancelAtPeriodEnd) {
    return "Encerrando no fim do ciclo";
  }

  switch (payload.effectiveStatus) {
    case "active":
      return "Acesso ativo";
    case "grace_period":
      return "Janela de regularização";
    case "past_due":
      return "Pagamento pendente";
    case "operator_override":
      return "Acesso operacional";
    default:
      return "Assinatura em acompanhamento";
  }
}

function resolvePanelCopy(payload: BillingAccessPayload) {
  const subscription = payload.subscription;
  if (!subscription) {
    return null;
  }

  const accessDate = formatDate(
    payload.entitlementEndsAt ?? subscription.currentPeriodEnd,
  );

  if (subscription.cancelAtPeriodEnd) {
    return {
      eyebrow: "Renovação cancelada",
      title: accessDate
        ? `Seu acesso segue até ${accessDate}.`
        : "Sua renovação automática foi cancelada.",
      description:
        "Não haverá nova cobrança depois do ciclo atual. Seu histórico e o acesso pago continuam ativos até o fim do período já confirmado.",
      primaryAction: null,
      secondaryLabel: "Abrir plano",
    };
  }

  return {
    eyebrow: "Assinatura ativa",
    title: accessDate
      ? `Acesso liberado até ${accessDate}.`
      : "Sua assinatura está ativa.",
    description:
      "A renovação continua mensalmente no Mercado Pago. Se quiser encerrar, você cancela a próxima cobrança aqui e continua usando o app até o fim do período pago.",
    primaryAction: "Cancelar renovação",
    secondaryLabel: "Abrir plano",
  };
}

interface BillingSubscriptionPanelProps {
  initialPayload: BillingAccessPayload | null;
}

export function BillingSubscriptionPanel({
  initialPayload,
}: BillingSubscriptionPanelProps) {
  const [subscriptionOverride, setSubscriptionOverride] = useState<
    BillingAccessPayload["subscription"]
  >(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(
    () =>
      initialPayload
        ? {
            ...initialPayload,
            subscription:
              subscriptionOverride ?? initialPayload.subscription ?? null,
          }
        : null,
    [initialPayload, subscriptionOverride],
  );

  const panelCopy = useMemo(() => {
    if (!payload?.authenticated || !payload.subscription?.providerSubscriptionId) {
      return null;
    }

    if (payload.effectiveStatus === "trialing") {
      return null;
    }

    return resolvePanelCopy(payload);
  }, [payload]);

  const accessEndsAt = formatDate(
    payload?.entitlementEndsAt ?? payload?.subscription?.currentPeriodEnd ?? null,
  );
  const cycleStartsAt = formatDate(
    payload?.subscription?.currentPeriodStart ?? null,
  );
  const renewalDate = formatDate(payload?.subscription?.currentPeriodEnd ?? null);
  const canceledAt = formatDate(payload?.subscription?.canceledAt ?? null);
  const effectiveStatusLabel = payload
    ? resolveEffectiveStatusLabel(payload)
    : null;

  async function handleCancelRenewal() {
    if (!payload?.subscription || !panelCopy?.primaryAction || isCancelling) {
      return;
    }

    const confirmed = window.confirm(
      "Cancelar a renovação automática? O acesso continua ativo até o fim do período já pago.",
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
      const data = (await response.json().catch(() => null)) as
        | BillingAccessPayload
        | { error?: string }
        | null;

      if (!response.ok) {
        setError("Não foi possível cancelar a renovação agora.");
        return;
      }

      if (data && "subscription" in data) {
        setSubscriptionOverride(data.subscription ?? null);
      }

      setMessage(
        "Renovação automática cancelada. O acesso segue ativo até o fim do período atual.",
      );
    } catch (requestError) {
      console.error("Failed to cancel billing renewal", requestError);
      setError("Não foi possível cancelar a renovação agora.");
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
            <span className={styles.metaLabel}>Situação</span>
            <strong className={styles.metaValue}>{effectiveStatusLabel}</strong>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Acesso atual</span>
            <strong className={styles.metaValue}>
              {accessEndsAt ? `Ativo até ${accessEndsAt}` : "Ativo agora"}
            </strong>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Cobrança</span>
            <strong className={styles.metaValue}>Mercado Pago | mensal</strong>
          </article>
        </div>

        <div className={styles.timelineGrid}>
          <article className={styles.timelineCard}>
            <span className={styles.timelineLabel}>Ciclo atual</span>
            <strong className={styles.timelineValue}>
              {cycleStartsAt && renewalDate
                ? `${cycleStartsAt} até ${renewalDate}`
                : renewalDate
                  ? `Renovação em ${renewalDate}`
                  : "Sem janela registrada"}
            </strong>
            <p className={styles.timelineHint}>
              Esse período define até quando o acesso segue liberado.
            </p>
          </article>

          <article className={styles.timelineCard}>
            <span className={styles.timelineLabel}>Gestão aqui</span>
            <strong className={styles.timelineValue}>
              {payload.subscription.cancelAtPeriodEnd
                ? canceledAt
                  ? `Cancelada em ${canceledAt}`
                  : "Renovação encerrada"
                : "Você controla a renovação"}
            </strong>
            <p className={styles.timelineHint}>
              O MounTrack mostra o status da assinatura e cancela a próxima
              cobrança quando você pedir.
            </p>
          </article>
        </div>

        <div className={styles.providerCard}>
          <span className={styles.providerLabel}>
            Cobrança processada pelo Mercado Pago
          </span>
          <p className={styles.providerText}>
            O cartão e a recorrência ficam no ambiente seguro do Mercado Pago.
            Aqui você acompanha o ciclo, o acesso e a renovação.
          </p>
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
            {isCancelling ? "Cancelando renovação..." : panelCopy.primaryAction}
          </button>
        ) : null}

        <Link
          href={buildSubscribePath("checkout")}
          className={styles.linkButton}
        >
          {panelCopy.secondaryLabel}
        </Link>

        <div className={styles.helpCard}>
          <span className={styles.helpTitle}>O que acontece ao cancelar</span>
          <ul className={styles.helpList}>
            <li>O acesso continua até o fim do período já confirmado.</li>
            <li>Nenhuma nova cobrança é feita depois desse ciclo.</li>
            <li>Se quiser voltar, você reabre o plano em poucos toques.</li>
          </ul>
        </div>

        {message ? (
          <p className={`${styles.feedback} ${styles.feedbackSuccess}`}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p className={`${styles.feedback} ${styles.feedbackError}`}>
            {error}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
