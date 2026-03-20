import Link from "next/link";
import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { getBillingPlan } from "@/modules/billing/repositories/billing-store";

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

  return (
    <main
      className="container"
      style={{
        minHeight: "85vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingBlock: "3rem",
      }}
    >
      <section
        className="glass-panel anim-enter"
        style={{
          maxWidth: "620px",
          width: "100%",
          padding: "2.5rem",
          display: "grid",
          gap: "1.25rem",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "fit-content",
            padding: "0.4rem 0.75rem",
            borderRadius: "999px",
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--accent-primary)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Trial de {trialDays} dias
        </span>

        <div>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.1, marginBottom: "0.6rem" }}>
            Continue com o MounTrack Pro
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Seu período gratuito terminou ou o acesso pago ainda não foi liberado para esta conta.
            O plano atual fica em <strong>{monthlyPrice}/mês</strong>.
          </p>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            background: "rgba(255,255,255,0.02)",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <strong>MounTrack Pro Mensal</strong>
            <strong>{monthlyPrice}</strong>
          </div>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.7, paddingLeft: "1rem" }}>
            <li>Acesso ao fluxo completo do app</li>
            <li>Controle validado por assinatura ou liberação manual</li>
            <li>Segurança reforçada para billing, acesso e auditoria</li>
          </ul>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          O checkout do Mercado Pago já está disponível para contas autenticadas. A liberação do acesso continua sendo
          concluída somente após a confirmação segura do pagamento no backend.
        </p>

        <SubscribeCheckoutButton
          planCode={plan?.code ?? BILLING_MONTHLY_PLAN_CODE}
          amountCents={plan?.amountCents ?? BILLING_MONTHLY_PRICE_CENTS}
          mercadoPagoPublicKey={process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? ""}
          sandboxPayerEmail={process.env.NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL ?? ""}
        />

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/nutrition" className="btn-primary" style={{ flex: "1 1 220px", textAlign: "center" }}>
            Tentar novamente
          </Link>
          <Link href="/login" className="btn-secondary" style={{ flex: "1 1 220px", textAlign: "center" }}>
            Trocar de conta
          </Link>
        </div>
      </section>
    </main>
  );
}
