import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readServerAppAccess } from "@/modules/billing/auth/server-access";
import { MANUAL_ACCESS_GRANT_TYPES } from "@/modules/billing/domain/types";
import { canManageManualGrants } from "@/modules/billing/manual-grants";
import { buildBillingManualGrantsPayload } from "@/modules/billing/manual-grants-server";
import {
  getManualAccessGrantById,
  getBillingStorageResponse,
  revokeManualAccessGrant,
  updateManualAccessGrant,
} from "@/modules/billing/repositories/billing-store";
import { findFirebaseUserByUid } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const updateManualGrantSchema = z.object({
  grantType: z.enum(MANUAL_ACCESS_GRANT_TYPES),
  reason: z.string().trim().min(3).max(180),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  durationDays: z.number().int().positive().max(3650).nullable().optional(),
});

function createJsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function resolveEndsAt(
  startsAt: string | Date,
  durationDays: number | null | undefined,
): string | null {
  if (!durationDays) {
    return null;
  }

  return new Date(
    new Date(startsAt).getTime() + durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
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

export async function PUT(
  request: NextRequest,
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

  const body = await request.json().catch(() => null);
  const parsedBody = updateManualGrantSchema.safeParse(body);

  if (!parsedBody.success) {
    return createJsonError("Invalid manual grant payload", 400);
  }

  try {
    const existingGrant = await getManualAccessGrantById(grantId);

    if (!existingGrant) {
      return createJsonError("Manual grant not found", 404);
    }

    if (existingGrant.revokedAt) {
      return createJsonError("Manual grant already revoked", 409);
    }

    const updatedGrant = await updateManualAccessGrant(
      {
        id: grantId,
        grantType: parsedBody.data.grantType,
        reason: parsedBody.data.reason,
        notes: parsedBody.data.notes || null,
        endsAt: resolveEndsAt(existingGrant.startsAt, parsedBody.data.durationDays),
      },
      operator.access.user.uid,
    );

    if (!updatedGrant) {
      return createJsonError("Manual grant not found", 404);
    }

    const targetUser = await findFirebaseUserByUid(existingGrant.userId);

    if (!targetUser) {
      return createJsonError("Target user not found", 404);
    }

    const payload = await buildBillingManualGrantsPayload(targetUser);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_UNAVAILABLE") {
      return createJsonError("Firebase Admin unavailable", 503);
    }

    return createJsonError("Failed to update manual grant", 500);
  }
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
