import Link from "next/link";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import { buildSubscribePath } from "@/modules/billing/subscribe-navigation";
import {
  BillingSubscriptionPanel,
  type BillingAccessPayload,
} from "@/components/billing/BillingSubscriptionPanel";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";
import styles from "./subscription.module.css";

const USER_SUPPORT_CONTACT = {
  email: "rafasouzacruz@gmail.com",
  phoneDisplay: "(61) 98288-7294",
  phoneHref: "tel:+5561982887294",
  whatsappHref: "https://wa.me/5561982887294",
  websiteHref: "https://antoniorafael.com.br",
  websiteLabel: "antoniorafael.com.br",
} as const;

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
      value: trialEndsAt ? `até ${trialEndsAt}` : "em andamento",
      hint: trialEndsAt
        ? `Seu acesso segue livre até ${trialEndsAt}. Depois disso, você decide se quer manter a assinatura.`
        : "Seu acesso continua livre enquanto o período de teste estiver ativo.",
    };
  }

  if (payload.subscription?.cancelAtPeriodEnd) {
    const accessEndsAt = formatDate(
      payload.entitlementEndsAt ?? payload.subscription.currentPeriodEnd,
    );

    return {
      label: "Acesso garantido",
      value: accessEndsAt ? `até ${accessEndsAt}` : "ciclo atual",
      hint: "A renovação automática já foi encerrada. Seu acesso continua ativo até o fim do período confirmado.",
    };
  }

  const renewalDate = formatDate(
    payload.subscription?.currentPeriodEnd ?? payload.entitlementEndsAt ?? null,
  );

  return {
    label: "Próxima renovação",
    value: renewalDate ?? "mensal",
    hint: "A cobrança recorrente é processada pelo Mercado Pago. Aqui você acompanha o ciclo e controla a renovação.",
  };
}

function resolveDescription(payload: BillingAccessPayload) {
  if (payload.effectiveStatus === "trialing") {
    return "Aqui você acompanha o período gratuito, entende quando a assinatura entra em cena e sabe exatamente onde voltar para concluir o plano quando fizer sentido.";
  }

  return "Esta tela concentra o estado da sua assinatura, o próximo ciclo e a opção de encerrar a renovação automática sem perder o período já pago.";
}

export default async function SubscriptionPage() {
  const access = await requireServerAppAccess();
  const canManageGrants = canManageManualGrants(access.roles);
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
          <h1 className={styles.title}>Seu acesso, seu ciclo e sua renovação.</h1>
          <p className={styles.description}>
            {resolveDescription(initialPayload)}
          </p>

          <div className={styles.heroActions}>
            <Link href="/" className="btn-outline">
              Voltar para o painel
            </Link>
            <Link
              href={buildSubscribePath("checkout")}
              className="btn-primary"
            >
              Ver plano e pagamento
            </Link>
            {canManageGrants ? (
              <Link href="/billing/grants" className="btn-outline">
                Painel de gratuidades
              </Link>
            ) : null}
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
          <h2 className={styles.detailTitle}>O que você gerencia aqui</h2>
          <p className={styles.detailText}>
            O MounTrack mostra o estado da assinatura e controla o fim da
            renovação automática, sem apagar seus dados e sem cortar o acesso
            antes do ciclo acabar.
          </p>
          <ul className={styles.detailList}>
            <li>Ver até quando o acesso atual continua liberado.</li>
            <li>Cancelar a próxima renovação quando fizer sentido.</li>
            <li>Voltar ao plano para reativar a assinatura depois.</li>
          </ul>
        </article>

        <article className={`glass-panel ${styles.detailCard}`}>
          <h2 className={styles.detailTitle}>Onde a cobrança acontece</h2>
          <p className={styles.detailText}>
            A cobrança recorrente, o cartão e a confirmação do pagamento ficam
            com o Mercado Pago. O MounTrack recebe o status e libera o acesso
            da sua conta depois da confirmação.
          </p>
          <div className={styles.supportCard}>
            <p>
              Quando precisar iniciar ou retomar a assinatura, abra
              <Link href={buildSubscribePath("checkout")}> o plano</Link> e
              siga para o ambiente do Mercado Pago.
            </p>
            <div className={styles.supportContacts}>
              <span className={styles.supportContactsTitle}>Suporte ao usuario</span>
              <a href={`mailto:${USER_SUPPORT_CONTACT.email}`}>
                Email: {USER_SUPPORT_CONTACT.email}
              </a>
              <a href={USER_SUPPORT_CONTACT.phoneHref}>
                Telefone: {USER_SUPPORT_CONTACT.phoneDisplay}
              </a>
              <a
                href={USER_SUPPORT_CONTACT.whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp: {USER_SUPPORT_CONTACT.phoneDisplay}
              </a>
              <a
                href={USER_SUPPORT_CONTACT.websiteHref}
                target="_blank"
                rel="noreferrer"
              >
                Site: {USER_SUPPORT_CONTACT.websiteLabel}
              </a>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
