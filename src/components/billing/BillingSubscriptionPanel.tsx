"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
      return "Janela de regularizacao";
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
      eyebrow: "Renovacao cancelada",
      title: accessDate
        ? `Seu acesso segue ate ${accessDate}.`
        : "Sua renovacao automatica foi cancelada.",
      description:
        "Nao havera nova cobranca depois do ciclo atual. Seu historico e o acesso pago continuam ativos ate o fim do periodo ja confirmado.",
      primaryAction: null,
      secondaryLabel: "Abrir plano",
    };
  }

  return {
    eyebrow: "Assinatura ativa",
    title: accessDate
      ? `Acesso liberado ate ${accessDate}.`
      : "Sua assinatura esta ativa.",
    description:
      "A renovacao continua mensalmente no Mercado Pago. Se quiser encerrar, voce cancela a proxima cobranca aqui e continua usando o app ate o fim do periodo pago.",
    primaryAction: "Cancelar renovacao",
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
      const data = (await response.json().catch(() => null)) as
        | BillingAccessPayload
        | { error?: string }
        | null;

      if (!response.ok) {
        setError("Nao foi possivel cancelar a renovacao agora.");
        return;
      }

      if (data && "subscription" in data) {
        setSubscriptionOverride(data.subscription ?? null);
      }

      setMessage(
        "Renovacao automatica cancelada. O acesso segue ativo ate o fim do periodo atual.",
      );
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
            <span className={styles.metaLabel}>Situacao</span>
            <strong className={styles.metaValue}>{effectiveStatusLabel}</strong>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Acesso atual</span>
            <strong className={styles.metaValue}>
              {accessEndsAt ? `Ativo ate ${accessEndsAt}` : "Ativo agora"}
            </strong>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Cobranca</span>
            <strong className={styles.metaValue}>Mercado Pago · mensal</strong>
          </article>
        </div>

        <div className={styles.timelineGrid}>
          <article className={styles.timelineCard}>
            <span className={styles.timelineLabel}>Ciclo atual</span>
            <strong className={styles.timelineValue}>
              {cycleStartsAt && renewalDate
                ? `${cycleStartsAt} ate ${renewalDate}`
                : renewalDate
                  ? `Renovacao em ${renewalDate}`
                  : "Sem janela registrada"}
            </strong>
            <p className={styles.timelineHint}>
              Esse periodo define ate quando o acesso segue liberado.
            </p>
          </article>

          <article className={styles.timelineCard}>
            <span className={styles.timelineLabel}>Gestao aqui</span>
            <strong className={styles.timelineValue}>
              {payload.subscription.cancelAtPeriodEnd
                ? canceledAt
                  ? `Cancelada em ${canceledAt}`
                  : "Renovacao encerrada"
                : "Voce controla a renovacao"}
            </strong>
            <p className={styles.timelineHint}>
              O MounTrack mostra o status da assinatura e cancela a proxima
              cobranca quando voce pedir.
            </p>
          </article>
        </div>

        <div className={styles.providerCard}>
          <span className={styles.providerLabel}>
            Cobranca processada pelo Mercado Pago
          </span>
          <p className={styles.providerText}>
            O cartao e a recorrencia ficam no ambiente seguro do Mercado Pago.
            Aqui voce acompanha o ciclo, o acesso e a renovacao.
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
            {isCancelling ? "Cancelando renovacao..." : panelCopy.primaryAction}
          </button>
        ) : null}

        <Link href="/subscribe" className={styles.linkButton}>
          {panelCopy.secondaryLabel}
        </Link>

        <div className={styles.helpCard}>
          <span className={styles.helpTitle}>O que acontece ao cancelar</span>
          <ul className={styles.helpList}>
            <li>O acesso continua ate o fim do periodo ja confirmado.</li>
            <li>Nenhuma nova cobranca e feita depois desse ciclo.</li>
            <li>Se quiser voltar, voce reabre o plano em poucos toques.</li>
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
