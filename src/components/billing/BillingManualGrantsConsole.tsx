"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  BillingManualGrantsPayload,
  BillingManualGrantUsersPayload,
  ManualGrantDurationOptionValue,
} from "@/modules/billing/manual-grants";
import {
  MANUAL_GRANT_DURATION_OPTIONS,
  MANUAL_GRANT_PRESETS,
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
      return "Janela de regularização";
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

function resolveOperatorLabel(
  operatorId: string,
  operatorUsers: Record<string, FirebaseAdminUserSummary> | undefined,
): string {
  const operator = operatorUsers?.[operatorId];

  if (!operator) {
    return operatorId;
  }

  return resolveUserLabel(operator);
}

function resolveOperatorMeta(
  operatorId: string,
  operatorUsers: Record<string, FirebaseAdminUserSummary> | undefined,
): string {
  const operator = operatorUsers?.[operatorId];
  if (!operator) {
    return operatorId;
  }

  const primaryLabel = resolveUserLabel(operator);
  if (operator.email && operator.email !== primaryLabel) {
    return `${primaryLabel} - ${operator.email}`;
  }

  return primaryLabel;
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
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [activeDirectoryQuery, setActiveDirectoryQuery] = useState("");
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
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditOperatorFilter, setAuditOperatorFilter] = useState("all");

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

  const operatorUsers = payload?.operatorUsers;

  const auditActionOptions = useMemo(() => {
    if (!payload?.auditLogs.length) {
      return [];
    }

    return Array.from(
      new Set(payload.auditLogs.map((auditLog) => auditLog.action)),
    ).map((action) => ({
      value: action,
      label: resolveAuditActionLabel(action),
    }));
  }, [payload]);

  const auditOperatorOptions = useMemo(() => {
    if (!payload?.auditLogs.length) {
      return [];
    }

    return Array.from(
      new Set(payload.auditLogs.map((auditLog) => auditLog.actorUserId)),
    ).map((operatorId) => ({
      value: operatorId,
      label: resolveOperatorLabel(operatorId, operatorUsers),
    }));
  }, [operatorUsers, payload]);

  const filteredAuditLogs = useMemo(() => {
    if (!payload?.auditLogs.length) {
      return [];
    }

    return payload.auditLogs.filter((auditLog) => {
      if (auditActionFilter !== "all" && auditLog.action !== auditActionFilter) {
        return false;
      }

      if (
        auditOperatorFilter !== "all" &&
        auditLog.actorUserId !== auditOperatorFilter
      ) {
        return false;
      }

      return true;
    });
  }, [auditActionFilter, auditOperatorFilter, payload]);

  function resetGrantForm() {
    setEditingGrantId(null);
    setGrantType(DEFAULT_GRANT_TYPE);
    setDurationValue(DEFAULT_DURATION);
    setReason("");
    setNotes("");
  }

  function applyPreset(presetId: string) {
    const preset = MANUAL_GRANT_PRESETS.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    setGrantType(preset.grantType);
    setDurationValue(preset.durationValue);
    setReason(preset.reason);
    setNotes(preset.notes);
    setLookupError(null);
    setFeedback(null);
  }

  const activePresetId = useMemo(() => {
    const matchedPreset = MANUAL_GRANT_PRESETS.find(
      (preset) =>
        preset.grantType === grantType &&
        preset.durationValue === durationValue &&
        preset.reason === reason &&
        preset.notes === notes,
    );

    return matchedPreset?.id ?? null;
  }, [durationValue, grantType, notes, reason]);

  const loadUserDirectory = useCallback(async (options?: {
    cursor?: string | null;
    query?: string;
  }) => {
    const cursor = options?.cursor ?? null;
    const query = options?.query ?? "";
    const isLoadingMore = Boolean(cursor);

    if (!isLoadingMore) {
      setIsDirectoryLoading(true);
    }

    setDirectoryError(null);

    try {
      const searchParams = new URLSearchParams();

      if (cursor) {
        searchParams.set("cursor", cursor);
      }

      if (query.trim()) {
        searchParams.set("query", query.trim());
      }

      const response = await fetch(
        searchParams.size
          ? `/api/billing/manual-grants/users?${searchParams.toString()}`
          : "/api/billing/manual-grants/users",
      );
      const data = (await response.json().catch(() => null)) as
        | BillingManualGrantUsersPayload
        | { error?: string }
        | null;

      if (!response.ok || !data || !("users" in data)) {
        setDirectoryError(
          (data && "error" in data && data.error) ||
            "Não foi possível carregar os usuários.",
        );
        return;
      }

      setDirectoryUsers((currentUsers) =>
        isLoadingMore ? [...currentUsers, ...data.users] : data.users,
      );
      setDirectoryCursor(data.nextPageToken);
      if (!isLoadingMore) {
        setActiveDirectoryQuery(query.trim());
      }
    } catch (error) {
      console.error("Failed to load billing manual grants users", error);
      setDirectoryError("Não foi possível carregar os usuários.");
    } finally {
      if (!isLoadingMore) {
        setIsDirectoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadUserDirectory();
  }, [loadUserDirectory]);

  useEffect(() => {
    setAuditActionFilter("all");
    setAuditOperatorFilter("all");
  }, [payload?.targetUser.uid]);

  async function handleDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadUserDirectory({ query: directoryQuery });
  }

  async function lookupTarget(target: {
    email?: string | null;
    uid?: string | null;
  }) {
    const normalizedEmail = target.email?.trim().toLowerCase() ?? "";
    const normalizedUid = target.uid?.trim() ?? "";

    if (!normalizedEmail && !normalizedUid) {
      setLookupError("Escolha um usuário ou informe o e-mail da conta.");
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
            "Não foi possível localizar esse usuário.",
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
      setLookupError("Não foi possível localizar esse usuário.");
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
              ? "Não foi possível atualizar a gratuidade."
              : "Não foi possível salvar a gratuidade."),
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
          ? "Não foi possível atualizar a gratuidade."
          : "Não foi possível salvar a gratuidade.",
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
      "Revogar esta gratuidade agora? O acesso do usuário volta a depender do status normal da assinatura.",
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
          (data && data.error) || "Não foi possível revogar a gratuidade.",
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
      setLookupError("Não foi possível revogar a gratuidade.");
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
          <span className={styles.eyebrow}>Concessões de gratuidade</span>
          <h2 className={styles.title}>Controle manual para owner e admin.</h2>
          <p className={styles.description}>
            Veja o diretório de contas, abra o histórico de cada usuário e
            conceda, edite ou revogue gratuidades com motivo e auditoria.
          </p>
        </div>
      </div>

      <section className={styles.directorySection}>
        <div className={styles.formHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Todos os usuários</h3>
            <p className={styles.sectionText}>
              Abra qualquer conta a partir do diretório ou use a busca direta
              por e-mail quando precisar ir mais rápido.
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

          <form className={styles.searchForm} onSubmit={handleDirectorySearch}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Buscar no diretório</span>
              <input
                type="search"
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder="Nome, e-mail ou UID"
                className={styles.input}
              />
            </label>

            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={isDirectoryLoading}
            >
              {isDirectoryLoading ? "Carregando..." : "Buscar diretório"}
            </button>
          </form>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Refinar resultados carregados</span>
            <input
              type="search"
              value={directoryFilter}
              onChange={(event) => setDirectoryFilter(event.target.value)}
              placeholder="Filtrar apenas os resultados na tela"
              className={styles.input}
            />
          </label>

          <p className={styles.directorySummary}>
            Exibindo {filteredDirectoryUsers.length} de {directoryUsers.length} usuários carregados.
            {activeDirectoryQuery
              ? ` Busca ativa: "${activeDirectoryQuery}".`
              : " Diretório geral carregado."}
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
                  {user.email ?? "Sem e-mail"} | UID {user.uid}
                  {user.disabled ? " | conta desativada" : ""}
                </span>
              </button>
            );
          })}

          {isDirectoryLoading ? (
            <div className={styles.emptyState}>Carregando usuários...</div>
          ) : null}

          {!isDirectoryLoading && directoryUsers.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum usuário retornado pelo Firebase Admin.
            </div>
          ) : null}

          {!isDirectoryLoading &&
          directoryUsers.length > 0 &&
          filteredDirectoryUsers.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum usuário carregado corresponde ao filtro atual.
            </div>
          ) : null}
        </div>

        {directoryCursor ? (
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={() =>
              void loadUserDirectory({
                cursor: directoryCursor,
                query: activeDirectoryQuery,
              })
            }
          >
            Carregar mais usuários
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
                Início: {formatDateTime(payload.access.entitlementStartsAt) ?? "-"}
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
                      : "Registre o motivo e o prazo da concessão. O histórico fica registrado para auditoria interna."}
                  </p>
                </div>
              </div>

              <div className={styles.presetGrid}>
                {MANUAL_GRANT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetButton} ${
                      activePresetId === preset.id ? styles.presetButtonActive : ""
                    }`}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <strong>{preset.label}</strong>
                    <span className={styles.presetDescription}>
                      {preset.description}
                    </span>
                  </button>
                ))}
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
                  <span className={styles.fieldLabel}>Duração</span>
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
                <span className={styles.fieldLabel}>Observações internas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contexto opcional para operação futura."
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
                      ? "Salvar edição"
                      : "Conceder gratuidade"}
                </button>

                {editingGrantId ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetGrantForm}
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </form>

            <section className={styles.history}>
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Histórico de concessões</h3>
                  <p className={styles.sectionText}>
                    Abra um grant para editar, ou revogue o que ainda estiver
                    ativo. O restante continua visível para consulta.
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
                                ? `até ${formatDateTime(grant.endsAt)}`
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
                            Concedida por {resolveOperatorMeta(grant.grantedBy, operatorUsers)}
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
                      operacional rápida.
                    </p>
                  </div>
                </div>

                {payload.auditLogs.length ? (
                  <div className={styles.auditFilters}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Filtrar por ação</span>
                      <select
                        className={styles.select}
                        value={auditActionFilter}
                        onChange={(event) => setAuditActionFilter(event.target.value)}
                      >
                        <option value="all">Todas as ações</option>
                        {auditActionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Filtrar por operador</span>
                      <select
                        className={styles.select}
                        value={auditOperatorFilter}
                        onChange={(event) => setAuditOperatorFilter(event.target.value)}
                      >
                        <option value="all">Todos os operadores</option>
                        {auditOperatorOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                {payload.auditLogs.length ? (
                  <div className={styles.auditList}>
                    <p className={styles.directorySummary}>
                      Exibindo {filteredAuditLogs.length} de {payload.auditLogs.length} eventos.
                    </p>

                    {filteredAuditLogs.map((auditLog) => {
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
                            Operador: {resolveOperatorMeta(auditLog.actorUserId, operatorUsers)}
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
                                : "Tipo não informado"}
                              {reason ? ` · Motivo: ${reason}` : ""}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}

                    {!filteredAuditLogs.length ? (
                      <div className={styles.emptyState}>
                        Nenhum evento corresponde aos filtros atuais.
                      </div>
                    ) : null}
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
