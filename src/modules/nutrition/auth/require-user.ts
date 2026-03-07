import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import type { NutritionGoal } from "@/modules/nutrition/domain/types";
import {
  createUnauthorizedNutritionError,
  isNutritionAuthUnavailableError,
} from "@/modules/nutrition/http/route-error";

export interface NutritionUser {
  uid: string;
  devMode: boolean;
}

function defaultGoalForUser(userId: string): NutritionGoal {
  return {
    userId,
    targetCalories: 2000,
    targetWaterMl: 2200,
    targetProtein: 140,
    targetCarbs: 180,
    targetFat: 65,
    objective: "maintain",
  };
}

function isLocalDevRequest(request: Request): boolean {
  const { hostname } = new URL(request.url);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export async function requireNutritionUser(request: Request): Promise<{ user: NutritionUser; defaultGoal: NutritionGoal }> {
  const authorization = request.headers.get("authorization");
  const devUserId = request.headers.get("x-dev-user-id");
  const devAuthMode = request.headers.get("x-dev-auth-mode");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.replace("Bearer ", "");
    let decodedToken: { uid: string };

    try {
      decodedToken = await verifyFirebaseIdToken(token);
    } catch (error) {
      if (isNutritionAuthUnavailableError(error)) {
        throw error;
      }

      throw createUnauthorizedNutritionError();
    }

    return {
      user: { uid: decodedToken.uid, devMode: false },
      defaultGoal: defaultGoalForUser(decodedToken.uid),
    };
  }

  if (process.env.NODE_ENV !== "production" && devUserId && devAuthMode === "preview" && isLocalDevRequest(request)) {
    return {
      user: { uid: devUserId, devMode: true },
      defaultGoal: defaultGoalForUser(devUserId),
    };
  }

  throw createUnauthorizedNutritionError();
}
