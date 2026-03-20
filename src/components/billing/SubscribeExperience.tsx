"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { buildLoginNavigationUrl } from "@/modules/billing/auth/login-navigation";
import styles from "./SubscribeExperience.module.css";

interface SubscribeExperienceProps {
  planCode: string;
  amountCents: number;
  monthlyPrice: string;
  trialDays: number;
  mercadoPagoPublicKey: string;
  sandboxPayerEmail?: string;
}

const slides = [
  {
    id: "overview",
    title: "Plano",
    copy: "Veja o que permanece ativo na sua conta.",
  },
  {
    id: "trial",
    title: "Teste",
    copy: "Entenda quando o teste comeca e quando a assinatura entra.",
  },
  {
    id: "checkout",
    title: "Pagamento",
    copy: "Conclua a assinatura quando decidir continuar.",
  },
] as const;

export function SubscribeExperience({
  planCode,
  amountCents,
  monthlyPrice,
  trialDays,
  mercadoPagoPublicKey,
  sandboxPayerEmail,
}: SubscribeExperienceProps) {
  const { user, signOut } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === slides.length - 1;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  function goToStep(step: number) {
    setActiveStep(Math.max(0, Math.min(step, slides.length - 1)));
  }

  async function handleSwitchAccount() {
    if (typeof window === "undefined") {
      return;
    }

    const target = buildLoginNavigationUrl(window.location, "/subscribe");
    setIsSwitchingAccount(true);

    try {
      if (user) {
        await signOut();
      }

      window.location.assign(target);
    } catch (switchError) {
      console.error(
        "Failed to switch account from subscribe flow",
        switchError,
      );
      setIsSwitchingAccount(false);
    }
  }

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 900px)").matches
    ) {
      return;
    }

    frameRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeStep]);

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>MounTrack Pro</span>
        <div className={styles.priceTag}>
          <span className={styles.priceLabel}>Plano mensal</span>
          <strong className={styles.priceValue}>{monthlyPrice}</strong>
        </div>
      </header>

      <nav className={styles.steps} aria-label="Etapas da assinatura">
        {slides.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`${styles.stepButton} ${index === activeStep ? styles.stepButtonActive : ""}`}
            onClick={() => goToStep(index)}
            aria-pressed={index === activeStep}
          >
            <span className={styles.stepIndex}>{index + 1}</span>
            <span className={styles.stepTitle}>{step.title}</span>
            <span className={styles.stepCopy}>{step.copy}</span>
          </button>
        ))}
      </nav>

      <div
        ref={frameRef}
        className={`glass-panel static-panel ${styles.frame}`}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(-${activeStep * 100}%)` }}
        >
          <section className={styles.slide} aria-hidden={activeStep !== 0}>
            <div className={styles.slideCard}>
              <div className={styles.slideHead}>
                <span className={styles.slideKicker}>Continue sua rotina</span>
                <h1 className={styles.slideTitle}>
                  Seu historico continua com voce.
                </h1>
                <p className={styles.slideText}>
                  O MounTrack Pro mantem peso, doses, metas, nutricao e
                  acompanhamento na mesma conta, sem quebrar a sua rotina.
                </p>
              </div>

              <div className={styles.metrics}>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Teste gratis</span>
                  <strong className={styles.metricValue}>
                    {trialDays} dias
                  </strong>
                  <span className={styles.metricHelper}>
                    Use o app completo antes de decidir se quer continuar.
                  </span>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Valor mensal</span>
                  <strong className={styles.metricValue}>{monthlyPrice}</strong>
                  <span className={styles.metricHelper}>
                    Um unico plano para manter toda a experiencia liberada.
                  </span>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Pagamento</span>
                  <strong className={styles.metricValue}>Mercado Pago</strong>
                  <span className={styles.metricHelper}>
                    Pagamento seguro para ativar o acesso sem perder o que voce
                    ja registrou.
                  </span>
                </article>
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.infoPanel}>
                  <h2>O que continua liberado.</h2>
                  <p>
                    A assinatura mantem a experiencia principal do app na mesma
                    conta, sem separar o que voce acompanha no dia a dia.
                  </p>

                  <ul className={styles.list}>
                    <li className={styles.listItem}>
                      <span className={styles.listDot} aria-hidden="true" />
                      <div>
                        <strong className={styles.listTitle}>
                          Historico intacto
                        </strong>
                        <p className={styles.listText}>
                          Peso, doses, metas e nutricao continuam no mesmo
                          historico.
                        </p>
                      </div>
                    </li>
                    <li className={styles.listItem}>
                      <span className={styles.listDot} aria-hidden="true" />
                      <div>
                        <strong className={styles.listTitle}>
                          Acesso completo
                        </strong>
                        <p className={styles.listText}>
                          Diario, dashboards, metas e relatorios seguem
                          disponiveis na mesma conta.
                        </p>
                      </div>
                    </li>
                    <li className={styles.listItem}>
                      <span className={styles.listDot} aria-hidden="true" />
                      <div>
                        <strong className={styles.listTitle}>
                          Assinatura sem susto
                        </strong>
                        <p className={styles.listText}>
                          Quando o pagamento confirma, o acesso continua sem
                          perder o que ja estava salvo.
                        </p>
                      </div>
                    </li>
                  </ul>
                </article>

                <aside className={styles.sidePanel}>
                  <h2>Quando vale continuar</h2>
                  <p>
                    Se o MounTrack ja entrou na sua rotina, a assinatura
                    mantem tudo no mesmo lugar: historico, metas, doses e
                    nutricao, sem recomecar do zero.
                  </p>
                </aside>
              </div>
            </div>
          </section>

          <section className={styles.slide} aria-hidden={activeStep !== 1}>
            <div className={styles.slideCard}>
              <div className={styles.slideHead}>
                <span className={styles.slideKicker}>Primeiro contato</span>
                <h2 className={styles.slideTitle}>
                  Os{" "}
                  <span className={styles.highlight}>
                    {trialDays} dias gratis
                  </span>{" "}
                  comecam no primeiro acesso.
                </h2>
                <p className={styles.slideText}>
                  Quem chega agora entra, usa o app completo por {trialDays}{" "}
                  dias e so depois escolhe se quer continuar.
                </p>
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.infoPanel}>
                  <h2>Como funciona na pratica.</h2>
                  <ol className={styles.timeline}>
                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>1</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Primeiro acesso
                        </strong>
                        <p className={styles.timelineText}>
                          Assim que a conta entra no app, o periodo gratis
                          comeca.
                        </p>
                      </div>
                    </li>
                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>2</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Uso completo por {trialDays} dias
                        </strong>
                        <p className={styles.timelineText}>
                          Durante esse periodo, as principais areas do MounTrack
                          ficam liberadas.
                        </p>
                      </div>
                    </li>
                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>3</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Aviso antes do fim
                        </strong>
                        <p className={styles.timelineText}>
                          Antes do teste terminar, o app avisa que a assinatura
                          sera necessaria para continuar.
                        </p>
                      </div>
                    </li>
                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>4</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Assinatura so depois do prazo
                        </strong>
                        <p className={styles.timelineText}>
                          A tela de assinatura entra quando o periodo gratis
                          termina ou quando o pagamento ainda nao foi feito.
                        </p>
                      </div>
                    </li>
                  </ol>
                </article>

                <aside className={styles.sidePanel}>
                  <h2>Antes do fim do teste</h2>
                  <p>
                    O app avisa com antecedencia para voce decidir com calma.
                    Se fizer sentido continuar, basta concluir a assinatura
                    antes do prazo terminar.
                  </p>
                  <div className={styles.noteBand}>
                    Primeiro voce usa o app completo. A cobranca so entra
                    depois do periodo gratis.
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className={styles.slide} aria-hidden={activeStep !== 2}>
            <div className={styles.slideCard}>
              <div className={styles.slideHead}>
                <span className={styles.slideKicker}>Continue sem pausa</span>
                <h2 className={styles.slideTitle}>
                  Assine sem sair da sua rotina.
                </h2>
                <p className={styles.slideText}>
                  Quando decidir continuar, conclua a assinatura aqui e siga do
                  mesmo ponto em que parou.
                </p>
              </div>

              <div className={styles.checkoutPanel}>
                <h2>MounTrack Pro Mensal</h2>
                <p>{monthlyPrice} por mes para manter sua conta liberada.</p>

                <ul className={styles.checkoutSummary}>
                  <li>Seu historico continua salvo na mesma conta.</li>
                  <li>O acesso volta assim que o pagamento e confirmado.</li>
                  <li>Se voce ja pagou, basta atualizar o acesso.</li>
                </ul>
              </div>

              <SubscribeCheckoutButton
                planCode={planCode}
                amountCents={amountCents}
                mercadoPagoPublicKey={mercadoPagoPublicKey}
                sandboxPayerEmail={sandboxPayerEmail}
              />

              <div className={styles.utilityRow}>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => goToStep(1)}
                >
                  Voltar
                </button>
                <Link href="/" className={styles.textLink}>
                  Ja paguei
                </Link>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={handleSwitchAccount}
                  disabled={isSwitchingAccount}
                >
                  {isSwitchingAccount ? "Saindo..." : "Trocar de conta"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlLeft}>
          {!isFirstStep ? (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => goToStep(activeStep - 1)}
            >
              Voltar
            </button>
          ) : null}
        </div>

        <span className={styles.progressText}>
          Etapa {activeStep + 1} de {slides.length}
        </span>

        <div className={styles.controlRight}>
          {!isLastStep ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => goToStep(activeStep + 1)}
            >
              {activeStep === 0 ? "Ver como funciona" : "Ir para pagamento"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
