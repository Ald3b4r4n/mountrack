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
    /** Flag que indica se o scanner.start() completou com sucesso */
    let scannerStarted = false;
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
              scannerStarted = false;
              if (active) {
                onClose();
              }
            });
          },
          () => undefined,
        );

        // Só marca como iniciado DEPOIS do start() completar sem erro
        scannerStarted = true;
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
      if (scanner && scannerStarted) {
        void scanner.stop().catch(() => undefined);
      }
      // clear() pode ser chamado mesmo sem start — limpa o DOM
      if (scanner) {
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
      className="fixed inset-0 bg-[#080e1a]/80 backdrop-blur-md z-50 grid place-items-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="glass-panel w-full max-w-lg p-5"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center gap-4 mb-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold">Leitor de código de barras</h3>
            <p id={descriptionId} className="text-[var(--text-secondary)] text-sm">
              Aponte a camera para o EAN, GTIN ou QR do alimento.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="btn-outline min-w-auto px-4 py-2.5"
          >
            Fechar
          </button>
        </div>

        <div
          id={containerId}
          className="min-h-[260px] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-glass)] bg-black/25"
        />

        <p className="mt-3 text-[var(--text-secondary)] text-sm">
          Formatos ativos: EAN-13, EAN-8, UPC, CODE-128 e QR Code.
        </p>

        {error ? (
          <p role="status" className="mt-2 text-red-300 text-sm">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
