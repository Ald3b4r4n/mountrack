import type { IntroTourStepConfig } from "@/components/tours/IntroTourButton";

export const homeDashboardTourSteps: IntroTourStepConfig[] = [
  {
    selector: "[data-tour-id='dashboard-header']",
    title: "Seu painel principal",
    intro:
      "Aqui começa a rotina do app: visão geral, atalhos e leitura rápida do que está acontecendo na sua jornada.",
  },
  {
    selector: "[data-tour-id='dashboard-new-log']",
    title: "Novo registro",
    intro:
      "Use este botão para lançar peso, dose e anotações sem procurar a tela certa primeiro.",
  },
  {
    selector: "[data-tour-id='dashboard-navigation']",
    title: "Atalhos das funcionalidades",
    intro:
      "Esses atalhos levam direto para relatórios, metas, histórico, assinatura, diário, gastos, nutrição e ampolas.",
  },
  {
    selector: "[data-tour-id='dashboard-progress']",
    title: "Evolução do peso",
    intro:
      "Este bloco mostra a curva recente do peso para você enxergar tendência, ritmo e consistência.",
  },
  {
    selector: "[data-tour-id='dashboard-next-dose']",
    title: "Próxima dose",
    intro:
      "Aqui você acompanha a janela da próxima aplicação e pode criar o lembrete da dose seguinte.",
  },
  {
    selector: "[data-tour-id='dashboard-current-dose']",
    title: "Dose em uso",
    intro:
      "Este card mostra a dose atual e ajuda a manter contexto sem abrir o histórico toda vez.",
  },
  {
    selector: "[data-tour-id='dashboard-current-ampoule']",
    title: "Ampola atual",
    intro:
      "Se você acompanha aplicações por ampola, este resumo mostra o consumo atual e evita perder a contagem.",
  },
  {
    selector: "[data-tour-id='dashboard-goal']",
    title: "Meta e progresso",
    intro:
      "Neste bloco você vê a distância até a meta e quando houver base suficiente, uma estimativa do ritmo atual.",
  },
];
