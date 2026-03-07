"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

function toScannerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/notallowed|permission/i.test(message)) {
    return "Permissao da camera negada. Libere o acesso ou use a busca manual por codigo de barras.";
  }

  if (/notfound|device|camera/i.test(message)) {
    return "Nenhuma camera compativel foi encontrada neste dispositivo.";
  }

  return "Nao foi possivel acessar a camera. Use a busca manual por codigo de barras.";
}

export function BarcodeScannerDialog({
  open,
  onClose,
  onDetected,
}: BarcodeScannerDialogProps) {
  const containerId = "nutrition-barcode-scanner";
  const titleId = useId();
  const descriptionId = useId();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    let hasDetected = false;
    setError(null);

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!active) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        const scannerConfig = {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.6,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        };

        await scanner.start(
          { facingMode: "environment" },
          scannerConfig as Parameters<Html5Qrcode["start"]>[1],
          (decodedText) => {
            if (!active || hasDetected) {
              return;
            }

            hasDetected = true;
            onDetected(decodedText);
            void scanner.stop().catch(() => undefined).finally(() => {
              if (active) {
                onClose();
              }
            });
          },
          () => undefined,
        );
      } catch (scannerError) {
        if (active) {
          setError(toScannerErrorMessage(scannerError));
        }
      }
    }

    void startScanner();

    return () => {
      active = false;
      const scanner = scannerRef.current;
      if (scanner) {
        void scanner.stop().catch(() => undefined);
        try {
          scanner.clear();
        } catch {
          // noop
        }
      }
      scannerRef.current = null;
      setError(null);
    };
  }, [containerId, onClose, onDetected, open]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current;
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 14, 26, 0.82)",
        backdropFilter: "blur(14px)",
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel"
        tabIndex={-1}
        style={{ width: "100%", maxWidth: "32rem", padding: "1.25rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <h3 id={titleId} style={{ fontSize: "1.1rem", fontWeight: 600 }}>Escanear codigo de barras</h3>
            <p id={descriptionId} style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Aponte a camera para o EAN, GTIN ou QR do alimento.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="btn-outline"
            style={{ minWidth: "auto", padding: "0.65rem 1rem" }}
          >
            Fechar
          </button>
        </div>

        <div
          id={containerId}
          style={{
            minHeight: "260px",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--border-glass)",
            background: "rgba(0,0,0,0.25)",
          }}
        />

        <p style={{ marginTop: "0.75rem", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
          Formatos ativos: EAN-13, EAN-8, UPC, CODE-128 e QR Code.
        </p>

        {error ? (
          <p role="status" style={{ marginTop: "0.5rem", color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}
