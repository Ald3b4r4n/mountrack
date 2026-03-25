"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import { buildSubscribePath } from "@/modules/billing/subscribe-navigation";
import styles from "./BillingTrialBanner.module.css";

interface BillingAccessPayload {
  authenticated?: boolean;
  effectiveStatus?: string;
  entitlementStartsAt?: string | null;
  entitlementEndsAt?: string | null;
}

interface TrialSnapshot {
  urgency: "calm" | "attention" | "urgent";
  titlePrefix: string;
  remainingCopy: string;
  bodyCopy: string;
  actionTitle: string;
  actionCopy: string;
  ctaLabel: string;
  endLabel: string;
  progressPercent: number;
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatTrialSnapshot(
  startsAt: string | null,
  endsAt: string,
  now: Date,
): TrialSnapshot {
  const endDate = new Date(endsAt);
  const remainingMs = Math.max(0, endDate.getTime() - now.getTime());
  const dayMs = 1000 * 60 * 60 * 24;
  const hourMs = 1000 * 60 * 60;
  const minuteMs = 1000 * 60;

  let remainingCopy = "termina hoje";
  if (remainingMs >= dayMs) {
    const days = Math.ceil(remainingMs / dayMs);
    remainingCopy = `faltam ${days} dia${days === 1 ? "" : "s"}`;
  } else if (remainingMs >= hourMs) {
    const hours = Math.ceil(remainingMs / hourMs);
    remainingCopy = `faltam ${hours} hora${hours === 1 ? "" : "s"}`;
  } else if (remainingMs >= minuteMs) {
    const minutes = Math.max(1, Math.ceil(remainingMs / minuteMs));
    remainingCopy = `faltam ${minutes} min`;
  }

  const endLabel = endDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  let urgency: TrialSnapshot["urgency"] = "calm";
  let titlePrefix = "Seu teste está em andamento:";
  let bodyCopy =
    "Tudo continua liberado por enquanto. Antes do prazo acabar, conclua a assinatura para seguir com peso, doses, metas e nutrição na mesma conta, sem pausa na rotina.";
  let actionTitle = "Garanta o acesso antes do fim.";
  let actionCopy =
    "Quando decidir continuar, a assinatura entra na mesma conta e você segue exatamente de onde parou.";
  let ctaLabel = "Ver assinatura";

  if (remainingMs <= dayMs) {
    urgency = "urgent";
    titlePrefix = "Últimas horas do seu teste:";
    bodyCopy =
      "O período grátis está quase no fim. Se você quer manter a conta completa, vale concluir a assinatura agora e evitar o bloqueio.";
    actionTitle = "Não deixe a rotina parar.";
    actionCopy =
      "Peso, doses, metas e nutrição continuam na mesma conta assim que a assinatura for concluída.";
    ctaLabel = "Assinar agora";
  } else if (remainingMs <= 2 * dayMs) {
    urgency = "attention";
    titlePrefix = "Seu teste entrou na reta final:";
    bodyCopy =
      "Ainda dá tempo de decidir com calma. Se o app já faz sentido para a sua rotina, prepare a assinatura antes do prazo acabar.";
    actionTitle = "Deixe o acesso pronto.";
    actionCopy =
      "Concluir a assinatura agora evita correria na última hora e mantém o app completo na mesma conta.";
    ctaLabel = "Garantir acesso";
  }

  if (!startsAt) {
    return {
      urgency,
      titlePrefix,
      remainingCopy,
      bodyCopy,
      actionTitle,
      actionCopy,
      ctaLabel,
      endLabel,
      progressPercent: 50,
    };
  }

  const startDate = new Date(startsAt);
  const totalMs = Math.max(1, endDate.getTime() - startDate.getTime());
  const elapsedMs = Math.min(
    totalMs,
    Math.max(0, now.getTime() - startDate.getTime()),
  );

  return {
    urgency,
    titlePrefix,
    remainingCopy,
    bodyCopy,
    actionTitle,
    actionCopy,
    ctaLabel,
    endLabel,
    progressPercent: Math.round((elapsedMs / totalMs) * 100),
  };
}

export function BillingTrialBanner() {
  const [payload, setPayload] = useState<BillingAccessPayload | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/billing/access", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | BillingAccessPayload
          | null;

        if (!cancelled) {
          setPayload(response.ok ? data : null);
        }
      } catch (error) {
        console.error("Failed to load billing trial banner", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const trialSnapshot = useMemo(() => {
    if (
      payload?.effectiveStatus !== "trialing" ||
      !payload.entitlementEndsAt
    ) {
      return null;
    }

    return formatTrialSnapshot(
      payload.entitlementStartsAt ?? null,
      payload.entitlementEndsAt,
      now,
    );
  }, [now, payload]);

  if (!trialSnapshot) {
    return null;
  }

  const monthlyPrice = formatCurrency(
    BILLING_MONTHLY_PRICE_CENTS,
    BILLING_CURRENCY,
  );

  return (
    <section
      className={`glass-panel anim-enter ${styles.banner} ${
        trialSnapshot.urgency === "attention"
          ? styles.bannerAttention
          : trialSnapshot.urgency === "urgent"
            ? styles.bannerUrgent
            : ""
      }`}
    >
      <div className={styles.content}>
        <span
          className={`${styles.eyebrow} ${
            trialSnapshot.urgency === "attention"
              ? styles.eyebrowAttention
              : trialSnapshot.urgency === "urgent"
                ? styles.eyebrowUrgent
                : ""
          }`}
        >
          {trialSnapshot.urgency === "urgent"
            ? "Teste acabando"
            : trialSnapshot.urgency === "attention"
              ? "Reta final do teste"
              : "Teste do MounTrack Pro"}
        </span>

        <div>
          <h2 className={styles.title}>
            {trialSnapshot.titlePrefix}
            <br />
            <strong>{trialSnapshot.remainingCopy}</strong> para decidir.
          </h2>
          <p className={styles.description}>{trialSnapshot.bodyCopy}</p>
        </div>

        <div className={styles.metaRow}>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Prazo final</span>
            <strong className={styles.metaValue}>
              {trialSnapshot.endLabel}
            </strong>
            <span className={styles.metaHint}>
              O app avisa antes do bloqueio para você decidir com calma.
            </span>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Plano mensal</span>
            <strong className={styles.metaValue}>{monthlyPrice}</strong>
            <span className={styles.metaHint}>
              Um único plano para manter sua conta completa.
            </span>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Período grátis</span>
            <strong className={styles.metaValue}>
              {BILLING_TRIAL_DAYS} dias
            </strong>
            <span className={styles.metaHint}>
              Use tudo primeiro e conclua a assinatura depois, se fizer sentido.
            </span>
          </article>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressCopy}>
            <span>Janela do teste em andamento</span>
            <span>{trialSnapshot.progressPercent}% do período usado</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={`${styles.progressFill} ${
                trialSnapshot.urgency === "attention"
                  ? styles.progressFillAttention
                  : trialSnapshot.urgency === "urgent"
                    ? styles.progressFillUrgent
                    : ""
              }`}
              style={{ width: `${trialSnapshot.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <aside
        className={`${styles.actionPanel} ${
          trialSnapshot.urgency === "urgent"
            ? styles.actionPanelUrgent
            : ""
        }`}
      >
        <div>
          <h3 className={styles.actionTitle}>{trialSnapshot.actionTitle}</h3>
          <p className={styles.actionText}>{trialSnapshot.actionCopy}</p>
        </div>

        <div>
          <Link
            href={buildSubscribePath("checkout")}
            className={`btn-primary ${styles.cta}`}
          >
            {trialSnapshot.ctaLabel}
          </Link>
          <div style={{ marginTop: "0.8rem" }}>
            <Link
              href={buildSubscribePath("plan")}
              className={styles.secondaryLink}
            >
              Ver detalhes do plano
            </Link>
          </div>
        </div>
      </aside>
    </section>
  );
}
