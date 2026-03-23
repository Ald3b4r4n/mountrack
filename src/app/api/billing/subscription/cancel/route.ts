import { NextResponse } from "next/server";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { cancelMercadoPagoPreapproval } from "@/modules/billing/providers/mercado-pago";
import { upsertBillingSubscription } from "@/modules/billing/repositories/billing-store";

export const runtime = "nodejs";

function createJsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  const access = await readServerAppAccess();

  if (!access?.user) {
    return createJsonError("Missing authenticated session", 401);
  }

  const currentSubscription = access.subscription;
  if (!currentSubscription?.providerSubscriptionId) {
    return createJsonError("Billing subscription not found", 404);
  }

  if (currentSubscription.cancelAtPeriodEnd || currentSubscription.status === "cancelled") {
    return NextResponse.json(
      {
        subscription: currentSubscription,
      },
      { status: 200 },
    );
  }

  try {
    await cancelMercadoPagoPreapproval(currentSubscription.providerSubscriptionId);

    const updatedSubscription = await upsertBillingSubscription({
      id: currentSubscription.id,
      userId: currentSubscription.userId,
      planId: currentSubscription.planId,
      providerSubscriptionId: currentSubscription.providerSubscriptionId,
      status: currentSubscription.status,
      trialEndsAt: currentSubscription.trialEndsAt,
      currentPeriodStart: currentSubscription.currentPeriodStart,
      currentPeriodEnd: currentSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: true,
      canceledAt: currentSubscription.canceledAt ?? new Date().toISOString(),
      gracePeriodEndsAt: currentSubscription.gracePeriodEndsAt,
    });

    return NextResponse.json(
      {
        subscription: {
          ...updatedSubscription,
          planName: currentSubscription.planName,
          planCode: currentSubscription.planCode,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MERCADO_PAGO_")) {
      return createJsonError("Failed to cancel Mercado Pago subscription", 502);
    }

    return createJsonError("Failed to cancel billing subscription", 500);
  }
}
