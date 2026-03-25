export type MobileNativeTabId = "home" | "journey" | "nutrition" | "account";

type MobileNativeRouteDefinition = {
  tab: MobileNativeTabId;
  route: string;
  title: string;
  primary?: boolean;
};

const MOBILE_NATIVE_ROUTE_GROUPS: Record<MobileNativeTabId, string[]> = {
  home: ["/", "/goals", "/expenses", "/ampoules", "/log"],
  journey: ["/analytics", "/history", "/journal", "/report"],
  nutrition: ["/nutrition"],
  account: ["/subscription", "/billing/grants"],
};

const MOBILE_NATIVE_ROUTE_DEFINITIONS: MobileNativeRouteDefinition[] = [
  { tab: "home", route: "/", title: "Início", primary: true },
  { tab: "home", route: "/goals", title: "Metas" },
  { tab: "home", route: "/expenses", title: "Gastos" },
  { tab: "home", route: "/ampoules", title: "Ampolas" },
  { tab: "home", route: "/log", title: "Novo registro" },
  { tab: "journey", route: "/analytics", title: "Jornada", primary: true },
  { tab: "journey", route: "/history", title: "Histórico" },
  { tab: "journey", route: "/journal", title: "Diário" },
  { tab: "journey", route: "/report", title: "Relatórios" },
  { tab: "nutrition", route: "/nutrition", title: "Nutrição", primary: true },
  { tab: "account", route: "/subscription", title: "Assinatura", primary: true },
  { tab: "account", route: "/billing/grants", title: "Gratuidades" },
];

function routeMatches(pathname: string, route: string) {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isMobileChromeRoute(pathname: string) {
  return Object.values(MOBILE_NATIVE_ROUTE_GROUPS).some((routes) =>
    routes.some((route) => routeMatches(pathname, route)),
  );
}

export function resolveActiveMobileNativeTab(
  pathname: string,
): MobileNativeTabId | null {
  const match = (Object.entries(MOBILE_NATIVE_ROUTE_GROUPS) as Array<
    [MobileNativeTabId, string[]]
  >).find(([, routes]) => routes.some((route) => routeMatches(pathname, route)));

  return match?.[0] ?? null;
}

export function resolveMobileNativePrimaryHref(tab: MobileNativeTabId): string {
  const primaryRoute = MOBILE_NATIVE_ROUTE_DEFINITIONS.find(
    (definition) => definition.tab === tab && definition.primary,
  );

  return primaryRoute?.route ?? "/";
}

export function resolveMobileNativeScreen(pathname: string): {
  title: string;
  tab: MobileNativeTabId | null;
  parentHref: string;
  parentTitle: string;
  isPrimary: boolean;
} | null {
  const matchingDefinition = MOBILE_NATIVE_ROUTE_DEFINITIONS.find((definition) =>
    routeMatches(pathname, definition.route),
  );

  if (!matchingDefinition) {
    const activeTab = resolveActiveMobileNativeTab(pathname);
    if (!activeTab) {
      return null;
    }

    return {
      title: "Voltar",
      tab: activeTab,
      parentHref: resolveMobileNativePrimaryHref(activeTab),
      parentTitle:
        MOBILE_NATIVE_ROUTE_DEFINITIONS.find(
          (definition) => definition.tab === activeTab && definition.primary,
        )?.title ?? "Início",
      isPrimary: pathname === resolveMobileNativePrimaryHref(activeTab),
    };
  }

  const parentDefinition = MOBILE_NATIVE_ROUTE_DEFINITIONS.find(
    (definition) => definition.tab === matchingDefinition.tab && definition.primary,
  );

  return {
    title: matchingDefinition.title,
    tab: matchingDefinition.tab,
    parentHref: resolveMobileNativePrimaryHref(matchingDefinition.tab),
    parentTitle: parentDefinition?.title ?? "Início",
    isPrimary: Boolean(matchingDefinition.primary),
  };
}

export const resolveActiveMobileNativeScreen = resolveMobileNativeScreen;
