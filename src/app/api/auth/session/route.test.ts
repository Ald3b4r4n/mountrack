/** @jest-environment node */

jest.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

import { DELETE, POST } from "@/app/api/auth/session/route";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

const verifyFirebaseIdTokenMock = jest.mocked(verifyFirebaseIdToken);

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets the http-only session cookie when the Firebase token is valid", async () => {
    verifyFirebaseIdTokenMock.mockResolvedValue({ uid: "user-123" });

    const response = await POST(
      new Request("http://localhost/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-firebase-token",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(verifyFirebaseIdTokenMock).toHaveBeenCalledWith("valid-firebase-token");
    expect(response.headers.get("set-cookie")).toContain("mt_session=valid-firebase-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("sets a secure cookie for https requests", async () => {
    verifyFirebaseIdTokenMock.mockResolvedValue({ uid: "user-123" });

    const response = await POST(
      new Request("https://mountrack.vercel.app/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-firebase-token",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("clears the cookie when the token is invalid", async () => {
    verifyFirebaseIdTokenMock.mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await POST(
      new Request("http://localhost/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("mt_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects requests without a bearer token", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/session", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(verifyFirebaseIdTokenMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/auth/session", () => {
  it("clears the current session cookie", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/auth/session", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("mt_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
  });
});
