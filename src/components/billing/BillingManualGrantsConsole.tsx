"use client";

import { type FormEvent, useState } from "react";
import type {
  BillingManualGrantsPayload,
  ManualGrantDurationOptionValue,
} from "@/modules/billing/manual-grants";
import {
  MANUAL_GRANT_DURATION_OPTIONS,
  MANUAL_GRANT_TYPE_LABELS,
} from "@/modules/billing/manual-grants";
import type {
  ManualAccessGrantRecord,
  ManualAccessGrantType,
} from "@/modules/billing/domain/types";
import styles from "./BillingManualGrantsConsole.module.css";

function formatDateTime(
  value: string | Date | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAccessStatusLabel(payload: BillingManualGrantsPayload): string {
  if (payload.access.manualGrantType) {
    return `Gratuidade ativa (${MANUAL_GRANT_TYPE_LABELS[payload.access.manualGrantType]})`;
  }

  switch (payload.access.effectiveStatus) {
    case "trialing":
      return "Teste gratuito em andamento";
    case "active":
      return "Assinatura ativa";
    case "grace_period":
      return "Janela de regularizacao";
    case "past_due":
      return "Pagamento pendente";
    case "expired":
      return "Acesso expirado";
    case "operator_override":
      return "Acesso operacional";
    default:
      return "Sem acesso liberado";
  }
}

function resolveGrantState(
  grant: ManualAccessGrantRecord,
  now = new Date(),
): { label: string; tone: "active" | "ended" | "revoked" } {
  if (grant.revokedAt) {
    return { label: "Revogada", tone: "revoked" };
  }

  const startsAt = new Date(grant.startsAt);
  const endsAt = grant.endsAt ? new Date(grant.endsAt) : null;

  if (startsAt.getTime() > now.getTime()) {
    return { label: "Agendada", tone: "ended" };
  }

  if (endsAt && endsAt.getTime() <= now.getTime()) {
    return { label: "Encerrada", tone: "ended" };
  }

  return { label: "Ativa", tone: "active" };
}

export function BillingManualGrantsConsole() {
  const [email, setEmail] = useState("");
  const [payload, setPayload] = useState<BillingManualGrantsPayload | null>(
    null,
  );
  const [grantType, setGrantType] = useState<ManualAccessGrantType>("courtesy");
  const [durationValue, setDurationValue] =
    useState<ManualGrantDurationOptionValue>("30");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);

  async function lookupByEmail(targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setLookupError("Informe o e-mail da conta que vai receber a gratuidade.");
      return;
    }

    setIsSearching(true);
    setLookupError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/billing/manual-grants?email=${encodeURIComponent(normalizedEmail)}`,
      );
      const data = (await response.json().catch(() => null)) as
        | BillingManualGrantsPayload
        | { error?: string }
        | null;

      if (!response.ok || !data || !("targetUser" in data)) {
        setPayload(null);
        setLookupError(
          (data && "error" in data && data.error) ||
            "Nao foi possivel localizar esse usuario.",
        );
        return;
      }

      setPayload(data);
      setEmail(normalizedEmail);
      setReason("");
      setNotes("");
      setFeedback(null);
    } catch (error) {
      console.error("Failed to load billing manual grants", error);
      setPayload(null);
      setLookupError("Nao foi possivel localizar esse usuario.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupByEmail(email);
  }

  async function handleSaveGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!payload?.targetUser.email || isSaving) {
      return;
    }

    setIsSaving(true);
    setLookupError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/billing/manual-grants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetEmail: payload.targetUser.email,
          grantType,
          reason,
          notes,
          durationDays: durationValue === "none" ? null : Number(durationValue),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | BillingManualGrantsPayload
        | { error?: string }
        | null;

      if (!response.ok || !data || !("targetUser" in data)) {
        setLookupError(
          (data && "error" in data && data.error) ||
            "Nao foi possivel salvar a gratuidade.",
        );
        return;
      }

      setPayload(data);
      setReason("");
      setNotes("");
      setFeedback("Gratuidade registrada e auditada com sucesso.");
    } catch (error) {
      console.error("Failed to save billing manual grant", error);
      setLookupError("Nao foi possivel salvar a gratuidade.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevokeGrant(grant: ManualAccessGrantRecord) {
    if (revokingGrantId || grant.revokedAt) {
      return;
    }

    const confirmed = window.confirm(
      "Revogar esta gratuidade agora? O acesso do usuario volta a depender do status normal da assinatura.",
    );

    if (!confirmed) {
      return;
    }

    setRevokingGrantId(grant.id);
    setLookupError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/billing/manual-grants/${grant.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { revoked?: boolean; error?: string }
        | null;

      if (!response.ok) {
        setLookupError(
          (data && data.error) || "Nao foi possivel revogar a gratuidade.",
        );
        return;
      }

      if (payload?.targetUser.email) {
        await lookupByEmail(payload.targetUser.email);
      }

      setFeedback("Gratuidade revogada com sucesso.");
    } catch (error) {
      console.error("Failed to revoke billing manual grant", error);
      setLookupError("Nao foi possivel revogar a gratuidade.");
    } finally {
      setRevokingGrantId(null);
    }
  }

  return (
    <section className={`glass-panel ${styles.panel}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Concessoes de gratuidade</span>
          <h2 className={styles.title}>Controle manual para owner e admin.</h2>
          <p className={styles.description}>
            Localize a conta pelo e-mail, confira o acesso atual e registre uma
            gratuidade com motivo, prazo e auditoria.
          </p>
        </div>
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>E-mail da conta</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@exemplo.com"
            className={styles.input}
          />
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSearching}
        >
          {isSearching ? "Buscando..." : "Buscar conta"}
        </button>
      </form>

      {lookupError ? <p className={styles.error}>{lookupError}</p> : null}
      {feedback ? <p className={styles.success}>{feedback}</p> : null}

      {payload ? (
        <div className={styles.results}>
          <section className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span className={styles.cardLabel}>Conta alvo</span>
              <strong className={styles.cardValue}>
                {payload.targetUser.displayName || payload.targetUser.email}
              </strong>
              <p className={styles.cardMeta}>
                UID: {payload.targetUser.uid}
                <br />
                {payload.targetUser.email ?? "Sem e-mail"}
                {payload.targetUser.disabled ? " · conta desativada" : ""}
              </p>
            </article>

            <article className={styles.summaryCard}>
              <span className={styles.cardLabel}>Acesso atual</span>
              <strong className={styles.cardValue}>
                {resolveAccessStatusLabel(payload)}
              </strong>
              <p className={styles.cardMeta}>
                Inicio: {formatDateTime(payload.access.entitlementStartsAt) ?? "—"}
                <br />
                Fim: {formatDateTime(payload.access.entitlementEndsAt) ?? "—"}
              </p>
            </article>

            <article className={styles.summaryCard}>
              <span className={styles.cardLabel}>Assinatura</span>
              <strong className={styles.cardValue}>
                {payload.subscription?.planName ?? "Sem plano vinculado"}
              </strong>
              <p className={styles.cardMeta}>
                Status: {payload.subscription?.status ?? "sem assinatura"}
                <br />
                Ciclo: {formatDateTime(payload.subscription?.currentPeriodEnd) ?? "—"}
              </p>
            </article>
          </section>

          <section className={styles.workspace}>
            <form className={styles.grantForm} onSubmit={handleSaveGrant}>
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Conceder gratuidade</h3>
                  <p className={styles.sectionText}>
                    Registre o motivo e o prazo para a concessao. O historico
                    fica auditado no billing.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Tipo</span>
                  <select
                    className={styles.select}
                    value={grantType}
                    onChange={(event) =>
                      setGrantType(event.target.value as ManualAccessGrantType)
                    }
                  >
                    {Object.entries(MANUAL_GRANT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Duracao</span>
                  <select
                    className={styles.select}
                    value={durationValue}
                    onChange={(event) =>
                      setDurationValue(
                        event.target.value as ManualGrantDurationOptionValue,
                      )
                    }
                  >
                    {MANUAL_GRANT_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Motivo</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explique por que esta conta vai receber a gratuidade."
                  className={styles.textarea}
                  rows={3}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Observacoes internas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contexto opcional para operacao futura."
                  className={styles.textarea}
                  rows={4}
                />
              </label>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || payload.targetUser.disabled}
              >
                {isSaving ? "Registrando..." : "Conceder gratuidade"}
              </button>
            </form>

            <section className={styles.history}>
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Historico de concessoes</h3>
                  <p className={styles.sectionText}>
                    O grant ativo pode ser revogado aqui. Os anteriores ficam
                    visiveis para consulta.
                  </p>
                </div>
              </div>

              {payload.grants.length ? (
                <div className={styles.historyList}>
                  {payload.grants.map((grant) => {
                    const state = resolveGrantState(grant);

                    return (
                      <article key={grant.id} className={styles.historyCard}>
                        <div className={styles.historyHeader}>
                          <div>
                            <strong className={styles.historyTitle}>
                              {MANUAL_GRANT_TYPE_LABELS[grant.grantType]}
                            </strong>
                            <p className={styles.historyMeta}>
                              {formatDateTime(grant.startsAt) ?? "—"}{" "}
                              {grant.endsAt
                                ? `ate ${formatDateTime(grant.endsAt)}`
                                : "sem prazo"}
                            </p>
                          </div>
                          <span
                            className={`${styles.badge} ${
                              state.tone === "active"
                                ? styles.badgeActive
                                : state.tone === "revoked"
                                  ? styles.badgeRevoked
                                  : styles.badgeEnded
                            }`}
                          >
                            {state.label}
                          </span>
                        </div>

                        <p className={styles.historyReason}>{grant.reason}</p>
                        {grant.notes ? (
                          <p className={styles.historyNotes}>{grant.notes}</p>
                        ) : null}

                        <div className={styles.historyFooter}>
                          <span className={styles.historyMeta}>
                            Concedida por {grant.grantedBy}
                            {grant.revokedAt
                              ? ` · revogada em ${formatDateTime(grant.revokedAt)}`
                              : ""}
                          </span>

                          {!grant.revokedAt && state.tone === "active" ? (
                            <button
                              type="button"
                              className={styles.revokeButton}
                              onClick={() => handleRevokeGrant(grant)}
                              disabled={revokingGrantId === grant.id}
                            >
                              {revokingGrantId === grant.id
                                ? "Revogando..."
                                : "Revogar"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Nenhuma gratuidade registrada para essa conta ainda.
                </div>
              )}
            </section>
          </section>
        </div>
      ) : null}
    </section>
  );
}
