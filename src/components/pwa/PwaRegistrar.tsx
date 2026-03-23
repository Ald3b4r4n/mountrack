"use client";

import { useEffect } from "react";

const LOCALHOSTS = new Set(["localhost", "127.0.0.1"]);

function canRegisterServiceWorker() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return window.isSecureContext || LOCALHOSTS.has(window.location.hostname);
}

export function PwaRegistrar() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        void registration.update();
      } catch (error) {
        console.error("Falha ao registrar o service worker do MounTrack.", error);
      }
    };

    void register();
  }, []);

  return null;
}
