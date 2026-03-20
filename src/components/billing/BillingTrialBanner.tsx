"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import styles from "./BillingTrialBanner.module.css";

interface BillingAccessPayload {
  authenticated?: boolean;
  effectiveStatus?: string;
  entitlementStartsAt?: string | null;
  entitlementEndsAt?: string | null;
}

interface TrialSnapshot {
  remainingCopy: string;
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

  if (!startsAt) {
    return {
      remainingCopy,
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
    remainingCopy,
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
    <section className={`glass-panel anim-enter ${styles.banner}`}>
      <div className={styles.content}>
        <span className={styles.eyebrow}>Teste do MounTrack Pro</span>

        <div>
          <h2 className={styles.title}>
            Seu teste esta correndo:
            <br />
            <strong>{trialSnapshot.remainingCopy}</strong> para decidir.
          </h2>
          <p className={styles.description}>
            Tudo continua liberado agora. Antes do prazo acabar, conclua a
            assinatura para seguir com peso, doses, metas e nutricao na mesma
            conta, sem pausa na rotina.
          </p>
        </div>

        <div className={styles.metaRow}>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Prazo final</span>
            <strong className={styles.metaValue}>
              {trialSnapshot.endLabel}
            </strong>
            <span className={styles.metaHint}>
              O app avisa antes do bloqueio para voce decidir com calma.
            </span>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Plano mensal</span>
            <strong className={styles.metaValue}>{monthlyPrice}</strong>
            <span className={styles.metaHint}>
              Um unico plano para manter sua conta completa.
            </span>
          </article>

          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Periodo gratis</span>
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
            <span>{trialSnapshot.progressPercent}% do periodo usado</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={styles.progressFill}
              style={{ width: `${trialSnapshot.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <aside className={styles.actionPanel}>
        <div>
          <h3 className={styles.actionTitle}>Garanta o acesso antes do fim.</h3>
          <p className={styles.actionText}>
            Quando decidir continuar, a assinatura entra na mesma conta e voce
            segue exatamente de onde parou.
          </p>
        </div>

        <div>
          <Link href="/subscribe" className={`btn-primary ${styles.cta}`}>
            Ver assinatura
          </Link>
          <div style={{ marginTop: "0.8rem" }}>
            <Link href="/subscribe" className={styles.secondaryLink}>
              Ver detalhes do plano
            </Link>
          </div>
        </div>
      </aside>
    </section>
  );
}
