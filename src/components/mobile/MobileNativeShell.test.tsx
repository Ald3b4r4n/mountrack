import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNativeShell } from "@/components/mobile/MobileNativeShell";
import { useAuth } from "@/contexts/AuthContext";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const { usePathname, useRouter } = jest.requireMock("next/navigation") as {
  usePathname: jest.Mock;
  useRouter: jest.Mock;
};

const useAuthMock = jest.mocked(useAuth);

describe("MobileNativeShell", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usePathname.mockReturnValue("/");
    useRouter.mockReturnValue({ push });
    useAuthMock.mockReturnValue({
      user: { uid: "user-1" },
      loading: false,
      sessionReady: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    } as never);
  });

  it("renders bottom navigation for authenticated app routes", () => {
    render(
      <MobileNativeShell>
        <div>conteudo do app</div>
      </MobileNativeShell>,
    );

    expect(
      screen.getByRole("navigation", { name: /Navega/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /In/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: /Voltar para/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the quick actions sheet", async () => {
    const user = userEvent.setup();

    render(
      <MobileNativeShell>
        <div>conteudo do app</div>
      </MobileNativeShell>,
    );

    await user.click(
      screen.getByRole("button", { name: /Abrir a/i }),
    );

    expect(
      screen.getByRole("heading", { name: /Acesse o que importa/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Abra as áreas mais usadas do app sem sair do fluxo principal/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Novo registro/i })).toHaveAttribute(
      "href",
      "/log",
    );
    expect(screen.getByRole("link", { name: /Metas/i })).toHaveAttribute(
      "href",
      "/goals",
    );
    expect(
      screen.getByRole("button", { name: "Voltar" }),
    ).toBeInTheDocument();
  });

  it("closes the quick actions sheet through the back button", async () => {
    const user = userEvent.setup();

    render(
      <MobileNativeShell>
        <div>conteudo do app</div>
      </MobileNativeShell>,
    );

    await user.click(
      screen.getByRole("button", { name: /Abrir a/i }),
    );

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(
      screen.queryByRole("heading", { name: /Acesse o que importa/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a back button on secondary mobile routes", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/expenses");

    render(
      <MobileNativeShell>
        <div>conteudo secundario</div>
      </MobileNativeShell>,
    );

    const backButton = screen.getByRole("button", {
      name: /Voltar para/i,
    });

    await user.click(backButton);

    expect(push).toHaveBeenCalledWith("/");
  });

  it("does not render navigation on public routes", () => {
    usePathname.mockReturnValue("/login");

    render(
      <MobileNativeShell>
        <div>conteudo publico</div>
      </MobileNativeShell>,
    );

    expect(
      screen.queryByRole("navigation", { name: /Navega/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render mobile chrome on the subscribe landing page", () => {
    usePathname.mockReturnValue("/subscribe");

    render(
      <MobileNativeShell>
        <div>landing da assinatura</div>
      </MobileNativeShell>,
    );

    expect(
      screen.queryByRole("navigation", { name: /Navega/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Voltar para/i }),
    ).not.toBeInTheDocument();
  });
});
