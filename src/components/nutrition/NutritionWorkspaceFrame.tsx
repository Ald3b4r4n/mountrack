"use client";

import type { ReactNode } from "react";
import type { NutritionArea } from "@/components/nutrition/NutritionWorkspaceNav";

const WORKSPACE_META: Record<
  NutritionArea,
  {
    badge: string;
    title: string;
    description: string;
    status?: string;
  }
> = {
  none: {
    badge: "Resumo",
    title: "Painel nutricional",
    description:
      "Escolha uma area para iniciar seu fluxo de registro, busca ou planejamento.",
  },
  today: {
    badge: "Hoje",
    title: "Diário de hoje",
    description:
      "Acompanhe suas refeições, água e histórico recente em um único painel.",
    status: "Resumo ativo",
  },
  search: {
    badge: "Buscar",
    title: "Buscar alimentos",
    description:
      "Pesquise no catálogo, confira os detalhes e registre cada item no diário.",
  },
  planning: {
    badge: "Planejar",
    title: "Planejamento nutricional",
    description:
      "Defina suas metas e monte um cardápio diário alinhado ao seu objetivo.",
    status: "Planejamento",
  },
};

interface NutritionWorkspaceFrameProps {
  activeArea: NutritionArea;
  children: ReactNode;
}

export function NutritionWorkspaceFrame({
  activeArea,
  children,
}: NutritionWorkspaceFrameProps) {
  const meta = WORKSPACE_META[activeArea];

  return (
    <section className="glass-panel static-panel overflow-hidden rounded-[1.55rem] border border-[#34d399]/12 bg-[linear-gradient(180deg,rgba(5,17,33,0.72)_0%,rgba(3,11,22,0.92)_100%)] p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/6 pb-4">
        <div className="max-w-[46rem]">
          <span className="badge badge-success mb-2">{meta.badge}</span>
          <h2 className="font-['Outfit',sans-serif] text-[1.42rem] leading-tight text-[var(--text-primary)]">
            {meta.title}
          </h2>
          <p className="mt-1 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
            {meta.description}
          </p>
        </div>
        {meta.status ? (
          <span className="rounded-full border border-[#34d399]/18 bg-[#071729]/72 px-3 py-1.5 text-[0.8rem] text-[var(--text-secondary)]">
            {meta.status}
          </span>
        ) : null}
      </div>

      <div key={activeArea} className="anim-enter min-h-[34rem]">
        {children}
      </div>
    </section>
  );
}
