import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingManualGrantsConsole } from "@/components/billing/BillingManualGrantsConsole";
import { requireServerAppAccess } from "@/modules/billing/auth/server-access";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import styles from "./page.module.css";

export default async function BillingManualGrantsPage() {
  const access = await requireServerAppAccess();

  if (!canManageManualGrants(access.roles)) {
    redirect("/subscription");
  }

  return (
    <main className={`container ${styles.page}`}>
      <section className={`glass-panel anim-enter ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Operacao interna</span>
          <h1 className={styles.title}>Painel de gratuidade e concessoes.</h1>
          <p className={styles.description}>
            Use este painel para liberar acesso manual a influenciadores,
            parceiros, equipe e cortesias planejadas, sempre com motivo e
            trilha de auditoria.
          </p>

          <div className={styles.heroActions}>
            <Link href="/subscription" className="btn-outline">
              Voltar para assinatura
            </Link>
            <Link href="/" className="btn-primary">
              Ir para o painel
            </Link>
          </div>
        </div>

        <aside className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Quem opera</span>
          <strong className={styles.summaryValue}>
            {access.user.email ?? access.user.uid}
          </strong>
          <p className={styles.summaryHint}>
            Apenas perfis com papel de owner ou admin podem conceder e revogar
            gratuidade por aqui.
          </p>
        </aside>
      </section>

      <BillingManualGrantsConsole />
    </main>
  );
}
