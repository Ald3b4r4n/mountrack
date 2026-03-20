import {
  BILLING_CURRENCY,
  BILLING_MONTHLY_PLAN_CODE,
  BILLING_MONTHLY_PRICE_CENTS,
  BILLING_TRIAL_DAYS,
} from "@/modules/billing/domain/types";
import { SubscribeExperience } from "@/components/billing/SubscribeExperience";
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

  return (
    <main className={`container ${styles.page}`}>
      <SubscribeExperience
        planCode={plan?.code ?? BILLING_MONTHLY_PLAN_CODE}
        amountCents={plan?.amountCents ?? BILLING_MONTHLY_PRICE_CENTS}
        monthlyPrice={monthlyPrice}
        trialDays={trialDays}
        mercadoPagoPublicKey={process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? ""}
        sandboxPayerEmail={process.env.NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL ?? ""}
      />
    </main>
  );
}
