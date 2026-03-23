import { NextRequest, NextResponse } from "next/server";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import {
  getBillingStorageResponse,
  revokeManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";

export const runtime = "nodejs";

function createJsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function requireManualGrantOperator() {
  const access = await readServerAppAccess();

  if (!access?.user) {
    return { error: createJsonError("Missing authenticated session", 401) };
  }

  if (!canManageManualGrants(access.roles)) {
    return { error: createJsonError("Forbidden", 403) };
  }

  if (getBillingStorageResponse() !== "database") {
    return { error: createJsonError("Billing storage unavailable", 503) };
  }

  return { access };
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const operator = await requireManualGrantOperator();
  if ("error" in operator) {
    return operator.error;
  }

  const { grantId } = (await context.params) as { grantId?: string };
  if (!grantId?.trim()) {
    return createJsonError("Missing grant id", 400);
  }

  try {
    const revoked = await revokeManualAccessGrant(
      grantId,
      operator.access.user.uid,
    );

    if (!revoked) {
      return createJsonError("Manual grant not found", 404);
    }

    return NextResponse.json({ revoked: true }, { status: 200 });
  } catch {
    return createJsonError("Failed to revoke manual grant", 500);
  }
}
