"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SubscribeCheckoutButton } from "@/components/billing/SubscribeCheckoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { buildLoginNavigationUrl } from "@/modules/billing/auth/login-navigation";
import {
  buildSubscribePath,
  resolveSubscribeEntry,
  resolveSubscribeStep,
  shouldStayOnSubscribe,
} from "@/modules/billing/subscribe-navigation";
import styles from "./SubscribeExperience.module.css";

interface SubscribeExperienceProps {
  planCode: string;
  amountCents: number;
  monthlyPrice: string;
  trialDays: number;
  mercadoPagoPublicKey: string;
  sandboxPayerEmail?: string;
}

interface BillingAccessPayload {
  accessAllowed?: boolean;
}

const slides = [
  {
    id: "overview",
    title: "Plano",
    copy: "Entenda o que permanece disponível na sua conta.",
  },
  {
    id: "trial",
    title: "Teste",
    copy: "Veja quando o teste começa e quando a assinatura entra em vigor.",
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
  const { user, loading, sessionReady, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscribeEntry = resolveSubscribeEntry(searchParams.get("entry"));
  const keepUserOnSubscribe = shouldStayOnSubscribe(subscribeEntry);
  const [activeStep, setActiveStep] = useState(
    resolveSubscribeStep(subscribeEntry),
  );
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === slides.length - 1;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);
  const hasAuthenticatedUser = Boolean(user);
  const entryButtonLabel = hasAuthenticatedUser ? "Abrir o app" : "Fazer login";

  const accessStatusCopy = useMemo(() => {
    if (loading || (hasAuthenticatedUser && !sessionReady)) {
      return "Preparando o acesso da sua conta.";
    }

    if (isCheckingAccess) {
      return "Conferindo o status da sua conta.";
    }

    if (hasAuthenticatedUser) {
      return "Se a sua conta estiver com teste ativo ou assinatura vigente, o acesso será retomado automaticamente.";
    }

    return "Se você já usa o MounTrack, faça login para retomar o acompanhamento com a mesma conta e o mesmo histórico.";
  }, [hasAuthenticatedUser, isCheckingAccess, loading, sessionReady]);

  function goToStep(step: number) {
    setActiveStep(Math.max(0, Math.min(step, slides.length - 1)));
  }

  function navigateToLogin() {
    if (typeof window === "undefined") {
      router.push(`/login?next=${encodeURIComponent(buildSubscribePath())}`);
      return;
    }

    window.location.assign(
      buildLoginNavigationUrl(window.location, buildSubscribePath()),
    );
  }

  async function handleExistingCustomerEntry() {
    if (hasAuthenticatedUser) {
      router.push("/");
      return;
    }

    navigateToLogin();
  }

  async function handleSwitchAccount() {
    if (typeof window === "undefined") {
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const target = buildLoginNavigationUrl(window.location, currentPath);
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
    setActiveStep(resolveSubscribeStep(subscribeEntry));
  }, [subscribeEntry]);

  useEffect(() => {
    if (loading || (user && !sessionReady)) {
      return;
    }

    if (!user) {
      setIsCheckingAccess(false);
      setAccessResolved(false);
      return;
    }

    let cancelled = false;

    async function resolveExistingAccess() {
      setIsCheckingAccess(true);

      try {
        const response = await fetch("/api/billing/access", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const payload = (await response
          .json()
          .catch(() => null)) as BillingAccessPayload | null;

        if (cancelled) {
          return;
        }

        if (
          response.status === 200 &&
          payload?.accessAllowed === true &&
          !keepUserOnSubscribe
        ) {
          router.replace("/");
          return;
        }

        setAccessResolved(true);
      } catch (accessError) {
        console.error("Failed to resolve subscribe access state", accessError);
        if (!cancelled) {
          setAccessResolved(true);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAccess(false);
        }
      }
    }

    void resolveExistingAccess();

    return () => {
      cancelled = true;
    };
  }, [keepUserOnSubscribe, loading, router, sessionReady, user]);

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
        <div className={styles.headerIntro}>
          <Link href="/" className={styles.backLink}>
            Voltar
          </Link>
          <span className={styles.eyebrow}>MounTrack Pro</span>
        </div>

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
                  Seu histórico continua com você.
                </h1>
                <p className={styles.slideText}>
                  O MounTrack Pro mantém peso, doses, metas, nutrição e
                  acompanhamento na mesma conta, sem quebrar a sua rotina.
                </p>
              </div>

              <div className={styles.metrics}>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Teste grátis</span>
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
                    Um único plano para manter toda a experiência liberada.
                  </span>
                </article>

                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Pagamento</span>
                  <strong className={styles.metricValue}>Mercado Pago</strong>
                  <span className={styles.metricHelper}>
                    Pagamento seguro para ativar o acesso sem perder o que você
                    já registrou.
                  </span>
                </article>
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.infoPanel}>
                  <div className={styles.existingCustomerCard}>
                    <span className={styles.existingCustomerEyebrow}>
                      Cliente existente
                    </span>
                    <h2 className={styles.existingCustomerTitle}>
                      Acesse a sua conta.
                    </h2>
                    <p className={styles.existingCustomerText}>
                      {accessStatusCopy}
                    </p>
                    <div className={styles.existingCustomerActions}>
                      <button
                        type="button"
                        className={styles.existingCustomerButton}
                        onClick={handleExistingCustomerEntry}
                        disabled={
                          loading || isCheckingAccess || isSwitchingAccount
                        }
                      >
                        {loading || (hasAuthenticatedUser && !sessionReady)
                          ? "Preparando acesso..."
                          : isCheckingAccess
                            ? "Conferindo conta..."
                            : entryButtonLabel}
                      </button>
                      {hasAuthenticatedUser && accessResolved ? (
                        <button
                          type="button"
                          className={styles.existingCustomerLink}
                          onClick={handleSwitchAccount}
                          disabled={isSwitchingAccount}
                        >
                          {isSwitchingAccount
                            ? "Trocando conta..."
                            : "Trocar conta"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <h2>O que permanece disponível</h2>
                  <p>
                    A assinatura mantém a experiência principal do app na mesma
                    conta, sem separar o que você acompanha no dia a dia.
                  </p>

                  <ul className={styles.list}>
                    <li className={styles.listItem}>
                      <span className={styles.listDot} aria-hidden="true" />
                      <div>
                        <strong className={styles.listTitle}>
                          Histórico intacto
                        </strong>
                        <p className={styles.listText}>
                          Peso, doses, metas e nutrição continuam no mesmo
                          histórico.
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
                          Diário, dashboards, metas e relatórios seguem
                          disponíveis na mesma conta.
                        </p>
                      </div>
                    </li>

                    <li className={styles.listItem}>
                      <span className={styles.listDot} aria-hidden="true" />
                      <div>
                        <strong className={styles.listTitle}>
                          Continuidade no mesmo plano
                        </strong>
                        <p className={styles.listText}>
                          Quando o pagamento for confirmado, o acesso continua
                          sem perder o que já estava salvo.
                        </p>
                      </div>
                    </li>
                  </ul>
                </article>

                <aside className={styles.sidePanel}>
                  <h2>Quando a assinatura faz sentido</h2>
                  <p>
                    Se o MounTrack já entrou na sua rotina, a assinatura mantém
                    tudo no mesmo lugar: histórico, metas, doses e nutrição, sem
                    recomeçar do zero.
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
                    {trialDays} dias grátis
                  </span>{" "}
                  começam no primeiro acesso.
                </h2>
                <p className={styles.slideText}>
                  Quem chega agora entra, usa o app completo por {trialDays}{" "}
                  dias e só depois escolhe se quer continuar.
                </p>
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.infoPanel}>
                  <h2>Como funciona na prática</h2>
                  <ol className={styles.timeline}>
                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>1</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Primeiro acesso
                        </strong>
                        <p className={styles.timelineText}>
                          Assim que a conta entra no app, o período grátis
                          começa.
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
                          Durante esse período, as principais áreas do MounTrack
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
                          será necessária para continuar.
                        </p>
                      </div>
                    </li>

                    <li className={styles.timelineItem}>
                      <span className={styles.timelineNumber}>4</span>
                      <div>
                        <strong className={styles.timelineTitle}>
                          Assinatura só depois do prazo
                        </strong>
                        <p className={styles.timelineText}>
                          A tela de assinatura entra quando o período grátis
                          termina ou quando o pagamento ainda não foi feito.
                        </p>
                      </div>
                    </li>
                  </ol>
                </article>

                <aside className={styles.sidePanel}>
                  <h2>Antes do fim do teste</h2>
                  <p>
                    O app avisa com antecedência para você decidir com calma. Se
                    fizer sentido continuar, basta concluir a assinatura antes
                    do prazo terminar.
                  </p>
                  <div className={styles.noteBand}>
                    Primeiro você usa o app completo. A cobrança só entra depois
                    do período grátis.
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
                  Quando decidir continuar, abra o checkout do Mercado Pago e
                  siga do mesmo ponto em que parou.
                </p>
              </div>

              <div className={styles.checkoutPanel}>
                <h2>MounTrack Pro Mensal</h2>
                <p>{monthlyPrice} por mês para manter sua conta liberada.</p>

                <ul className={styles.checkoutSummary}>
                  <li>Seu histórico continua salvo na mesma conta.</li>
                  <li>O acesso volta assim que o pagamento é confirmado.</li>
                  <li>
                    Se preferir, você pode abrir o ambiente do Mercado Pago.
                  </li>
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
                  Já paguei
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
