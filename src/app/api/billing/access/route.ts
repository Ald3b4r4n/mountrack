import { NextResponse } from "next/server";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";

export const runtime = "nodejs";

export async function GET() {
  const access = await readServerAppAccess();

  if (!access?.user) {
    return NextResponse.json(
      {
        authenticated: false,
        accessAllowed: false,
        effectiveStatus: "missing",
        entitlementStartsAt: null,
        entitlementEndsAt: null,
        roles: [],
        subscription: null,
      },
      { status: 401 },
    );
  }

  const body = {
    authenticated: true,
    accessAllowed: access.accessAllowed,
    effectiveStatus: access.effectiveStatus,
    entitlementStartsAt: access.entitlementStartsAt,
    entitlementEndsAt: access.entitlementEndsAt,
    roles: access.roles,
    subscription: access.subscription,
  };
  return NextResponse.json(body, { status: 200 });
}
