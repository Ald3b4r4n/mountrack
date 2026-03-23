import Link from "next/link";
import {
  BillingSubscriptionPanel,
  type BillingAccessPayload,
} from "@/components/billing/BillingSubscriptionPanel";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";
import styles from "./subscription.module.css";

export default async function SubscriptionPage() {
  const access = await requireServerAppAccess();
  const initialPayload: BillingAccessPayload = {
    authenticated: true,
    accessAllowed: access.accessAllowed,
    effectiveStatus: access.effectiveStatus,
    subscription: access.subscription,
  };

  return (
    <main className={`container ${styles.page}`}>
      <section className={`glass-panel anim-enter ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Minha assinatura</span>
          <h1 className={styles.title}>Gerencie sua renovacao com clareza.</h1>
          <p className={styles.description}>
            Esta tela concentra o estado da sua assinatura, o proximo ciclo e a
            opcao de cancelar a renovacao automatica sem perder o periodo ja
            pago.
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
          <span className={styles.summaryLabel}>O que voce faz aqui</span>
          <strong className={styles.summaryValue}>1 lugar</strong>
          <p className={styles.summaryHint}>
            Consulte a renovacao, confirme ate quando o acesso segue ativo e
            encerre a proxima cobranca quando fizer sentido para a sua rotina.
          </p>
        </aside>
      </section>

      <BillingSubscriptionPanel initialPayload={initialPayload} />

      <section className={styles.detailsGrid}>
        <article className={`glass-panel ${styles.detailCard}`}>
          <h2 className={styles.detailTitle}>Como o cancelamento funciona</h2>
          <p className={styles.detailText}>
            Cancelar aqui encerra a renovacao automatica no Mercado Pago, mas
            nao derruba o seu acesso no mesmo instante.
          </p>
          <ul className={styles.detailList}>
            <li>O periodo ja pago continua ativo ate a data final do ciclo.</li>
            <li>Seu historico, metas, diario e nutricao permanecem na conta.</li>
            <li>Se quiser voltar depois, basta abrir o plano novamente.</li>
          </ul>
        </article>

        <article className={`glass-panel ${styles.detailCard}`}>
          <h2 className={styles.detailTitle}>Quando usar a tela de pagamento</h2>
          <p className={styles.detailText}>
            A tela de pagamento continua sendo o lugar certo para iniciar uma
            nova assinatura, concluir o checkout ou revisar o plano mensal.
          </p>
          <div className={styles.supportCard}>
            <p>
              Se a assinatura ja foi encerrada ou o ciclo terminou, volte para
              <Link href="/subscribe"> o plano</Link> e ative o acesso de novo.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
