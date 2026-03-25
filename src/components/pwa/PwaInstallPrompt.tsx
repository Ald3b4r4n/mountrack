"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./PwaInstallPrompt.module.css";

const DISMISS_STORAGE_KEY = "mountrack:pwa-install-dismissed-at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const TARGET_PATHS = new Set(["/", "/login"]);
const MOBILE_MEDIA_QUERY = "(max-width: 900px), (pointer: coarse)";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallMode = "prompt" | "ios" | "manual" | null;

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);
  const isWebkitSafari =
    /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(userAgent);

  return isIosDevice && isWebkitSafari;
}

function isCompactViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function canShowInstallPromptAgain() {
  const dismissedAt = window.localStorage.getItem(DISMISS_STORAGE_KEY);

  if (!dismissedAt) {
    return true;
  }

  const dismissedAtMs = Number(dismissedAt);
  return Number.isNaN(dismissedAtMs) || Date.now() - dismissedAtMs > DISMISS_TTL_MS;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!TARGET_PATHS.has(pathname)) {
      setMode(null);
      return;
    }

    if (isStandaloneMode()) {
      setInstalled(true);
      return;
    }

    if (!canShowInstallPromptAgain()) {
      setDismissed(true);
      return;
    }

    if (isIosSafari()) {
      setMode("ios");
      setShowSteps(true);
      return;
    }

    if (isCompactViewport()) {
      setMode("manual");
      return;
    }

    setMode(null);
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setMode("prompt");
      setDismissed(false);
      setShowSteps(false);
    };

    const handleInstalled = () => {
      window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      setInstalled(true);
      setDeferredPrompt(null);
      setMode(null);
      setDismissed(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [mounted]);

  const helperCopy = useMemo(() => {
    if (mode === "ios") {
      return {
        title: "Instale o MounTrack no iPhone",
        description:
          "Abra pela tela inicial para entrar mais rápido e usar o app com aparência nativa.",
        steps: [
          "Toque no botão Compartilhar do Safari.",
          "Escolha Adicionar à Tela de Início e confirme.",
        ],
      };
    }

    return {
      title: "Instale o MounTrack",
      description:
        "Se o navegador não mostrar o botão sozinho, abra o menu e toque em Instalar app ou Adicionar à tela inicial.",
      steps: [
        "Abra o menu do navegador nesta página.",
        "Toque em Instalar app ou Adicionar à tela inicial.",
      ],
    };
  }, [mode]);

  if (
    !mounted ||
    installed ||
    dismissed ||
    !TARGET_PATHS.has(pathname) ||
    !mode
  ) {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  };

  const openInstallPrompt = async () => {
    if (!deferredPrompt) {
      setShowSteps((current) => !current);
      return;
    }

    setPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);

      if (choice?.outcome !== "accepted") {
        setShowSteps(true);
      }
    } finally {
      setPrompting(false);
      setDeferredPrompt(null);
      setMode(isIosSafari() ? "ios" : isCompactViewport() ? "manual" : null);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-label="Instalação do app">
        <div className={styles.topRow}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>Instalar app</span>
            <h2 className={styles.title}>
              {mode === "prompt" ? "Leve o MounTrack para a tela inicial" : helperCopy.title}
            </h2>
            <p className={styles.description}>
              {mode === "prompt"
                ? "Abra o app com um toque, sem depender do navegador toda vez."
                : helperCopy.description}
            </p>
          </div>

          <button
            type="button"
            className={styles.dismissButton}
            onClick={dismiss}
            aria-label="Fechar sugestão de instalação"
          >
            ×
          </button>
        </div>

        {(showSteps || mode !== "prompt") && (
          <div className={styles.steps}>
            {helperCopy.steps.map((step, index) => (
              <div key={step} className={styles.step}>
                <span className={styles.stepIndex}>{index + 1}</span>
                <p className={styles.stepText}>{step}</p>
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn-primary ${styles.primaryButton}`}
            onClick={openInstallPrompt}
            disabled={prompting}
          >
            {mode === "prompt"
              ? prompting
                ? "Abrindo..."
                : "Instalar agora"
              : showSteps
                ? "Entendi"
                : "Ver passos"}
          </button>

          <button
            type="button"
            className={`btn-outline ${styles.secondaryButton}`}
            onClick={dismiss}
          >
            Agora não
          </button>
        </div>
      </section>
    </div>
  );
}
