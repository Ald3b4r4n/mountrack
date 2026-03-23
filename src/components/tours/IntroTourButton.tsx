"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface IntroTourStepConfig {
  selector: string;
  title: string;
  intro: string;
  position?: "top" | "right" | "bottom" | "left";
}

interface IntroTourButtonProps {
  tourId: string;
  label?: string;
  steps: IntroTourStepConfig[];
  autoStart?: boolean;
  className?: string;
}

const AUTO_START_DELAY_MS = 600;

interface IntroTourInstance {
  setOptions(options: Record<string, unknown>): void;
  oncomplete(handler: () => void): void;
  onexit(handler: () => void): void;
  start(): void;
}

function getStorageKey(tourId: string): string {
  return `mountrack-tour:${tourId}:seen`;
}

function resolveSteps(steps: IntroTourStepConfig[]) {
  if (typeof document === "undefined") {
    return [];
  }

  return steps.flatMap((step) => {
    const element = document.querySelector(step.selector);
    if (!element) {
      return [];
    }

    return [
      {
        element,
        title: step.title,
        intro: step.intro,
        position: step.position ?? "bottom",
      },
    ];
  });
}

export function IntroTourButton({
  tourId,
  label = "Conhecer o app",
  steps,
  autoStart = false,
  className = "btn-outline",
}: IntroTourButtonProps) {
  const hasAutoStartedRef = useRef(false);

  const startTour = useCallback(
    async (persistSeen = false) => {
      const resolvedSteps = resolveSteps(steps);
      if (!resolvedSteps.length) {
        return;
      }

      const { default: introJs } = await import("intro.js");
      const tour = introJs() as IntroTourInstance;
      const markAsSeen = () => {
        if (!persistSeen || typeof window === "undefined") {
          return;
        }

        window.localStorage.setItem(getStorageKey(tourId), "1");
      };

      tour.setOptions({
        steps: resolvedSteps,
        showProgress: true,
        showBullets: false,
        scrollToElement: true,
        scrollTo: "element",
        scrollPadding: 96,
        nextLabel: "Próximo",
        prevLabel: "Voltar",
        doneLabel: "Fechar",
        skipLabel: "Pular",
        exitOnOverlayClick: true,
      });
      tour.oncomplete(markAsSeen);
      tour.onexit(markAsSeen);
      tour.start();
    },
    [steps, tourId],
  );

  useEffect(() => {
    if (
      !autoStart ||
      hasAutoStartedRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    if (window.localStorage.getItem(getStorageKey(tourId))) {
      return;
    }

    hasAutoStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      void startTour(true);
    }, AUTO_START_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoStart, startTour, tourId]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void startTour(false);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      }}
    >
      <Sparkles size={16} />
      {label}
    </button>
  );
}
