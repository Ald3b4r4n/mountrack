'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  DEFAULT_DOSES_PER_AMPOULE,
  buildGoogleCalendarLink,
  calculateDoseCountdown,
  calculateJourneyDoseStats,
  formatChartDateLabel,
  generateAreaFillPath,
  generateSmoothSvgPath,
  getChartDateLabelIndices,
} from '@/modules/dashboard/utils';
import { loadAmpouleSettings } from '@/modules/dashboard/ampoule-settings';
import type { DashboardLogSummary } from '@/modules/dashboard/utils';

interface ChartPoint {
  weight: number;
  date: string;
  type?: string;
}

export default function Home() {
  const { user, signOut } = useAuth();
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [predictedDate, setPredictedDate] = useState<string | null>(null);
  const [symptomAlert, setSymptomAlert] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0);
  const [currentDoseState, setCurrentDose] = useState<number | null>(null);
  const [weeklyChangeState, setWeeklyChange] = useState<number | null>(null);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [journeyDays, setJourneyDays] = useState<number | null>(null);
  const [ampoulesUsed, setAmpoulesUsed] = useState(0);
  const [dosesUsedFromCurrentAmpoule, setDosesUsedFromCurrentAmpoule] = useState(0);
  const [lastDoseDate, setLastDoseDate] = useState<string | null>(null);
  const [nextDoseTarget, setNextDoseTarget] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [logSummaries, setLogSummaries] = useState<DashboardLogSummary[]>([]);
  const [dosesPerAmpoule, setDosesPerAmpoule] = useState(DEFAULT_DOSES_PER_AMPOULE);
  const [previousDoseApplications, setPreviousDoseApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentDose = currentDoseState as number;
  const weeklyChange = weeklyChangeState as number;

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const target = typeof userData?.targetWeight === 'number' ? userData.targetWeight : 0;
        const ampouleSettings = await loadAmpouleSettings(user.uid, userData);
        setTargetWeight(target || null);
        setDosesPerAmpoule(ampouleSettings.dosesPerAmpoule);
        setPreviousDoseApplications(ampouleSettings.previousDoseApplications);

        const logsRef = collection(db, 'users', user.uid, 'logs');
        const snapshot = await getDocs(query(logsRef, orderBy('date', 'desc')));
        const allLogs: DashboardLogSummary[] = [];
        const points: ChartPoint[] = [];
        let latestDoseLog: { weight: number; date: string; dose?: number; notes?: string } | null = null;

        snapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          allLogs.push({ date: data.date, type: data.type, dose: data.dose });
          if (data.weight !== undefined && data.type !== 'note') {
            points.push({ weight: data.weight, date: data.date, type: data.type || 'dose' });
          }
          if (!latestDoseLog && (data.dose || data.type === 'dose')) {
            latestDoseLog = { weight: data.weight, date: data.date, dose: data.dose, notes: data.notes };
          }
        });
        setLogSummaries(allLogs);

        const doseLogs = allLogs.filter((log) => Boolean(log.dose) || log.type === 'dose');
        let currentStreak = 0;
        if (doseLogs.length > 0) {
          currentStreak = 1;
          for (let index = 0; index < doseLogs.length - 1; index += 1) {
            const currentDate = new Date(doseLogs[index].date).getTime();
            const previousDate = new Date(doseLogs[index + 1].date).getTime();
            const diffDays = (currentDate - previousDate) / (1000 * 60 * 60 * 24);
            if (diffDays >= 5 && diffDays <= 10) currentStreak += 1;
            else break;
          }
        }
        setStreak(currentStreak);

        if (points.length >= 2) {
          setTotalLoss(Number((points[points.length - 1].weight - points[0].weight).toFixed(1)));
          setWeeklyChange(Number((points[1].weight - points[0].weight).toFixed(1)));
        } else {
          setTotalLoss(0);
          setWeeklyChange(null);
        }

        setChartPoints(points.slice(0, 10).reverse());

        if (points.length > 0) {
          const latest = points[0];
          setCurrentWeight(latest.weight);
          if (target > 0 && latest.weight > target) {
            setProgressPercent(Number(Math.max(0, Math.min(100, (target / latest.weight) * 100)).toFixed(1)));
          } else if (target > 0 && latest.weight <= target) {
            setProgressPercent(100);
          } else {
            setProgressPercent(0);
          }
        } else {
          setCurrentWeight(null);
          setProgressPercent(0);
        }

        if (target > 0 && points.length >= 3) {
          const n = points.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
          points.forEach((point) => {
            const x = new Date(point.date).getTime() / (1000 * 60 * 60 * 24);
            sumX += x; sumY += point.weight; sumXY += x * point.weight; sumXX += x * x;
          });
          const meanX = sumX / n;
          const meanY = sumY / n;
          const denominator = sumXX - n * meanX * meanX;
          const slope = denominator === 0 ? 0 : (sumXY - n * meanX * meanY) / denominator;
          if (slope < -0.01 && points[0].weight > target) {
            const b = meanY - slope * meanX;
            const targetX = (target - b) / slope;
            const daysFromNow = targetX - new Date().getTime() / (1000 * 60 * 60 * 24);
            if (daysFromNow > 0 && daysFromNow < 1825) {
              const predicted = new Date(targetX * (1000 * 60 * 60 * 24) + 12 * 60 * 60 * 1000);
              setPredictedDate(predicted.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
            } else setPredictedDate(null);
          } else setPredictedDate(null);
        } else setPredictedDate(null);

        const doseLog = latestDoseLog as { weight: number; date: string; dose?: number; notes?: string } | null;

        if (doseLog) {
          setCurrentDose(doseLog.dose || null);
          const [year, month, day] = doseLog.date.split('T')[0].split('-');
          const logDateLocal = new Date(Number(year), Number(month) - 1, Number(day));
          const todayLocal = new Date();
          todayLocal.setHours(0, 0, 0, 0);
          const diffDays = Math.max(0, Math.round((todayLocal.getTime() - logDateLocal.getTime()) / (1000 * 60 * 60 * 24)));
          setDaysSince(diffDays);
          setDaysUntil(Math.max(0, 7 - diffDays));
          setLastDoseDate(logDateLocal.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
          const nextDose = new Date(logDateLocal);
          nextDose.setDate(nextDose.getDate() + 7);
          nextDose.setHours(8, 0, 0, 0);
          setNextDoseTarget(nextDose);
          if (doseLog.notes) {
            const notesLower = doseLog.notes.toLowerCase();
            const triggerWords = ['enjoo', 'náusea', 'nausea', 'dor ', 'fadiga', 'cansaço', 'cansaco', 'refluxo', 'azia', 'vômit', 'vomit'];
            const found = triggerWords.filter((word) => notesLower.includes(word));
            setSymptomAlert(found.length > 0 ? `Notei sintomas recentes (${found.join(', ')}). Lembre-se de manter a hidratação alta e refeições leves!` : null);
          } else setSymptomAlert(null);
        } else {
          setCurrentDose(null); setDaysSince(null); setDaysUntil(null); setLastDoseDate(null); setNextDoseTarget(null); setCountdown(null); setSymptomAlert(null);
        }
      } catch (error) {
        console.error('Erro ao puxar os dados', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [user]);

  useEffect(() => {
    if (!nextDoseTarget) return;
    const target = nextDoseTarget;
    function tick() { setCountdown(calculateDoseCountdown(target)); }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextDoseTarget]);

  useEffect(() => {
    const stats = calculateJourneyDoseStats(
      logSummaries,
      new Date(),
      dosesPerAmpoule,
      previousDoseApplications,
    );

    setJourneyDays(stats.journeyDays);
    setAmpoulesUsed(stats.ampoulesUsed);
    setDosesUsedFromCurrentAmpoule(stats.dosesUsedFromCurrentAmpoule);
  }, [dosesPerAmpoule, logSummaries, previousDoseApplications]);

  const SVG_W = 600;
  const SVG_H = 260;
  const SVG_PAD = 40;
  const progressBarWidth = daysSince !== null ? Math.min(100, (daysSince / 7) * 100) : 0;
  const isDoseOverdue = progressBarWidth >= 100;
  const overdueDays = daysSince !== null ? Math.max(0, daysSince - 7) : 0;
  const doseUsagePercent = currentDose !== null ? ((currentDose - 2.5) / (15 - 2.5)) * 100 : 0;
  const currentAmpouleProgress =
    dosesPerAmpoule > 0 ? (dosesUsedFromCurrentAmpoule / dosesPerAmpoule) * 100 : 0;
  const chartDateLabelIndices = getChartDateLabelIndices(chartPoints.length);
  const chartMaxWeight = chartPoints.length > 0 ? Math.max(...chartPoints.map((point) => point.weight)) : 0;
  const chartMinWeight = chartPoints.length > 0 ? Math.min(...chartPoints.map((point) => point.weight)) : 0;
  const chartWeightRange = chartMaxWeight - chartMinWeight || 1;
  const nextDoseCalendarLink = daysUntil !== null ? buildGoogleCalendarLink({ daysUntil, isDoseOverdue, title: '🩸 Aplicação Mounjaro', details: 'Lembrete de dose semanal! Registre no MounTrack.' }) : '#';
  return (
    <ProtectedRoute>
      <main className="container" style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', opacity: 0.15, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'screen', overflow: 'hidden' }}>
          <Image src="/images/hero-bg.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'top right' }} priority sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, var(--bg-primary) 100%)' }}></div>
        </div>

        <header className="anim-enter" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <Logo size="lg" />
            <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>Bem-vindo, {user?.displayName?.split(' ')[0] || 'usuário'}.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/log" className="btn-primary" style={{ textDecoration: 'none' }}>+ Novo Registro</Link>
            <button onClick={signOut} className="btn-outline">Sair</button>
          </div>
        </header>

        <nav className="anim-enter anim-delay-1" style={{ marginBottom: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/analytics" className="nav-pill">Relatórios</Link>
          <Link href="/goals" className="nav-pill">Metas</Link>
          <Link href="/history" className="nav-pill">Histórico</Link>
          <Link href="/journal" className="nav-pill">Diário</Link>
          <Link href="/expenses" className="nav-pill">Gastos</Link>
          <Link href="/nutrition" className="nav-pill">Nutrição</Link>
          <Link href="/ampoules" className="nav-pill">Ampolas</Link>
        </nav>

        {loading ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="skeleton-pulse" style={{ height: '180px' }}></div>)}
          </section>
        ) : (
          <>
            {symptomAlert && (
              <div className="anim-enter" style={{ marginBottom: '1.5rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💡</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                  <strong style={{ color: '#EAB308' }}>Insight MounTrack:</strong><br />
                  {symptomAlert}
                </p>
              </div>
            )}

            {(streak >= 2 || totalLoss >= 2) && (
              <section className="anim-enter" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {streak >= 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔥</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consistência</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{streak} semanas seguidas</span>
                    </div>
                  </div>
                )}
                {totalLoss >= 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>💎</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marco atingido</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>-{totalLoss} kg perdidos</span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {chartPoints.length >= 2 && (
              <div className="glass-panel anim-enter anim-delay-1" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p className="stat-label" style={{ marginBottom: 0 }}>Evolução do Peso</p>
                    <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Datas mapeadas diretamente na linha de progresso
                    </p>
                  </div>
                  <Link href="/analytics" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
                    Ver tudo →
                  </Link>
                </div>
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent-primary)" />
                      <stop offset="100%" stopColor="var(--accent-secondary)" />
                    </linearGradient>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <line x1={SVG_PAD} x2={SVG_W - SVG_PAD} y1={SVG_H - SVG_PAD + 10} y2={SVG_H - SVG_PAD + 10} stroke="rgba(148, 163, 184, 0.16)" strokeWidth="1" />
                  <path d={generateAreaFillPath(chartPoints, SVG_W, SVG_H, SVG_PAD)} fill="url(#fillGrad)" />
                  <path d={generateSmoothSvgPath(chartPoints, SVG_W, SVG_H, SVG_PAD)} fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" />

                  {chartPoints.map((point, index) => {
                    const cx = SVG_PAD + (index / (chartPoints.length - 1)) * (SVG_W - SVG_PAD * 2);
                    const cy = SVG_PAD + (1 - (point.weight - chartMinWeight) / chartWeightRange) * (SVG_H - SVG_PAD * 2);
                    const isLast = index === chartPoints.length - 1;
                    const showDateLabel = chartDateLabelIndices.includes(index);

                    return (
                      <g key={`${point.date}-${point.weight}`}>
                        {isLast && <circle cx={cx} cy={cy} r="14" fill="var(--accent-primary)" opacity="0.2" />}
                        <circle cx={cx} cy={cy} r={isLast ? 6 : 4} fill={isLast ? 'var(--accent-primary)' : 'var(--bg-tertiary)'} stroke="var(--accent-primary)" strokeWidth="2" />
                        {(index === 0 || isLast) && (
                          <text x={cx} y={cy - 14} textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontFamily="Outfit" fontWeight="600">
                            {point.weight}
                          </text>
                        )}
                        {showDateLabel && (
                          <>
                            <line
                              x1={cx}
                              x2={cx}
                              y1={SVG_H - SVG_PAD + 10}
                              y2={SVG_H - SVG_PAD + 16 + ((index % 2) * 8)}
                              stroke="rgba(52, 211, 153, 0.35)"
                              strokeWidth="1.5"
                            />
                            <text
                              x={cx}
                              y={SVG_H - 8 + ((index % 2) * 8)}
                              textAnchor="middle"
                              fill="var(--text-muted)"
                              fontSize="10"
                              fontFamily="IBM Plex Mono, monospace"
                            >
                              {formatChartDateLabel(point.date)}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}


            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <article className="glass-panel anim-enter anim-delay-2" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Próxima Dose</p>
                {daysUntil !== null ? (
                  <div className="stat-number" style={{ color: isDoseOverdue ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                    {isDoseOverdue ? overdueDays : daysUntil}
                    <span className="stat-unit">
                      {isDoseOverdue ? `dia${overdueDays !== 1 ? 's' : ''} de atraso` : `dia${daysUntil !== 1 ? 's' : ''} restante${daysUntil !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                ) : (
                  <div className="stat-number">—<span className="stat-unit">sem registro</span></div>
                )}

                {countdown && !isDoseOverdue && (
                  <div style={{ marginTop: '0.5rem', textAlign: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-secondary)', letterSpacing: '0.06em' }}>
                    {String(countdown.d).padStart(2, '0')}d {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                  </div>
                )}

                <div className="progress-track" style={{ marginTop: '0.9rem' }}>
                  <div className={`progress-fill ${isDoseOverdue ? 'danger' : ''}`} style={{ width: `${progressBarWidth}%` }}></div>
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lastDoseDate ? `Última: ${lastDoseDate}` : 'Registre a primeira dose'}
                  </span>
                  {daysUntil !== null && (
                    <span style={{ fontSize: '0.72rem', color: isDoseOverdue ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                      {isDoseOverdue ? 'Dose pendente agora' : 'Janela semanal ativa'}
                    </span>
                  )}
                </div>

                {daysUntil !== null ? (
                  <a href={nextDoseCalendarLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', width: 'fit-content', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.6rem 1rem', fontSize: '0.82rem' }}>
                    Agendar próxima dose
                  </a>
                ) : (
                  <Link href="/log" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', width: 'fit-content', justifyContent: 'center', textDecoration: 'none', padding: '0.6rem 1rem', fontSize: '0.82rem' }}>
                    Registrar dose
                  </Link>
                )}
              </article>

              <article className="glass-panel anim-enter anim-delay-2" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Dose em Uso</p>
                <div className="stat-number" style={{ color: 'var(--accent-primary)' }}>
                  {currentDose !== null ? currentDose.toFixed(1) : '—'}
                  <span className="stat-unit">mg</span>
                </div>
                {currentDose !== null ? (
                  <>
                    <div className="progress-track" style={{ marginTop: '1rem' }}>
                      <div className="progress-fill" style={{ width: `${doseUsagePercent}%` }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>2.5 mg</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>15 mg</span>
                    </div>
                  </>
                ) : (
                  <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Ainda sem dose registrada.</p>
                )}
              </article>

              <article className="glass-panel anim-enter anim-delay-3 ampoules-used-card" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Dias de Jornada</p>
                <div className="stat-number">
                  {journeyDays !== null ? journeyDays : '—'}
                  <span className="stat-unit">dias</span>
                </div>
                <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Desde o primeiro registro da sua jornada.</p>
              </article>

              <article className="glass-panel anim-enter anim-delay-3 ampoules-used-card" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Ampolas Usadas</p>
                <div className="stat-number">
                  {ampoulesUsed}
                  <span className="stat-unit">ampolas</span>
                </div>
                <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Ajustado pela sua configuracao atual de ampola.</p>
              </article>

              <article className="glass-panel anim-enter anim-delay-4" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Ampola Atual</p>
                <div className="stat-number" style={{ color: 'var(--accent-secondary)' }}>
                  {dosesUsedFromCurrentAmpoule}
                  <span className="stat-unit">de {dosesPerAmpoule} doses</span>
                </div>
                <div className="progress-track" style={{ marginTop: '1rem' }}>
                  <div className="progress-fill" style={{ width: `${currentAmpouleProgress}%` }}></div>
                </div>
                <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Doses já usadas da ampola atual.</p>
              </article>

              <article className="glass-panel anim-enter anim-delay-4" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Peso Atual</p>
                <div className="stat-number">
                  {currentWeight !== null ? currentWeight : '—'}
                  <span className="stat-unit">kg</span>
                </div>
                {weeklyChange !== null && weeklyChange > 0 && <span className="badge badge-success" style={{ marginTop: '0.75rem' }}>▼ {weeklyChange} kg</span>}
                {weeklyChange !== null && weeklyChange <= 0 && <span className="badge badge-warning" style={{ marginTop: '0.75rem' }}>▲ {Math.abs(weeklyChange)} kg</span>}
              </article>

              <article className="glass-panel anim-enter anim-delay-4" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                {progressPercent >= 100 && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.08), transparent 70%)', zIndex: 0 }}></div>}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <p className="stat-label">Meta</p>
                  <div className="stat-number" style={{ color: progressPercent >= 100 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {targetWeight ? `${progressPercent}` : '—'}
                    <span className="stat-unit">{targetWeight ? '%' : ''}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                    {targetWeight ? `Alvo: ${targetWeight} kg` : <Link href="/goals" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Definir meta →</Link>}
                  </p>
                  <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    {predictedDate && progressPercent < 100 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '1rem' }}>✨</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <strong style={{ color: 'var(--accent-secondary)' }}>Previsão IA:</strong><br />
                          No seu ritmo atual, você atingirá a meta em <b>{predictedDate}</b>.
                        </div>
                      </div>
                    )}
                    {progressPercent >= 100 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '1rem' }}>🏆</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <strong style={{ color: 'var(--accent-primary)' }}>Parabéns!</strong><br />
                          Você já atingiu sua meta de peso inicial.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </section>
          </>
        )}

        <style>{`

          .ampoules-used-card > p:last-of-type {
            display: none;
          }

        `}</style>
      </main>
    </ProtectedRoute>
  );
}
