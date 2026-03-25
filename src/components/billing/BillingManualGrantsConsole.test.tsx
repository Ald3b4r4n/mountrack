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
    auditLogs: [
      {
        id: "audit-1",
        actorUserId: "owner-1",
        action: "billing.manual_grant_saved",
        targetType: "manual_access_grant",
        targetId: "grant-1",
        metadata: {
          userId: "target-1",
          grantType: "courtesy",
          reason: "Acesso promocional",
        },
        createdAt: "2026-03-23T12:00:00.000Z",
      },
    ],
    operatorUsers: {
      "owner-1": {
        uid: "owner-1",
        email: "owner@example.com",
        displayName: "Owner User",
        disabled: false,
      },
      "admin-1": {
        uid: "admin-1",
        email: "admin@example.com",
        displayName: "Admin User",
        disabled: false,
      },
    },
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
    expect(screen.getByText("Exibindo 1 de 1 eventos.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Conceder gratuidade" }),
    ).toBeInTheDocument();
  });

  it("filters the loaded directory locally without another request", async () => {
    jest.mocked(global.fetch).mockImplementation(async (input) => {
      const url = String(input);

      if (url === "/api/billing/manual-grants/users") {
        return {
          ok: true,
          json: async () => usersPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    expect(await screen.findByText("Target User")).toBeInTheDocument();
    expect(screen.getByText("Other User")).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("Refinar resultados carregados"),
      "other",
    );

    expect(screen.queryByText("Target User")).not.toBeInTheDocument();
    expect(screen.getByText("Other User")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("searches the full directory remotely when requested", async () => {
    jest.mocked(global.fetch).mockImplementation(async (input) => {
      const url = String(input);

      if (url === "/api/billing/manual-grants/users") {
        return {
          ok: true,
          json: async () => usersPayload,
        } as Response;
      }

      if (url === "/api/billing/manual-grants/users?query=other") {
        return {
          ok: true,
          json: async () => ({
            users: [usersPayload.users[1]],
            nextPageToken: null,
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    expect(await screen.findByText("Target User")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar no diretório"), "other");
    await userEvent.click(
      screen.getByRole("button", { name: "Buscar diretório" }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/billing/manual-grants/users?query=other",
      );
    });

    expect(screen.queryByText("Target User")).not.toBeInTheDocument();
    expect(screen.getByText("Other User")).toBeInTheDocument();
    expect(
      screen.getByText('Exibindo 1 de 1 usuários carregados. Busca ativa: "other".'),
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
    await userEvent.clear(screen.getByLabelText("Observações internas"));
    await userEvent.type(
      screen.getByLabelText("Observações internas"),
      "Novo ciclo",
    );
    await userEvent.selectOptions(screen.getByLabelText("Duração"), "90");
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar edição" }),
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

  it("applies operational presets to the grant form", async () => {
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

    await userEvent.click(
      await screen.findByRole("button", { name: /Target User/i }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /7 dias de onboarding/i }),
    );

    expect(screen.getByLabelText("Tipo")).toHaveValue("courtesy");
    expect(screen.getByLabelText("Duração")).toHaveValue("7");
    expect(screen.getByLabelText("Motivo")).toHaveValue(
      "Extensão manual de onboarding por 7 dias.",
    );
    expect(screen.getByLabelText("Observações internas")).toHaveValue(
      "Concessão operacional curta para usuário em onboarding.",
    );
  });

  it("filters audit logs by action and operator", async () => {
    const payloadWithExtraAudit = {
      ...payload,
      auditLogs: [
        payload.auditLogs[0],
        {
          id: "audit-2",
          actorUserId: "admin-1",
          action: "billing.manual_grant_revoked",
          targetType: "manual_access_grant",
          targetId: "grant-1",
          metadata: {
            userId: "target-1",
            reason: "Encerramento operacional",
          },
          createdAt: "2026-03-24T12:00:00.000Z",
        },
      ],
    };

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
          json: async () => payloadWithExtraAudit,
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<BillingManualGrantsConsole />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Target User/i }),
    );

    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por ação"),
      "billing.manual_grant_revoked",
    );

    expect(screen.getByText("Exibindo 1 de 2 eventos.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Operador: Admin User - admin@example.com · Alvo: manual_access_grant",
      ),
    ).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por operador"),
      "owner-1",
    );

    expect(screen.getByText("Exibindo 0 de 2 eventos.")).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum evento corresponde aos filtros atuais."),
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
