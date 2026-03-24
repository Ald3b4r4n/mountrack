"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  BillingManualGrantsPayload,
  BillingManualGrantUsersPayload,
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
import type { FirebaseAdminUserSummary } from "@/lib/firebase-admin";
import styles from "./BillingManualGrantsConsole.module.css";

const DEFAULT_GRANT_TYPE: ManualAccessGrantType = "courtesy";
const DEFAULT_DURATION: ManualGrantDurationOptionValue = "30";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

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

function resolveDurationValue(
  grant: ManualAccessGrantRecord,
): ManualGrantDurationOptionValue {
  if (!grant.endsAt) {
    return "none";
  }

  const durationInDays = Math.round(
    (new Date(grant.endsAt).getTime() - new Date(grant.startsAt).getTime()) /
      ONE_DAY_IN_MS,
  );
  const matchedOption = MANUAL_GRANT_DURATION_OPTIONS.find(
    (option) =>
      option.value !== "none" && Number(option.value) === durationInDays,
  );

  return matchedOption?.value ?? DEFAULT_DURATION;
}

function resolveUserLabel(user: FirebaseAdminUserSummary): string {
  return user.displayName || user.email || user.uid;
}

function resolveAuditActionLabel(action: string): string {
  switch (action) {
    case "billing.manual_grant_saved":
      return "Gratuidade concedida";
    case "billing.manual_grant_updated":
      return "Gratuidade editada";
    case "billing.manual_grant_revoked":
      return "Gratuidade revogada";
    default:
      return action;
  }
}

function readAuditMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function BillingManualGrantsConsole() {
  const [email, setEmail] = useState("");
  const [payload, setPayload] = useState<BillingManualGrantsPayload | null>(
    null,
  );
  const [directoryUsers, setDirectoryUsers] = useState<FirebaseAdminUserSummary[]>(
    [],
  );
  const [directoryCursor, setDirectoryCursor] = useState<string | null>(null);
  const [directoryFilter, setDirectoryFilter] = useState("");
  const [grantType, setGrantType] =
    useState<ManualAccessGrantType>(DEFAULT_GRANT_TYPE);
  const [durationValue, setDurationValue] =
    useState<ManualGrantDurationOptionValue>(DEFAULT_DURATION);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);

  const filteredDirectoryUsers = useMemo(() => {
    const normalizedFilter = directoryFilter.trim().toLowerCase();

    if (!normalizedFilter) {
      return directoryUsers;
    }

    return directoryUsers.filter((user) => {
      const haystacks = [
        user.displayName ?? "",
        user.email ?? "",
        user.uid,
      ];

      return haystacks.some((value) =>
        value.toLowerCase().includes(normalizedFilter),
      );
    });
  }, [directoryFilter, directoryUsers]);

  function resetGrantForm() {
    setEditingGrantId(null);
    setGrantType(DEFAULT_GRANT_TYPE);
    setDurationValue(DEFAULT_DURATION);
    setReason("");
    setNotes("");
  }

  const loadUserDirectory = useCallback(async (cursor?: string | null) => {
    const isLoadingMore = Boolean(cursor);

    if (!isLoadingMore) {
      setIsDirectoryLoading(true);
    }

    setDirectoryError(null);

    try {
      const response = await fetch(
        cursor
          ? `/api/billing/manual-grants/users?cursor=${encodeURIComponent(cursor)}`
          : "/api/billing/manual-grants/users",
      );
      const data = (await response.json().catch(() => null)) as
        | BillingManualGrantUsersPayload
        | { error?: string }
        | null;

      if (!response.ok || !data || !("users" in data)) {
        setDirectoryError(
          (data && "error" in data && data.error) ||
            "Nao foi possivel carregar os usuarios.",
        );
        return;
      }

      setDirectoryUsers((currentUsers) =>
        isLoadingMore ? [...currentUsers, ...data.users] : data.users,
      );
      setDirectoryCursor(data.nextPageToken);
    } catch (error) {
      console.error("Failed to load billing manual grants users", error);
      setDirectoryError("Nao foi possivel carregar os usuarios.");
    } finally {
      if (!isLoadingMore) {
        setIsDirectoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadUserDirectory();
  }, [loadUserDirectory]);

  async function lookupTarget(target: {
    email?: string | null;
    uid?: string | null;
  }) {
    const normalizedEmail = target.email?.trim().toLowerCase() ?? "";
    const normalizedUid = target.uid?.trim() ?? "";

    if (!normalizedEmail && !normalizedUid) {
      setLookupError("Escolha um usuario ou informe o e-mail da conta.");
      return;
    }

    setIsSearching(true);
    setLookupError(null);
    setFeedback(null);

    try {
      const searchParams = new URLSearchParams();

      if (normalizedUid) {
        searchParams.set("uid", normalizedUid);
      } else {
        searchParams.set("email", normalizedEmail);
      }

      const response = await fetch(
        `/api/billing/manual-grants?${searchParams.toString()}`,
      );
      const data = (await response.json().catch(() => null)) as
        | BillingManualGrantsPayload
        | { error?: string }
        | null;

      if (!response.ok || !data || !("targetUser" in data)) {
        setPayload(null);
        resetGrantForm();
        setLookupError(
          (data && "error" in data && data.error) ||
            "Nao foi possivel localizar esse usuario.",
        );
        return;
      }

      setPayload(data);
      setEmail(data.targetUser.email ?? normalizedEmail);
      resetGrantForm();
      setFeedback(null);
    } catch (error) {
      console.error("Failed to load billing manual grants", error);
      setPayload(null);
      resetGrantForm();
      setLookupError("Nao foi possivel localizar esse usuario.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupTarget({ email });
  }

  async function handleSaveGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((!payload?.targetUser.email && !payload?.targetUser.uid) || isSaving) {
      return;
    }

    setIsSaving(true);
    setLookupError(null);
    setFeedback(null);

    const isEditing = Boolean(editingGrantId);
    const requestUrl = isEditing
      ? `/api/billing/manual-grants/${editingGrantId}`
      : "/api/billing/manual-grants";
    const requestMethod = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...(isEditing ? {} : { targetEmail: payload.targetUser.email }),
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
            (isEditing
              ? "Nao foi possivel atualizar a gratuidade."
              : "Nao foi possivel salvar a gratuidade."),
        );
        return;
      }

      setPayload(data);
      resetGrantForm();
      setFeedback(
        isEditing
          ? "Gratuidade atualizada com sucesso."
          : "Gratuidade registrada e auditada com sucesso.",
      );
    } catch (error) {
      console.error("Failed to save billing manual grant", error);
      setLookupError(
        isEditing
          ? "Nao foi possivel atualizar a gratuidade."
          : "Nao foi possivel salvar a gratuidade.",
      );
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

      if (editingGrantId === grant.id) {
        resetGrantForm();
      }

      await lookupTarget({
        uid: payload?.targetUser.uid ?? null,
        email: payload?.targetUser.email ?? null,
      });

      setFeedback("Gratuidade revogada com sucesso.");
    } catch (error) {
      console.error("Failed to revoke billing manual grant", error);
      setLookupError("Nao foi possivel revogar a gratuidade.");
    } finally {
      setRevokingGrantId(null);
    }
  }

  function handleEditGrant(grant: ManualAccessGrantRecord) {
    setEditingGrantId(grant.id);
    setGrantType(grant.grantType);
    setDurationValue(resolveDurationValue(grant));
    setReason(grant.reason);
    setNotes(grant.notes ?? "");
    setLookupError(null);
    setFeedback(null);
  }

  return (
    <section className={`glass-panel ${styles.panel}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Concessoes de gratuidade</span>
          <h2 className={styles.title}>Controle manual para owner e admin.</h2>
          <p className={styles.description}>
            Veja o diretorio de contas, abra o historico de cada usuario e
            conceda, edite ou revogue gratuidades com motivo e auditoria.
          </p>
        </div>
      </div>

      <section className={styles.directorySection}>
        <div className={styles.formHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Todos os usuarios</h3>
            <p className={styles.sectionText}>
              Abra qualquer conta a partir do diretorio ou use a busca direta
              por e-mail quando precisar ir mais rapido.
            </p>
          </div>
        </div>

        <div className={styles.directoryToolbar}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Buscar por e-mail</span>
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

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Filtrar diretorio carregado</span>
            <input
              type="search"
              value={directoryFilter}
              onChange={(event) => setDirectoryFilter(event.target.value)}
              placeholder="Nome, e-mail ou UID"
              className={styles.input}
            />
          </label>

          <p className={styles.directorySummary}>
            Exibindo {filteredDirectoryUsers.length} de {directoryUsers.length} usuarios carregados.
          </p>
        </div>

        {directoryError ? (
          <p className={styles.error}>{directoryError}</p>
        ) : null}

        <div className={styles.directoryList}>
          {filteredDirectoryUsers.map((user) => {
            const isSelected = payload?.targetUser.uid === user.uid;

            return (
              <button
                key={user.uid}
                type="button"
                className={`${styles.userCard} ${
                  isSelected ? styles.userCardSelected : ""
                }`}
                onClick={() => void lookupTarget({ uid: user.uid })}
              >
                <strong className={styles.userName}>{resolveUserLabel(user)}</strong>
                <span className={styles.userMeta}>
                  {user.email ?? "Sem e-mail"} · UID {user.uid}
                  {user.disabled ? " · conta desativada" : ""}
                </span>
              </button>
            );
          })}

          {isDirectoryLoading ? (
            <div className={styles.emptyState}>Carregando usuarios...</div>
          ) : null}

          {!isDirectoryLoading && directoryUsers.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum usuario retornado pelo Firebase Admin.
            </div>
          ) : null}

          {!isDirectoryLoading &&
          directoryUsers.length > 0 &&
          filteredDirectoryUsers.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum usuario carregado corresponde ao filtro atual.
            </div>
          ) : null}
        </div>

        {directoryCursor ? (
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={() => void loadUserDirectory(directoryCursor)}
          >
            Carregar mais usuarios
          </button>
        ) : null}
      </section>

      {lookupError ? <p className={styles.error}>{lookupError}</p> : null}
      {feedback ? <p className={styles.success}>{feedback}</p> : null}

      {payload ? (
        <div className={styles.results}>
          <section className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span className={styles.cardLabel}>Conta alvo</span>
              <strong className={styles.cardValue}>
                {resolveUserLabel(payload.targetUser)}
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
                Inicio: {formatDateTime(payload.access.entitlementStartsAt) ?? "-"}
                <br />
                Fim: {formatDateTime(payload.access.entitlementEndsAt) ?? "-"}
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
                Ciclo: {formatDateTime(payload.subscription?.currentPeriodEnd) ?? "-"}
              </p>
            </article>
          </section>

          <section className={styles.workspace}>
            <form className={styles.grantForm} onSubmit={handleSaveGrant}>
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>
                    {editingGrantId ? "Editar gratuidade" : "Conceder gratuidade"}
                  </h3>
                  <p className={styles.sectionText}>
                    {editingGrantId
                      ? "Ajuste tipo, motivo e prazo do grant selecionado. A trilha de auditoria continua registrada."
                      : "Registre o motivo e o prazo para a concessao. O historico fica auditado no billing."}
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

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving || payload.targetUser.disabled}
                >
                  {isSaving
                    ? editingGrantId
                      ? "Salvando..."
                      : "Registrando..."
                    : editingGrantId
                      ? "Salvar edicao"
                      : "Conceder gratuidade"}
                </button>

                {editingGrantId ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetGrantForm}
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>

            <section className={styles.history}>
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Historico de concessoes</h3>
                  <p className={styles.sectionText}>
                    Abra um grant para editar, ou revogue o que ainda estiver
                    ativo. O restante continua visivel para consulta.
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
                              {formatDateTime(grant.startsAt) ?? "-"}{" "}
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

                          <div className={styles.historyActions}>
                            {!grant.revokedAt ? (
                              <button
                                type="button"
                                className={styles.editButton}
                                onClick={() => handleEditGrant(grant)}
                              >
                                Editar
                              </button>
                            ) : null}
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

              <div className={styles.auditSection}>
                <div className={styles.formHeader}>
                  <div>
                    <h3 className={styles.sectionTitle}>Auditoria recente</h3>
                    <p className={styles.sectionText}>
                      Eventos mais recentes ligados a essa conta para consulta
                      operacional rapida.
                    </p>
                  </div>
                </div>

                {payload.auditLogs.length ? (
                  <div className={styles.auditList}>
                    {payload.auditLogs.map((auditLog) => {
                      const grantType = readAuditMetadataValue(
                        auditLog.metadata,
                        "grantType",
                      );
                      const reason = readAuditMetadataValue(
                        auditLog.metadata,
                        "reason",
                      );

                      return (
                        <article key={auditLog.id} className={styles.auditCard}>
                          <div className={styles.auditHeader}>
                            <strong className={styles.historyTitle}>
                              {resolveAuditActionLabel(auditLog.action)}
                            </strong>
                            <span className={styles.historyMeta}>
                              {formatDateTime(auditLog.createdAt) ?? "-"}
                            </span>
                          </div>

                          <p className={styles.auditMeta}>
                            Operador: {auditLog.actorUserId}
                            {" · "}
                            Alvo: {auditLog.targetType}
                          </p>

                          {grantType || reason ? (
                            <p className={styles.auditNotes}>
                              {grantType
                                ? `Tipo: ${
                                    MANUAL_GRANT_TYPE_LABELS[
                                      grantType as ManualAccessGrantType
                                    ] ?? grantType
                                  }`
                                : "Tipo nao informado"}
                              {reason ? ` · Motivo: ${reason}` : ""}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    Nenhum evento de auditoria encontrado para essa conta ainda.
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      ) : null}
    </section>
  );
}
