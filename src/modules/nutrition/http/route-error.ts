import { NextResponse } from "next/server";
import { ZodError } from "zod";

const UNAUTHORIZED_ERROR = "UNAUTHORIZED";

export function isUnauthorizedNutritionError(error: unknown): boolean {
  return error instanceof Error && error.message === UNAUTHORIZED_ERROR;
}

export function toNutritionRouteErrorResponse(
  error: unknown,
  options: {
    defaultMessage: string;
    unexpectedStatus?: number;
  },
): NextResponse {
  if (isUnauthorizedNutritionError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  return NextResponse.json(
    { error: options.defaultMessage },
    { status: options.unexpectedStatus ?? 500 },
  );
}
