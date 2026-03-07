import { NextResponse } from "next/server";
import { ZodError } from "zod";

const UNAUTHORIZED_ERROR = "UNAUTHORIZED";
const AUTH_UNAVAILABLE_ERROR = "AUTH_UNAVAILABLE";

export function createUnauthorizedNutritionError(): Error {
  return new Error(UNAUTHORIZED_ERROR);
}

export function createNutritionAuthUnavailableError(): Error {
  return new Error(AUTH_UNAVAILABLE_ERROR);
}

export function isUnauthorizedNutritionError(error: unknown): boolean {
  return error instanceof Error && error.message === UNAUTHORIZED_ERROR;
}

export function isNutritionAuthUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message === AUTH_UNAVAILABLE_ERROR;
}

export function toNutritionRouteErrorResponse(
  error: unknown,
  options: {
    defaultMessage: string;
    unexpectedStatus?: number;
  },
): NextResponse {
  if (isUnauthorizedNutritionError(error)) {
    return NextResponse.json({ error: "Unauthorized", code: "nutrition_auth_unauthorized" }, { status: 401 });
  }

  if (isNutritionAuthUnavailableError(error)) {
    return NextResponse.json(
      { error: "Nutrition authentication is unavailable", code: "nutrition_auth_unavailable" },
      { status: 503 },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request payload", code: "nutrition_invalid_payload" }, { status: 400 });
  }

  return NextResponse.json(
    { error: options.defaultMessage, code: "nutrition_request_failed" },
    { status: options.unexpectedStatus ?? 500 },
  );
}
