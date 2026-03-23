import { NextResponse } from "next/server";
import { hasBillingPermission } from "@/modules/billing/access-policy";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import {
  getBillingStorageResponse,
  getBillingWebhookHealthSummary,
} from "@/modules/billing/repositories/billing-store";

export const runtime = "nodejs";

const RECENT_WINDOW_HOURS = 24;
const STALE_AFTER_MINUTES = 10;

export async function GET() {
  const access = await readServerAppAccess();

  if (!access?.user) {
    return NextResponse.json({ error: "Missing authenticated session" }, { status: 401 });
  }

  if (!hasBillingPermission(access.roles, "billing:webhooks:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (getBillingStorageResponse() === "unavailable") {
    return NextResponse.json({ error: "Billing storage unavailable" }, { status: 503 });
  }

  const summary = await getBillingWebhookHealthSummary(
    "mercado_pago",
    new Date(),
    RECENT_WINDOW_HOURS,
    STALE_AFTER_MINUTES,
  );

  return NextResponse.json(
    {
      ...summary,
      status:
        summary.recentFailureCount > 0 || summary.staleReceivedCount > 0
          ? "attention"
          : "healthy",
      recentWindowHours: RECENT_WINDOW_HOURS,
      staleAfterMinutes: STALE_AFTER_MINUTES,
    },
    { status: 200 },
  );
}
