import { NextRequest, NextResponse } from "next/server";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import { getBillingStorageResponse } from "@/modules/billing/repositories/billing-store";
import { listFirebaseUsers } from "@/lib/firebase-admin";

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

export async function GET(request: NextRequest) {
  const operator = await requireManualGrantOperator();
  if ("error" in operator) {
    return operator.error;
  }

  const cursor = request.nextUrl.searchParams.get("cursor");

  try {
    const payload = await listFirebaseUsers(25, cursor);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_UNAVAILABLE") {
      return createJsonError("Firebase Admin unavailable", 503);
    }

    return createJsonError("Failed to list users", 500);
  }
}
