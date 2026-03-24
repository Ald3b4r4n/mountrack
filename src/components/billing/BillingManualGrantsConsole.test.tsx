import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingManualGrantsConsole } from "@/components/billing/BillingManualGrantsConsole";

describe("BillingManualGrantsConsole", () => {
  const originalFetch = global.fetch;
  const originalConfirm = window.confirm;

  const usersPayload = {
    users: [
      {
        uid: "target-1",
        email: "target@example.com",
        displayName: "Target User",
        disabled: false,
      },
      {
        uid: "target-2",
        email: "other@example.com",
        displayName: "Other User",
        disabled: false,
      },
    ],
    nextPageToken: "cursor-2",
  } as const;

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

  it("loads the user directory and opens a selected account", async () => {
    jest.mocked(global.fetch).mockImplementation(async (input) => {
      const url = String(input);

      if (url === "/api/billing/manual-grants/users") {
        return {
          ok: true,
          json: async () => usersPayload,
        } as Response;
      }

      if (url === "/api/billing/manual-grants?uid=target-1") {
        return {
          ok: true,
          json: async () => payload,
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    expect(await screen.findByText("Other User")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Target User/i }),
    );

    expect(await screen.findByText("Acesso promocional")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Conceder gratuidade" }),
    ).toBeInTheDocument();
  });

  it("edits an active grant and refreshes the payload", async () => {
    jest.mocked(global.fetch).mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "/api/billing/manual-grants/users") {
        return {
          ok: true,
          json: async () => usersPayload,
        } as Response;
      }

      if (url === "/api/billing/manual-grants?uid=target-1") {
        return {
          ok: true,
          json: async () => payload,
        } as Response;
      }

      if (
        url === "/api/billing/manual-grants/grant-1" &&
        init?.method === "PUT"
      ) {
        return {
          ok: true,
          json: async () => ({
            ...payload,
            grants: [
              {
                ...payload.grants[0],
                grantType: "partner",
                reason: "Parceria ampliada",
                notes: "Novo ciclo",
                endsAt: "2026-06-21T12:00:00.000Z",
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Target User/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Editar gratuidade" }),
      ).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "partner");
    await userEvent.clear(screen.getByLabelText("Motivo"));
    await userEvent.type(screen.getByLabelText("Motivo"), "Parceria ampliada");
    await userEvent.clear(screen.getByLabelText("Observacoes internas"));
    await userEvent.type(
      screen.getByLabelText("Observacoes internas"),
      "Novo ciclo",
    );
    await userEvent.selectOptions(screen.getByLabelText("Duracao"), "90");
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar edicao" }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/manual-grants/grant-1",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
    expect(
      await screen.findByText("Gratuidade atualizada com sucesso."),
    ).toBeInTheDocument();
  });

  it("revokes an active grant from the history", async () => {
    let lookupCount = 0;

    jest.mocked(global.fetch).mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "/api/billing/manual-grants/users") {
        return {
          ok: true,
          json: async () => usersPayload,
        } as Response;
      }

      if (url === "/api/billing/manual-grants?uid=target-1") {
        lookupCount += 1;

        return {
          ok: true,
          json: async () =>
            lookupCount === 1
              ? payload
              : {
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
                },
        } as Response;
      }

      if (
        url === "/api/billing/manual-grants/grant-1" &&
        init?.method === "DELETE"
      ) {
        return {
          ok: true,
          json: async () => ({ revoked: true }),
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Target User/i }),
    );
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
