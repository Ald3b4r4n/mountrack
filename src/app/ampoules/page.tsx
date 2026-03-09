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
  loadAmpouleSettingsWithUserFallback,
  saveAmpouleSettings,
} from '@/modules/dashboard/ampoule-settings';
import type { DashboardLogSummary } from '@/modules/dashboard/utils';

export default function AmpoulesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dosesPerAmpoule, setDosesPerAmpoule] = useState(DEFAULT_DOSES_PER_AMPOULE);
  const [previousDoseApplications, setPreviousDoseApplications] = useState(0);
  const [logSummaries, setLogSummaries] = useState<DashboardLogSummary[]>([]);

  useEffect(() => {
    async function loadAmpouleSettings() {
      if (!user) return;

      try {
        const settings = await loadAmpouleSettingsWithUserFallback(user.uid);

        setDosesPerAmpoule(settings.dosesPerAmpoule);
        setPreviousDoseApplications(settings.previousDoseApplications);

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

    void loadAmpouleSettings();
  }, [user]);

  const loggedDoseApplications = useMemo(
    () => logSummaries.filter((log) => Boolean(log.dose) || log.type === 'dose').length,
    [logSummaries],
  );

  const stats = useMemo(
    () =>
      calculateJourneyDoseStats(
        logSummaries,
        new Date(),
        dosesPerAmpoule,
        previousDoseApplications,
      ),
    [dosesPerAmpoule, logSummaries, previousDoseApplications],
  );

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
    try {
      const savedSettings = await saveAmpouleSettings(user.uid, {
        dosesPerAmpoule: normalizedDosesPerAmpoule,
        previousDoseApplications: normalizedPreviousDoseApplications,
      });

      setDosesPerAmpoule(savedSettings.dosesPerAmpoule);
      setPreviousDoseApplications(savedSettings.previousDoseApplications);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Erro ao salvar configuracao de ampola', error);
      alert('Nao foi possivel salvar a configuracao da ampola.');
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
              Voltar ao Dashboard
            </Link>
            <h1 className="glow-text" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Ampolas</h1>
            <p className="page-subtitle">
              Ajuste o tamanho da ampola e carregue doses anteriores ao app sem poluir o dashboard.
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
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Configuracao da ampola</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Defina quantas doses cabem na sua ampola atual. Se voce ja aplicava antes de usar o app,
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
                  {saving ? 'Salvando...' : saved ? 'Calculo salvo' : 'Salvar configuracao'}
                </button>
                {saved && <span className="badge badge-success">Atualizado no seu perfil</span>}
              </div>
            </form>
          </section>

          <aside style={{ display: 'grid', gap: '1rem' }} className="anim-enter anim-delay-2">
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Impacto no dashboard</p>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ampolas usadas</span>
                  <strong style={{ fontSize: '1.7rem', color: 'var(--text-primary)' }}>{stats.ampoulesUsed}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ampola atual</span>
                  <strong style={{ fontSize: '1.7rem', color: 'var(--accent-secondary)' }}>
                    {stats.dosesUsedFromCurrentAmpoule}
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {Math.max(1, dosesPerAmpoule)}</span>
                  </strong>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p className="stat-label" style={{ marginBottom: '0.7rem' }}>Leitura atual</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                O card <strong style={{ color: 'var(--text-primary)' }}>Ampolas Usadas</strong> passa a considerar
                apenas a sua configuracao salva aqui, sem assumir um tamanho fixo de ampola.
              </p>
            </div>
          </aside>
        </div>

        <style jsx>{`
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
