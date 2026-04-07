import Link from "next/link";
import { Mail, MessageCircle, Phone, Globe, ArrowLeft } from "lucide-react";
import { USER_SUPPORT_CONTACT } from "@/modules/support-contact";

export default function SuportePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[0.84rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        <div className="glass-panel rounded-[1.5rem] border border-white/10 bg-[#050f1d] p-6 shadow-2xl">
          <h1 className="mb-1 text-[1.2rem] font-black tracking-tight">Suporte</h1>
          <p className="mb-6 text-[0.88rem] text-[var(--text-secondary)]">
            Entre em contato conosco por qualquer canal abaixo.
          </p>

          {/* WhatsApp — primary CTA */}
          <a
            href={USER_SUPPORT_CONTACT.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="btn-primary mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[0.9rem] font-bold"
          >
            <MessageCircle size={18} />
            WhatsApp
          </a>

          {/* Secondary links */}
          <div className="grid gap-3">
            <a
              href={`mailto:${USER_SUPPORT_CONTACT.email}`}
              aria-label="Email"
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-[0.88rem] transition-colors hover:bg-white/8"
            >
              <Mail size={16} className="shrink-0 text-[var(--text-muted)]" />
              <span>{USER_SUPPORT_CONTACT.email}</span>
            </a>

            <a
              href={USER_SUPPORT_CONTACT.phoneHref}
              aria-label="Telefone"
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-[0.88rem] transition-colors hover:bg-white/8"
            >
              <Phone size={16} className="shrink-0 text-[var(--text-muted)]" />
              <span>{USER_SUPPORT_CONTACT.phoneDisplay}</span>
            </a>

            <a
              href={USER_SUPPORT_CONTACT.websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={USER_SUPPORT_CONTACT.websiteLabel}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-[0.88rem] transition-colors hover:bg-white/8"
            >
              <Globe size={16} className="shrink-0 text-[var(--text-muted)]" />
              <span>{USER_SUPPORT_CONTACT.websiteLabel}</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
