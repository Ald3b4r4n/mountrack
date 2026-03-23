import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingManualGrantsConsole } from "@/components/billing/BillingManualGrantsConsole";

describe("BillingManualGrantsConsole", () => {
  const originalFetch = global.fetch;
  const originalConfirm = window.confirm;

  const payload = {
    targetUser: {
      uid: "target-1",
      email: "target@example.com",
      displayName: "Target User",
      disabled: false,
    },
    access: {
      accessAllowed: true,
      effectiveStatus: "manual_grant_active",
      entitlementStartsAt: "2026-03-23T12:00:00.000Z",
      entitlementEndsAt: "2026-04-22T12:00:00.000Z",
      manualGrantType: "courtesy",
      roles: ["user"],
    },
    subscription: null,
    grants: [
      {
        id: "grant-1",
        userId: "target-1",
        grantType: "courtesy",
        reason: "Acesso promocional",
        notes: "Campanha inicial",
        startsAt: "2026-03-23T12:00:00.000Z",
        endsAt: "2026-04-22T12:00:00.000Z",
        grantedBy: "owner-1",
        revokedAt: null,
        createdAt: "2026-03-23T12:00:00.000Z",
      },
    ],
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    window.confirm = originalConfirm;
  });

  it("loads a target user and revokes an active grant", async () => {
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => payload,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ revoked: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...payload,
          access: {
            ...payload.access,
            accessAllowed: false,
            effectiveStatus: "missing",
            manualGrantType: null,
          },
          grants: [
            {
              ...payload.grants[0],
              revokedAt: "2026-03-24T09:00:00.000Z",
            },
          ],
        }),
      } as Response);

    render(<BillingManualGrantsConsole />);

    await userEvent.type(
      screen.getByLabelText("E-mail da conta"),
      "target@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar conta" }));

    expect(
      await screen.findByText("Target User"),
    ).toBeInTheDocument();
    expect(screen.getByText("Acesso promocional")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Revogar" }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/manual-grants/grant-1",
        { method: "DELETE" },
      );
    });
    expect(
      await screen.findByText("Gratuidade revogada com sucesso."),
    ).toBeInTheDocument();
  });
});
