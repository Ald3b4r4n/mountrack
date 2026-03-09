"use client";

import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/nutrition")) {
    return null;
  }

  return (
    <footer className="mt-12 flex justify-center px-4 pb-6">
      <div
        className="glass-panel inline-flex items-center gap-2 rounded-full px-8 py-4"
        style={{
          background: "rgba(52, 211, 153, 0.05)",
          borderColor: "rgba(52, 211, 153, 0.15)",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Desenvolvido por</span>
        <a
          href="https://antoniorafael.com.br"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--accent-primary)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "color 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12h4l3-9 5 18 3-9h5" />
          </svg>
          A&R Software Development
        </a>
      </div>
    </footer>
  );
}
