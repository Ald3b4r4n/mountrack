export const APP_SESSION_COOKIE_NAME = "mt_session";
export const APP_SESSION_MAX_AGE_SECONDS = 60 * 60;

export function getAppSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: APP_SESSION_MAX_AGE_SECONDS,
  };
}
