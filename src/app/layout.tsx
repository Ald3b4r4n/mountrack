import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import { AppFooter } from "@/components/AppFooter";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";

function resolveMetadataBase() {
  try {
    return new URL(process.env.APP_BASE_URL ?? "https://mountrack.vercel.app");
  } catch {
    return new URL("https://mountrack.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "MounTrack | Progress Dashboard",
  description: "Acompanhe sua jornada com doses, peso, metas e nutricao.",
  applicationName: "MounTrack",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MounTrack",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#080E1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <PwaRegistrar />
          <PwaInstallPrompt />
          <PageTransition>
            {children}
            <AppFooter />
          </PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
