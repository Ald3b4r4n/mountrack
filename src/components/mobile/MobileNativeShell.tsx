"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChartColumnBig,
  CreditCard,
  FileClock,
  Home,
  PencilLine,
  Pill,
  Plus,
  Salad,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  isMobileChromeRoute,
  resolveMobileNativeScreen,
  resolveActiveMobileNativeTab,
  type MobileNativeTabId,
} from "@/modules/mobile/native-shell";
import styles from "./MobileNativeShell.module.css";

function triggerTouchFeedback() {
  if (typeof window !== "undefined") {
    window.navigator.vibrate?.(8);
  }
}

interface QuickAction {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

interface TabItem {
  id: MobileNativeTabId;
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const TAB_ITEMS: TabItem[] = [
  { id: "home", href: "/", label: "Início", icon: Home },
  { id: "journey", href: "/analytics", label: "Jornada", icon: ChartColumnBig },
  { id: "nutrition", href: "/nutrition", label: "Nutrição", icon: Salad },
  { id: "account", href: "/subscription", label: "Conta", icon: CreditCard },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/log",
    label: "Novo registro",
    hint: "Dose, peso ou nota no mesmo fluxo.",
    icon: PencilLine,
  },
  {
    href: "/journal",
    label: "Diário",
    hint: "Revise relatos e observações da jornada.",
    icon: FileClock,
  },
  {
    href: "/goals",
    label: "Metas",
    hint: "Ajuste o alvo de peso e o ritmo semanal.",
    icon: Target,
  },
  {
    href: "/expenses",
    label: "Gastos",
    hint: "Veja quanto já foi investido no processo.",
    icon: Wallet,
  },
  {
    href: "/ampoules",
    label: "Ampolas",
    hint: "Controle ciclos, abertura e fechamento.",
    icon: Pill,
  },
];

export function MobileNativeShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPath, setSheetPath] = useState(pathname);

  const showChrome = useMemo(
    () => !loading && Boolean(user) && isMobileChromeRoute(pathname),
    [loading, pathname, user],
  );
  const activeTab = resolveActiveMobileNativeTab(pathname);
  const activeScreen = resolveMobileNativeScreen(pathname);
  const isSheetVisible = showChrome && sheetOpen && sheetPath === pathname;
  const showTopBar = Boolean(showChrome && activeScreen && !activeScreen.isPrimary);

  useEffect(() => {
    if (!isSheetVisible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetVisible]);

  useEffect(() => {
    if (!isSheetVisible) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSheetVisible]);

  return (
    <div className={showChrome ? styles.shell : undefined}>
      {showTopBar && activeScreen ? (
        <header className={styles.topBar}>
          <div className={styles.topBarFrame}>
            <button
              type="button"
              className={styles.backButton}
              aria-label={`Voltar para ${activeScreen.parentTitle}`}
              onClick={() => {
                triggerTouchFeedback();
                router.push(activeScreen.parentHref);
              }}
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
            </button>

            <div className={styles.topBarCopy}>
              <span className={styles.topBarEyebrow}>Navegação</span>
              <strong className={styles.topBarTitle}>{activeScreen.title}</strong>
            </div>
          </div>
        </header>
      ) : null}

      <div
        className={`${showChrome ? styles.content : ""} ${showTopBar ? styles.contentWithTopBar : ""}`.trim()}
      >
        {children}
      </div>

      {showChrome ? (
        <>
          <button
            type="button"
            className={`${styles.backdrop} ${isSheetVisible ? styles.backdropVisible : ""}`}
            aria-label="Fechar ações rápidas"
            onClick={() => {
              triggerTouchFeedback();
              setSheetOpen(false);
            }}
          />

          <section
            className={`${styles.sheet} ${isSheetVisible ? styles.sheetVisible : ""}`}
            aria-hidden={!isSheetVisible}
          >
            <div className={styles.sheetCard}>
              <div className={styles.sheetHandle} />

              <header className={styles.sheetHeader}>
                <div className={styles.sheetHeaderTop}>
                  <button
                    type="button"
                    className={styles.sheetBackButton}
                    aria-label="Voltar"
                    onClick={() => {
                      triggerTouchFeedback();
                      setSheetOpen(false);
                    }}
                  >
                    <ArrowLeft size={16} strokeWidth={2.3} />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    className={styles.sheetCloseButton}
                    aria-label="Fechar ações rápidas"
                    onClick={() => {
                      triggerTouchFeedback();
                      setSheetOpen(false);
                    }}
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                <span className={styles.sheetEyebrow}>Navegação rápida</span>
                <h2 className={styles.sheetTitle}>Acesse o que importa</h2>
                <p className={styles.sheetDescription}>
                  Abra as áreas mais usadas do app sem sair do fluxo principal.
                </p>
              </header>

              <div className={styles.actionsGrid}>
                {QUICK_ACTIONS.map(({ href, label, hint, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={styles.actionCard}
                    onClick={() => {
                      triggerTouchFeedback();
                      setSheetOpen(false);
                    }}
                  >
                    <span className={styles.actionIcon}>
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <strong className={styles.actionLabel}>{label}</strong>
                    <span className={styles.actionHint}>{hint}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <nav className={styles.tabBar} aria-label="Navegação mobile">
            <div className={styles.tabBarFrame}>
              {TAB_ITEMS.slice(0, 2).map(({ id, href, label, icon: Icon }) => {
                const isActive = activeTab === id;

                return (
                  <Link
                    key={id}
                    href={href}
                    className={`${styles.tabLink} ${isActive ? styles.tabActive : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={triggerTouchFeedback}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                    <span className={styles.tabLabel}>{label}</span>
                  </Link>
                );
              })}

              <div className={styles.fabSlot}>
                <button
                  type="button"
                  className={styles.fabButton}
                  aria-label={
                    isSheetVisible
                      ? "Fechar ações rápidas"
                      : "Abrir ações rápidas"
                  }
                  onClick={() => {
                    triggerTouchFeedback();
                    setSheetPath(pathname);
                    setSheetOpen((current) =>
                      sheetPath === pathname ? !current : true,
                    );
                  }}
                >
                  {isSheetVisible ? (
                    <X size={24} strokeWidth={2.4} />
                  ) : (
                    <Plus size={24} strokeWidth={2.4} />
                  )}
                </button>
              </div>

              {TAB_ITEMS.slice(2).map(({ id, href, label, icon: Icon }) => {
                const isActive = activeTab === id;

                return (
                  <Link
                    key={id}
                    href={href}
                    className={`${styles.tabLink} ${isActive ? styles.tabActive : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={triggerTouchFeedback}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                    <span className={styles.tabLabel}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
