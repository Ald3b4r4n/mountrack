import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  APP_SESSION_COOKIE_NAME,
  getAppSessionCookieOptions,
} from "@/modules/billing/auth/session-cookie";

export const runtime = "nodejs";

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(APP_SESSION_COOKIE_NAME, "", {
    ...getAppSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const decodedToken = await verifyFirebaseIdToken(token);
    const response = NextResponse.json({ ok: true, uid: decodedToken.uid });
    response.cookies.set(APP_SESSION_COOKIE_NAME, token, getAppSessionCookieOptions());
    return response;
  } catch {
    return clearSessionCookie(
      NextResponse.json({ error: "Invalid session token" }, { status: 401 }),
    );
  }
}

export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
