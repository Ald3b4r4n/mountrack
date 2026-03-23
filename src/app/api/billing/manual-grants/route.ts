import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { MANUAL_ACCESS_GRANT_TYPES } from "@/modules/billing/domain/types";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import { buildBillingManualGrantsPayload } from "@/modules/billing/manual-grants-server";
import {
  getBillingStorageResponse,
  saveManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";
import { findFirebaseUserByEmail } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const createManualGrantSchema = z.object({
  targetEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  grantType: z.enum(MANUAL_ACCESS_GRANT_TYPES),
  reason: z.string().trim().min(3).max(180),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  durationDays: z.number().int().positive().max(3650).nullable().optional(),
});

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

function resolveEndsAt(
  startsAt: Date,
  durationDays: number | null | undefined,
): string | null {
  if (!durationDays) {
    return null;
  }

  return new Date(
    startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function GET(request: NextRequest) {
  const operator = await requireManualGrantOperator();
  if ("error" in operator) {
    return operator.error;
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return createJsonError("Missing target email", 400);
  }

  try {
    const targetUser = await findFirebaseUserByEmail(email);

    if (!targetUser) {
      return createJsonError("Target user not found", 404);
    }

    const payload = await buildBillingManualGrantsPayload(targetUser);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_UNAVAILABLE") {
      return createJsonError("Firebase Admin unavailable", 503);
    }

    return createJsonError("Failed to load manual grants", 500);
  }
}

export async function POST(request: NextRequest) {
  const operator = await requireManualGrantOperator();
  if ("error" in operator) {
    return operator.error;
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createManualGrantSchema.safeParse(body);

  if (!parsedBody.success) {
    return createJsonError("Invalid manual grant payload", 400);
  }

  try {
    const targetUser = await findFirebaseUserByEmail(parsedBody.data.targetEmail);

    if (!targetUser) {
      return createJsonError("Target user not found", 404);
    }

    const now = new Date();
    await saveManualAccessGrant({
      id: `manual-grant:${targetUser.uid}:${randomUUID()}`,
      userId: targetUser.uid,
      grantType: parsedBody.data.grantType,
      reason: parsedBody.data.reason,
      notes: parsedBody.data.notes || null,
      startsAt: now.toISOString(),
      endsAt: resolveEndsAt(now, parsedBody.data.durationDays),
      grantedBy: operator.access.user.uid,
    });

    const payload = await buildBillingManualGrantsPayload(targetUser, now);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_UNAVAILABLE") {
      return createJsonError("Firebase Admin unavailable", 503);
    }

    return createJsonError("Failed to save manual grant", 500);
  }
}
