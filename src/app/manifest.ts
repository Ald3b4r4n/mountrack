import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MounTrack",
    short_name: "MounTrack",
    description:
      "Acompanhe peso, doses, metas, nutricao e assinatura em uma experiencia mobile-first pronta para instalacao.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080E1A",
    theme_color: "#080E1A",
    lang: "pt-BR",
    categories: ["health", "lifestyle", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Novo registro",
        short_name: "Registrar",
        description: "Abra rapidamente a tela para registrar peso, dose e notas.",
        url: "/log",
      },
      {
        name: "Assinatura",
        short_name: "Plano",
        description: "Consulte status da assinatura, ciclo atual e cancelamento.",
        url: "/subscription",
      },
      {
        name: "Diario",
        short_name: "Diario",
        description: "Acesse o diario da jornada e acompanhe registros recentes.",
        url: "/journal",
      },
    ],
  };
}
