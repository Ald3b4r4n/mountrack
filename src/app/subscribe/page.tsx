import Link from "next/link";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { getBillingPlan } from "@/modules/billing/repositories/billing-store";
import styles from "./subscribe.module.css";

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function SubscribePage() {
  const plan = await getBillingPlan();
  const monthlyPrice = formatCurrency(
    plan?.amountCents ?? BILLING_MONTHLY_PRICE_CENTS,
    plan?.currency ?? BILLING_CURRENCY,
  );
  const trialDays = plan?.trialDays ?? BILLING_TRIAL_DAYS;
  const valueReadouts = [
    {
      label: "Valor mensal",
      value: monthlyPrice,
      helper: "Um unico plano para manter seu acompanhamento completo.",
    },
    {
      label: "Pagamento",
      value: "Mercado Pago",
      helper: "Checkout seguro para concluir a assinatura sem sair do app.",
    },
    {
      label: "Periodo gratis",
      value: `${trialDays} dias`,
      helper: "Voce ja usou o tempo de teste e agora precisa ativar o plano.",
    },
  ];
  const benefitCards = [
    {
      title: "Historico completo",
      text: "Peso, doses, metas e nutricao continuam no mesmo lugar, sem perder sua linha do tempo.",
    },
    {
      title: "Acesso sem ruptura",
      text: "Assim que o pagamento for confirmado, sua conta volta ao fluxo completo do app.",
    },
    {
      title: "Pagamento seguro",
      text: "Seu cartao e processado pelo Mercado Pago para concluir a assinatura com seguranca.",
    },
  ];
  const assuranceSteps = [
    {
      title: "Preencha o pagamento",
      text: "Revise o plano, informe o cartao e finalize a autorizacao da assinatura.",
    },
    {
      title: "Aguarde a confirmacao",
      text: "O pagamento precisa ser confirmado para que a assinatura volte a valer para esta conta.",
    },
    {
      title: "Volte ao app",
      text: "Depois da aprovacao, seu acesso retorna e seus registros continuam preservados.",
    },
  ];

  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.layout}>
        <section className={`glass-panel static-panel anim-enter ${styles.hero}`}>
          <div className={styles.headerBand}>
            <span className={styles.eyebrow}>MounTrack Pro</span>
            <div className={styles.protocolStamp}>
              Plano mensal
              <br />
              Pagamento seguro
            </div>
          </div>

          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>
              Continue com o <span className={styles.heroAccent}>MounTrack Pro</span> sem interromper sua jornada.
            </h1>
            <p className={styles.heroLead}>
              Seus registros ja estao aqui. Esta etapa serve apenas para ativar a assinatura e manter o acesso completo ao
              que voce ja acompanha no app.
            </p>
          </div>

          <div className={styles.readoutRail}>
            {valueReadouts.map((item) => (
              <article key={item.label} className={styles.readoutCard}>
                <span className={styles.readoutLabel}>{item.label}</span>
                <strong className={styles.readoutValue}>{item.value}</strong>
                <span className={styles.readoutHelper}>{item.helper}</span>
              </article>
            ))}
          </div>

          <div className={styles.storyGrid}>
            <article className={styles.storyCard}>
              <span className={styles.storyKicker}>Por que continuar</span>
              <h2>Seu acompanhamento continua no mesmo ritmo.</h2>
              <p>
                O plano mensal mantem dashboard, diario, metas, nutricao e historico dentro da mesma experiencia, sem
                resetar a conta e sem perder contexto.
              </p>

              <ul className={styles.benefitsList}>
                {benefitCards.map((item) => (
                  <li key={item.title} className={styles.benefitItem}>
                    <span className={styles.benefitDot} aria-hidden="true" />
                    <div>
                      <strong className={styles.benefitTitle}>{item.title}</strong>
                      <p className={styles.benefitText}>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <aside className={styles.assuranceCard}>
              <span className={styles.assuranceKicker}>Como funciona</span>
              <h2>Uma assinatura simples, com liberacao automatica.</h2>
              <p>Sem burocracia: voce paga, o app confirma e o acesso volta para a sua conta.</p>

              <ol className={styles.assuranceList}>
                {assuranceSteps.map((item, index) => (
                  <li key={item.title} className={styles.assuranceItem}>
                    <span className={styles.assuranceIndex}>{index + 1}</span>
                    <div className={styles.assuranceText}>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <div className={styles.footline}>
            <span className={styles.footTag}>Seus registros permanecem intactos.</span>
            <span className={styles.footTag}>Pagamento seguro pelo Mercado Pago.</span>
            <span className={styles.footTag}>Um unico plano para destravar tudo.</span>
          </div>
        </section>

        <aside className={`glass-panel static-panel anim-enter anim-delay-1 ${styles.checkout}`}>
          <header className={styles.checkoutHeader}>
            <span className={styles.checkoutEyebrow}>Assinatura</span>
            <h2 className={styles.checkoutTitle}>Ative seu acesso.</h2>
            <p className={styles.checkoutLead}>
              Seu periodo gratuito terminou ou sua assinatura ainda nao foi confirmada. Resolva isso aqui em poucos passos.
            </p>
          </header>

          <section className={styles.planCard}>
            <div className={styles.planTop}>
              <div>
                <span className={styles.planLabel}>Plano atual</span>
                <strong className={styles.planName}>MounTrack Pro Mensal</strong>
              </div>
              <strong className={styles.planPrice}>
                {monthlyPrice}
                <span>por mes</span>
              </strong>
            </div>

            <ul className={styles.planFeatures}>
              <li className={styles.planFeature}>Acesso ao fluxo completo do app sem perder historico.</li>
              <li className={styles.planFeature}>Dashboard, diario, metas e nutricao liberados na mesma conta.</li>
              <li className={styles.planFeature}>Pagamento processado com seguranca pelo Mercado Pago.</li>
            </ul>
          </section>

          <div className={styles.metaStrip}>
            <div className={styles.metaCard}>
              <strong>Trial</strong>
              <span>{trialDays} dias gratis antes da assinatura mensal entrar em cena.</span>
            </div>
            <div className={styles.metaCard}>
              <strong>Acesso</strong>
              <span>Depois da confirmacao do pagamento, sua conta volta automaticamente.</span>
            </div>
          </div>

          <SubscribeCheckoutButton
            planCode={plan?.code ?? BILLING_MONTHLY_PLAN_CODE}
            amountCents={plan?.amountCents ?? BILLING_MONTHLY_PRICE_CENTS}
            mercadoPagoPublicKey={process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? ""}
            sandboxPayerEmail={process.env.NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL ?? ""}
          />

          <div className={styles.actions}>
            <Link href="/" className={`btn-primary ${styles.actionPrimary}`}>
              Revalidar acesso
            </Link>
            <Link href="/login" className={`btn-outline ${styles.actionSecondary}`}>
              Trocar de conta
            </Link>
          </div>

          <p className={styles.miniNote}>
            Se voce ja concluiu o pagamento, toque em Revalidar acesso depois de alguns segundos.
          </p>
        </aside>
      </section>
    </main>
  );
}
