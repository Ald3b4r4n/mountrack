import Link from "next/link";
import {
  BillingSubscriptionPanel,
  type BillingAccessPayload,
} from "@/components/billing/BillingSubscriptionPanel";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";
import styles from "./subscription.module.css";

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

function resolveSummaryCard(payload: BillingAccessPayload) {
  if (payload.effectiveStatus === "trialing") {
    const trialEndsAt = formatDate(payload.entitlementEndsAt ?? null);

    return {
      label: "Teste gratuito",
      value: trialEndsAt ? `ate ${trialEndsAt}` : "em andamento",
      hint: trialEndsAt
        ? `Seu acesso segue livre ate ${trialEndsAt}. Depois disso, voce decide se quer manter a assinatura.`
        : "Seu acesso continua livre enquanto o periodo de teste estiver ativo.",
    };
  }

  if (payload.subscription?.cancelAtPeriodEnd) {
    const accessEndsAt = formatDate(
      payload.entitlementEndsAt ?? payload.subscription.currentPeriodEnd,
    );

    return {
      label: "Acesso garantido",
      value: accessEndsAt ? `ate ${accessEndsAt}` : "ciclo atual",
      hint: "A renovacao automatica ja foi encerrada. Seu acesso continua ativo ate o fim do periodo confirmado.",
    };
  }

  const renewalDate = formatDate(
    payload.subscription?.currentPeriodEnd ?? payload.entitlementEndsAt ?? null,
  );

  return {
    label: "Proxima renovacao",
    value: renewalDate ?? "mensal",
    hint: "A cobranca recorrente e processada pelo Mercado Pago. Aqui voce acompanha o ciclo e controla a renovacao.",
  };
}

function resolveDescription(payload: BillingAccessPayload) {
  if (payload.effectiveStatus === "trialing") {
    return "Aqui voce acompanha o seu periodo gratuito, entende quando a assinatura entra em cena e sabe exatamente onde voltar para concluir o plano quando fizer sentido.";
  }

  return "Esta tela concentra o estado da sua assinatura, o proximo ciclo e a opcao de encerrar a renovacao automatica sem perder o periodo ja pago.";
}

export default async function SubscriptionPage() {
  const access = await requireServerAppAccess();
  const initialPayload: BillingAccessPayload = {
    authenticated: true,
    accessAllowed: access.accessAllowed,
    effectiveStatus: access.effectiveStatus,
    entitlementStartsAt: access.entitlementStartsAt,
    entitlementEndsAt: access.entitlementEndsAt,
    subscription: access.subscription,
  };
  const summary = resolveSummaryCard(initialPayload);

  return (
    <main className={`container ${styles.page}`}>
      <section className={`glass-panel anim-enter ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Minha assinatura</span>
          <h1 className={styles.title}>Seu acesso, seu ciclo e sua renovacao.</h1>
          <p className={styles.description}>
            {resolveDescription(initialPayload)}
          </p>

          <div className={styles.heroActions}>
            <Link href="/" className="btn-outline">
              Voltar para o painel
            </Link>
            <Link href="/subscribe" className="btn-primary">
              Ver plano e pagamento
            </Link>
          </div>
        </div>

        <aside className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{summary.label}</span>
          <strong className={styles.summaryValue}>{summary.value}</strong>
          <p className={styles.summaryHint}>{summary.hint}</p>
        </aside>
      </section>

      <BillingSubscriptionPanel initialPayload={initialPayload} />

      <section className={styles.detailsGrid}>
        <article className={`glass-panel ${styles.detailCard}`}>
          <h2 className={styles.detailTitle}>O que voce gerencia aqui</h2>
          <p className={styles.detailText}>
            O MounTrack mostra o estado da assinatura e controla o fim da
            renovacao automatica, sem apagar seus dados e sem cortar o acesso
            antes do ciclo acabar.
          </p>
          <ul className={styles.detailList}>
            <li>Ver ate quando o acesso atual continua liberado.</li>
            <li>Cancelar a proxima renovacao quando fizer sentido.</li>
            <li>Voltar ao plano para reativar a assinatura depois.</li>
          </ul>
        </article>

        <article className={`glass-panel ${styles.detailCard}`}>
          <h2 className={styles.detailTitle}>Onde a cobranca acontece</h2>
          <p className={styles.detailText}>
            A cobranca recorrente, o cartao e a confirmacao do pagamento ficam
            com o Mercado Pago. O MounTrack recebe o status e libera o acesso
            da sua conta depois da confirmacao.
          </p>
          <div className={styles.supportCard}>
            <p>
              Quando precisar iniciar ou retomar a assinatura, abra
              <Link href="/subscribe"> o plano</Link> e siga para o ambiente do
              Mercado Pago.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
