'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  DEFAULT_DOSES_PER_AMPOULE,
  calculateJourneyDoseStats,
} from '@/modules/dashboard/utils';
import {
  closeAmpouleHistoryEntry,
  loadAmpouleHistory,
  loadAmpouleSettingsWithUserFallback,
  saveAmpouleSettings,
  updateAmpouleHistoryEntry,
  type AmpouleHistoryEntry,
} from '@/modules/dashboard/ampoule-settings';
import type { DashboardLogSummary } from '@/modules/dashboard/utils';

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAmpouleDate(date: string | null) {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDateOnlyDifferenceInDays(date: string | null, now = new Date()) {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const baseDate = new Date(year, (month || 1) - 1, day || 1);
  baseDate.setHours(0, 0, 0, 0);

  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.round((currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatAmpouleAgeLabel(daysOpen: number | null) {
  if (daysOpen === null) {
    return null;
  }

  if (daysOpen === 0) {
    return 'aberta hoje';
  }

  if (daysOpen === 1) {
    return 'aberta há 1 dia';
  }

  return `aberta há ${daysOpen} dias`;
}

function buildAmpouleActivationState(totalDoseApplications: number, dosesPerAmpoule: number) {
  const safeDosesPerAmpoule = Math.max(1, Math.round(dosesPerAmpoule || DEFAULT_DOSES_PER_AMPOULE));
  const safeTotalDoseApplications = Math.max(0, Math.round(totalDoseApplications || 0));

  if (safeTotalDoseApplications === 0) {
    return {
      actionLabel: 'Iniciar ampola atual',
      helperText: 'A ampola atual começa zerada a partir da data escolhida.',
      completedAmpoulesCount: 0,
      activeAmpouleStartDoseApplications: 0,
    };
  }

  const remainder = safeTotalDoseApplications % safeDosesPerAmpoule;

  if (remainder === 0) {
    return {
      actionLabel: 'Iniciar ampola atual',
      helperText: 'As aplicações anteriores já fecharam ampolas completas. A próxima ampola começa zerada.',
      completedAmpoulesCount: safeTotalDoseApplications / safeDosesPerAmpoule,
      activeAmpouleStartDoseApplications: safeTotalDoseApplications,
    };
  }

  return {
    actionLabel: 'Assumir ampola atual',
    helperText: 'O sistema preserva o progresso já em andamento da ampola atual quando você iniciar o controle manual.',
    completedAmpoulesCount: Math.floor(safeTotalDoseApplications / safeDosesPerAmpoule),
    activeAmpouleStartDoseApplications: safeTotalDoseApplications - remainder,
  };
}

export default function AmpoulesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dosesPerAmpoule, setDosesPerAmpoule] = useState(DEFAULT_DOSES_PER_AMPOULE);
  const [previousDoseApplications, setPreviousDoseApplications] = useState(0);
  const [ampouleOpenedOnInput, setAmpouleOpenedOnInput] = useState(() => getTodayDateInputValue());
  const [activeAmpouleOpenedOn, setActiveAmpouleOpenedOn] = useState<string | null>(null);
  const [activeAmpouleStartDoseApplications, setActiveAmpouleStartDoseApplications] = useState<number | null>(null);
  const [activeAmpouleRecordId, setActiveAmpouleRecordId] = useState<string | null>(null);
  const [completedAmpoulesCount, setCompletedAmpoulesCount] = useState(0);
  const [historyEntries, setHistoryEntries] = useState<AmpouleHistoryEntry[]>([]);
  const [logSummaries, setLogSummaries] = useState<DashboardLogSummary[]>([]);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingOpenedOn, setEditingOpenedOn] = useState('');
  const [editingClosedOn, setEditingClosedOn] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      try {
        const settings = await loadAmpouleSettingsWithUserFallback(user.uid);
        const history = await loadAmpouleHistory(user.uid);

        setDosesPerAmpoule(settings.dosesPerAmpoule);
        setPreviousDoseApplications(settings.previousDoseApplications);
        setActiveAmpouleOpenedOn(settings.activeAmpouleOpenedOn);
        setActiveAmpouleStartDoseApplications(settings.activeAmpouleStartDoseApplications);
        setActiveAmpouleRecordId(settings.activeAmpouleRecordId);
        setCompletedAmpoulesCount(settings.completedAmpoulesCount);
        setAmpouleOpenedOnInput(settings.activeAmpouleOpenedOn ?? getTodayDateInputValue());
        setHistoryEntries(history);

        const logsRef = collection(db, 'users', user.uid, 'logs');
        const snapshot = await getDocs(query(logsRef, orderBy('date', 'desc')));
        const logs: DashboardLogSummary[] = [];

        snapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          logs.push({ date: data.date, type: data.type, dose: data.dose });
        });

        setLogSummaries(logs);
      } catch (error) {
        console.error('Erro ao carregar configuracao de ampola', error);
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, [user]);

  const loggedDoseApplications = logSummaries.filter(
    (log) => Boolean(log.dose) || log.type === 'dose',
  ).length;

  const stats = useMemo(
    () =>
      calculateJourneyDoseStats(
        logSummaries,
        new Date(),
        dosesPerAmpoule,
        previousDoseApplications,
        {
          activeAmpouleOpenedOn,
          activeAmpouleStartDoseApplications,
          completedAmpoulesCount,
        },
      ),
    [
      activeAmpouleOpenedOn,
      activeAmpouleStartDoseApplications,
      completedAmpoulesCount,
      dosesPerAmpoule,
      logSummaries,
      previousDoseApplications,
    ],
  );

  const activationState = buildAmpouleActivationState(stats.totalDoseApplications, dosesPerAmpoule);
  const hasActiveAmpoule = Boolean(activeAmpouleOpenedOn && activeAmpouleStartDoseApplications !== null);
  const activeAmpouleOpenedLabel = formatAmpouleDate(activeAmpouleOpenedOn);
  const activeAmpouleOpenDays = getDateOnlyDifferenceInDays(activeAmpouleOpenedOn);
  const activeAmpouleAgeLabel = formatAmpouleAgeLabel(activeAmpouleOpenDays);
  const currentAmpouleSequence = hasActiveAmpoule ? completedAmpoulesCount + 1 : null;
  const currentAmpouleProgress =
    dosesPerAmpoule > 0 ? Math.min((stats.dosesUsedFromCurrentAmpoule / dosesPerAmpoule) * 100, 100) : 0;
  const representedClosedAmpoules = historyEntries.filter((entry) => entry.status === 'closed').length;
  const legacyHistoryGap = Math.max(0, completedAmpoulesCount - representedClosedAmpoules);

  async function refreshHistory(nextActiveRecordId?: string | null) {
    if (!user) return;

    const history = await loadAmpouleHistory(user.uid);
    setHistoryEntries(history);

    if (typeof nextActiveRecordId !== 'undefined') {
      setActiveAmpouleRecordId(nextActiveRecordId);
    }
  }

  function resetHistoryEditor() {
    setEditingHistoryId(null);
    setEditingOpenedOn('');
    setEditingClosedOn('');
  }

  function startHistoryCorrection(entry: AmpouleHistoryEntry) {
    setEditingHistoryId(entry.id);
    setEditingOpenedOn(entry.openedOn);
    setEditingClosedOn(entry.closedOn ?? '');
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const normalizedDosesPerAmpoule = Math.max(
      1,
      Math.round(dosesPerAmpoule || DEFAULT_DOSES_PER_AMPOULE),
    );
    const normalizedPreviousDoseApplications = Math.max(
      0,
      Math.round(previousDoseApplications || 0),
    );

    setSaving(true);
    setFeedback(null);
    try {
      const savedSettings = await saveAmpouleSettings(user.uid, {
        dosesPerAmpoule: normalizedDosesPerAmpoule,
        previousDoseApplications: normalizedPreviousDoseApplications,
        activeAmpouleOpenedOn: hasActiveAmpoule ? ampouleOpenedOnInput : null,
        activeAmpouleStartDoseApplications,
        activeAmpouleRecordId,
        completedAmpoulesCount,
      });

      setDosesPerAmpoule(savedSettings.dosesPerAmpoule);
      setPreviousDoseApplications(savedSettings.previousDoseApplications);
      setActiveAmpouleOpenedOn(savedSettings.activeAmpouleOpenedOn);
      setActiveAmpouleStartDoseApplications(savedSettings.activeAmpouleStartDoseApplications);
      setActiveAmpouleRecordId(savedSettings.activeAmpouleRecordId);
      setCompletedAmpoulesCount(savedSettings.completedAmpoulesCount);
      setAmpouleOpenedOnInput(savedSettings.activeAmpouleOpenedOn ?? ampouleOpenedOnInput);
      await refreshHistory(savedSettings.activeAmpouleRecordId);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Erro ao salvar configuracao de ampola', error);
      alert('Não foi possível salvar a configuração da ampola.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartAmpoule = async () => {
    if (!user) return;

    const openedOn = ampouleOpenedOnInput || getTodayDateInputValue();

    setSaving(true);
    setSaved(false);
    setFeedback(null);
    try {
      const savedSettings = await saveAmpouleSettings(user.uid, {
        dosesPerAmpoule,
        previousDoseApplications,
        activeAmpouleOpenedOn: openedOn,
        activeAmpouleStartDoseApplications: activationState.activeAmpouleStartDoseApplications,
        activeAmpouleRecordId: null,
        completedAmpoulesCount: activationState.completedAmpoulesCount,
      });

      setDosesPerAmpoule(savedSettings.dosesPerAmpoule);
      setPreviousDoseApplications(savedSettings.previousDoseApplications);
      setActiveAmpouleOpenedOn(savedSettings.activeAmpouleOpenedOn);
      setActiveAmpouleStartDoseApplications(savedSettings.activeAmpouleStartDoseApplications);
      setActiveAmpouleRecordId(savedSettings.activeAmpouleRecordId);
      setCompletedAmpoulesCount(savedSettings.completedAmpoulesCount);
      setAmpouleOpenedOnInput(savedSettings.activeAmpouleOpenedOn ?? openedOn);
      await refreshHistory(savedSettings.activeAmpouleRecordId);
      setFeedback('Ampola atual iniciada e adicionada ao histórico.');
    } catch (error) {
      console.error('Erro ao iniciar ampola atual', error);
      alert('Não foi possível iniciar a ampola atual.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishAmpoule = async () => {
    if (!user || !hasActiveAmpoule || !activeAmpouleRecordId) return;

    setSaving(true);
    setSaved(false);
    setFeedback(null);
    try {
      await closeAmpouleHistoryEntry(user.uid, activeAmpouleRecordId, {
        closedOn: getTodayDateInputValue(),
        endTotalDoseApplications: stats.totalDoseApplications,
        dosesUsed: stats.dosesUsedFromCurrentAmpoule,
      });

      const savedSettings = await saveAmpouleSettings(user.uid, {
        dosesPerAmpoule,
        previousDoseApplications,
        activeAmpouleOpenedOn: null,
        activeAmpouleStartDoseApplications: null,
        activeAmpouleRecordId: null,
        completedAmpoulesCount: stats.ampoulesUsed,
      });

      setDosesPerAmpoule(savedSettings.dosesPerAmpoule);
      setPreviousDoseApplications(savedSettings.previousDoseApplications);
      setActiveAmpouleOpenedOn(savedSettings.activeAmpouleOpenedOn);
      setActiveAmpouleStartDoseApplications(savedSettings.activeAmpouleStartDoseApplications);
      setActiveAmpouleRecordId(savedSettings.activeAmpouleRecordId);
      setCompletedAmpoulesCount(savedSettings.completedAmpoulesCount);
      setAmpouleOpenedOnInput(getTodayDateInputValue());
      await refreshHistory(savedSettings.activeAmpouleRecordId);
      setFeedback('Ampola atual finalizada e registrada no histórico.');
    } catch (error) {
      console.error('Erro ao finalizar ampola atual', error);
      alert('Não foi possível finalizar a ampola atual.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHistoryCorrection = async (entry: AmpouleHistoryEntry) => {
    if (!user || entry.status !== 'closed') return;

    const nextOpenedOn = editingOpenedOn || entry.openedOn;
    const nextClosedOn = editingClosedOn || entry.closedOn;

    if (!nextOpenedOn || !nextClosedOn) {
      alert('Preencha as datas de abertura e fechamento para corrigir o histórico.');
      return;
    }

    if (nextClosedOn < nextOpenedOn) {
      alert('A data de fechamento não pode ser anterior à data de abertura.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setFeedback(null);
    try {
      await updateAmpouleHistoryEntry(user.uid, entry.id, {
        openedOn: nextOpenedOn,
        closedOn: nextClosedOn,
        status: 'closed',
      });
      await refreshHistory();
      resetHistoryEditor();
      setFeedback(`Histórico da ampola #${entry.sequenceNumber} corrigido.`);
    } catch (error) {
      console.error('Erro ao corrigir historico da ampola', error);
      alert('Não foi possível corrigir o histórico da ampola.');
    } finally {
      setSaving(false);
    }
  };

  const handleReopenHistoryEntry = async (entry: AmpouleHistoryEntry) => {
    if (!user || hasActiveAmpoule || entry.status !== 'closed') return;

    setSaving(true);
    setSaved(false);
    setFeedback(null);
    try {
      await updateAmpouleHistoryEntry(user.uid, entry.id, {
        status: 'active',
        closedOn: null,
        endTotalDoseApplications: null,
        dosesUsed: null,
      });

      const savedSettings = await saveAmpouleSettings(user.uid, {
        dosesPerAmpoule: entry.dosesPerAmpoule,
        previousDoseApplications,
        activeAmpouleOpenedOn: entry.openedOn,
        activeAmpouleStartDoseApplications: entry.startTotalDoseApplications,
        activeAmpouleRecordId: entry.id,
        completedAmpoulesCount: Math.max(0, entry.sequenceNumber - 1),
      });

      setDosesPerAmpoule(savedSettings.dosesPerAmpoule);
      setPreviousDoseApplications(savedSettings.previousDoseApplications);
      setActiveAmpouleOpenedOn(savedSettings.activeAmpouleOpenedOn);
      setActiveAmpouleStartDoseApplications(savedSettings.activeAmpouleStartDoseApplications);
      setActiveAmpouleRecordId(savedSettings.activeAmpouleRecordId);
      setCompletedAmpoulesCount(savedSettings.completedAmpoulesCount);
      setAmpouleOpenedOnInput(savedSettings.activeAmpouleOpenedOn ?? getTodayDateInputValue());
      await refreshHistory(savedSettings.activeAmpouleRecordId);
      resetHistoryEditor();
      setFeedback(`Ampola #${entry.sequenceNumber} reaberta para correção.`);
    } catch (error) {
      console.error('Erro ao reabrir ampola do historico', error);
      alert('Não foi possível reabrir essa ampola.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '1080px', paddingTop: '3rem', paddingBottom: '4rem' }}>
        <header
          style={{
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Link href="/" className="back-link anim-enter" style={{ marginBottom: '1rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Voltar ao painel
            </Link>
            <h1 className="glow-text" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Ampolas</h1>
            <p className="page-subtitle">
              Ajuste o tamanho da ampola, registre a abertura e mantenha a trilha completa de cada ciclo.
            </p>
          </div>
          <Logo size="sm" />
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1.2fr) minmax(280px, 0.8fr)',
            gap: '1.5rem',
            alignItems: 'start',
          }}
          className="ampoules-grid"
        >
          <section className="glass-panel anim-enter anim-delay-1" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Configuração da ampola</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Defina quantas doses cabem na sua ampola atual. Se você já aplicava antes de usar o app,
                informe esse volume para manter os cards coerentes.
              </p>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.45rem' }}>
                <span className="label">Doses por ampola</span>
                <input
                  type="number"
                  min={1}
                  value={dosesPerAmpoule}
                  onChange={(event) => setDosesPerAmpoule(Number(event.target.value))}
                  className="input-field"
                  disabled={loading}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.45rem' }}>
                <span className="label">Doses anteriores ao app</span>
                <input
                  type="number"
                  min={0}
                  value={previousDoseApplications}
                  onChange={(event) => setPreviousDoseApplications(Number(event.target.value))}
                  className="input-field"
                  disabled={loading}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.45rem' }}>
                <span className="label">Data de abertura da ampola atual</span>
                <input
                  type="date"
                  value={ampouleOpenedOnInput}
                  onChange={(event) => setAmpouleOpenedOnInput(event.target.value)}
                  className="input-field"
                  disabled={loading || saving}
                />
              </label>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(8, 14, 26, 0.55)' }}>
                <p className="stat-label" style={{ marginBottom: '0.45rem' }}>Status da ampola</p>
                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {hasActiveAmpoule
                    ? activeAmpouleOpenedLabel
                      ? `Ampola ativa desde ${activeAmpouleOpenedLabel}`
                      : 'Ampola ativa'
                    : 'Nenhuma ampola ativa'}
                </strong>
                <p style={{ marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                  {hasActiveAmpoule
                    ? stats.isCurrentAmpouleComplete
                      ? 'O limite de aplicações foi atingido. Você pode finalizar a ampola manualmente quando quiser.'
                      : 'A ampola atual continua aberta e o painel passa a refletir essa abertura.'
                    : activationState.helperText}
                </p>
                {hasActiveAmpoule && currentAmpouleSequence ? (
                  <p style={{ marginTop: '0.45rem', color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>
                    Ampola #{currentAmpouleSequence}{activeAmpouleAgeLabel ? `, ${activeAmpouleAgeLabel}` : ''}.
                  </p>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.9rem',
                  marginTop: '0.5rem',
                }}
              >
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(8, 14, 26, 0.55)' }}>
                  <p className="stat-label" style={{ marginBottom: '0.45rem' }}>Registros no app</p>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loggedDoseApplications}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(8, 14, 26, 0.55)' }}>
                  <p className="stat-label" style={{ marginBottom: '0.45rem' }}>Total contabilizado</p>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalDoseApplications}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading || saving}>
                  {saving ? 'Salvando...' : saved ? 'Configuração salva' : 'Salvar configuração'}
                </button>
                {!hasActiveAmpoule ? (
                  <button type="button" className="btn-outline" disabled={loading || saving} onClick={handleStartAmpoule}>
                    {activationState.actionLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={loading || saving}
                    onClick={handleFinishAmpoule}
                  >
                    Finalizar ampola atual
                  </button>
                )}
                {saved ? <span className="badge badge-success">Atualizado no seu perfil</span> : null}
                {feedback ? <span className="badge badge-success">{feedback}</span> : null}
              </div>
            </form>
          </section>

          <aside style={{ display: 'grid', gap: '1rem' }} className="anim-enter anim-delay-2">
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Impacto no painel</p>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ampolas contabilizadas</span>
                  <strong style={{ fontSize: '1.7rem', color: 'var(--text-primary)' }}>{stats.ampoulesUsed}</strong>
                  <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {completedAmpoulesCount} fechada(s){hasActiveAmpoule && currentAmpouleSequence ? ` + ampola #${currentAmpouleSequence} ativa` : ''}.
                  </p>
                </div>
                <div>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ampola em foco</span>
                  <strong style={{ fontSize: '1.7rem', color: 'var(--accent-secondary)' }}>
                    {hasActiveAmpoule ? `${stats.dosesUsedFromCurrentAmpoule}/${Math.max(1, dosesPerAmpoule)}` : 'Fechada'}
                  </strong>
                  <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {hasActiveAmpoule && currentAmpouleSequence
                      ? `Ampola #${currentAmpouleSequence}${activeAmpouleAgeLabel ? `, ${activeAmpouleAgeLabel}` : ''}.`
                      : 'Nenhuma ampola ativa agora.'}
                  </p>
                </div>
                <div className="progress-track" style={{ marginTop: '0.35rem' }}>
                  <div className="progress-fill" style={{ width: `${currentAmpouleProgress}%` }}></div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Leitura atual</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {hasActiveAmpoule
                  ? activeAmpouleOpenedLabel
                    ? `A ampola atual está aberta desde ${activeAmpouleOpenedLabel} e sincronizada no seu perfil.`
                    : 'A ampola atual está aberta e sincronizada no seu perfil.'
                  : 'Nenhuma ampola está aberta agora. Quando você iniciar a próxima, o painel vai usar essa abertura.'}
              </p>
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.55 }}>
                Cada ampola fica registrada com a data de abertura e, quando houver, a data de encerramento.
              </p>
              {legacyHistoryGap > 0 ? (
                <div className="badge badge-warning" style={{ marginTop: '0.9rem' }}>
                  {legacyHistoryGap} ampola(s) antiga(s) seguem consolidadas sem trilha detalhada.
                </div>
              ) : null}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Histórico por ampola</p>
              {historyEntries.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Ainda não há ampolas com trilha detalhada. Assim que você iniciar a próxima, ela aparece aqui.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {historyEntries.map((entry) => {
                    const isActiveEntry = entry.status === 'active' && entry.id === activeAmpouleRecordId;
                    const isEditingEntry = editingHistoryId === entry.id;
                    const isLatestClosedEntry =
                      entry.status === 'closed' && historyEntries[0]?.id === entry.id;
                    const usedLabel = isActiveEntry
                      ? `${stats.dosesUsedFromCurrentAmpoule}/${entry.dosesPerAmpoule} doses`
                      : entry.dosesUsed !== null
                        ? `${entry.dosesUsed}/${entry.dosesPerAmpoule} doses`
                        : `0/${entry.dosesPerAmpoule} doses`;

                    return (
                      <article
                        key={entry.id}
                        className="glass-panel"
                        style={{ padding: '1rem', background: 'rgba(8, 14, 26, 0.55)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.96rem' }}>
                            Ampola #{entry.sequenceNumber}
                          </strong>
                          <span className={entry.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                            {entry.status === 'active' ? 'Ativa' : 'Fechada'}
                          </span>
                        </div>
                        <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                          Aberta em {formatAmpouleDate(entry.openedOn) ?? entry.openedOn}
                          {entry.closedOn ? ` e fechada em ${formatAmpouleDate(entry.closedOn) ?? entry.closedOn}` : '.'}
                        </p>
                        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          Uso registrado: {usedLabel}
                        </p>
                        {entry.status === 'active' ? (
                          <p style={{ marginTop: '0.45rem', color: 'var(--accent-secondary)', fontSize: '0.78rem' }}>
                            Corrija a data da ampola ativa na seção superior.
                          </p>
                        ) : null}
                        {entry.status === 'closed' ? (
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
                              onClick={() => (isEditingEntry ? resetHistoryEditor() : startHistoryCorrection(entry))}
                              disabled={saving}
                            >
                              {isEditingEntry ? 'Cancelar correção' : 'Corrigir datas'}
                            </button>
                            {!hasActiveAmpoule && isLatestClosedEntry ? (
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
                                onClick={() => void handleReopenHistoryEntry(entry)}
                                disabled={saving}
                              >
                                Reabrir ampola
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {isEditingEntry ? (
                          <div style={{ display: 'grid', gap: '0.7rem', marginTop: '0.85rem' }}>
                            <label style={{ display: 'grid', gap: '0.35rem' }}>
                              <span className="label">Data de abertura</span>
                              <input
                                type="date"
                                value={editingOpenedOn}
                                onChange={(event) => setEditingOpenedOn(event.target.value)}
                                className="input-field"
                                disabled={saving}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.35rem' }}>
                              <span className="label">Data de fechamento</span>
                              <input
                                type="date"
                                value={editingClosedOn}
                                onChange={(event) => setEditingClosedOn(event.target.value)}
                                className="input-field"
                                disabled={saving}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ width: 'fit-content', padding: '0.7rem 1rem', fontSize: '0.82rem' }}
                              onClick={() => void handleSaveHistoryCorrection(entry)}
                              disabled={saving}
                            >
                              {saving ? 'Salvando...' : 'Salvar correção'}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .ampoules-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </ProtectedRoute>
  );
}
