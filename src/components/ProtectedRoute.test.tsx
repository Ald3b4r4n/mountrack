import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useRouterMock = jest.mocked(useRouter);
const useAuthMock = jest.mocked(useAuth);

describe("ProtectedRoute", () => {
  const originalFetch = global.fetch;
  const pushMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouterMock.mockReturnValue({
      push: pushMock,
    } as never);
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("redirects guests to /login", async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>conteudo</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("redirects authenticated users without billing access to /subscribe", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        authenticated: true,
        accessAllowed: false,
      }),
    } as Response);

    render(
      <ProtectedRoute>
        <div>conteudo</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/access",
        expect.objectContaining({
          method: "GET",
          cache: "no-store",
        }),
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/subscribe");
    });
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("renders the page when billing access is allowed", async () => {
    useAuthMock.mockReturnValue({
      user: { uid: "user-123" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        accessAllowed: true,
      }),
    } as Response);

    render(
      <ProtectedRoute>
        <div>conteudo</div>
      </ProtectedRoute>,
    );

    expect(await screen.findByText("conteudo")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
