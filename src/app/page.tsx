'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * Interface dos pontos no gráfico de linha SVG
 */
interface ChartPoint {
  weight: number;
  date: string;
  type?: string;
}

/**
 * Dashboard Principal — Exibe métricas de saúde, gráfico de linha SVG
 * e card de volumetria da dose atual.
 */
export default function Home() {
  const { user, signOut } = useAuth();
  
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [predictedDate, setPredictedDate] = useState<string | null>(null);
  const [symptomAlert, setSymptomAlert] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [totalLoss, setTotalLoss] = useState<number>(0);
  const [currentDose, setCurrentDose] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Buscar metas do usuário
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        let target = 0;
        
        if (userData?.targetWeight) {
          setTargetWeight(userData.targetWeight);
          target = userData.targetWeight;
        }

        // Buscar os últimos 10 logs para o gráfico de linha
        const logsRef = collection(db, 'users', user.uid, 'logs');
        const qChart = query(logsRef, orderBy('date', 'desc'), limit(10));
        const chartSnap = await getDocs(qChart);
        
        const points: ChartPoint[] = [];
        let latestDoseLog: { weight: number; date: string; dose?: number; notes?: string } | null = null;
        let prevWeightLog: { weight: number } | null = null;
        
        chartSnap.forEach((d) => {
          const data = d.data();
          points.push({ weight: data.weight, date: data.date, type: data.type || 'dose' });
          
          // Pegar o log mais recente com dose (para a volumetria)
          if (!latestDoseLog && (data.dose || data.type === 'dose')) {
            latestDoseLog = { weight: data.weight, date: data.date, dose: data.dose, notes: data.notes };
          }
        });

        // V4: Cálculo do Streak de Semanas Consistentes
        // Identificar logs apenas de dose, ordenados do mais recente para o mais antigo (points antes de inverter já está DESC)
        const doseLogsDESC = [...points].filter(p => p.type === 'dose');
        let currentStreak = 0;
        if (doseLogsDESC.length > 0) {
          currentStreak = 1;
          for (let i = 0; i < doseLogsDESC.length - 1; i++) {
            const dNew = new Date(doseLogsDESC[i].date).getTime();
            const dOld = new Date(doseLogsDESC[i+1].date).getTime();
            const diffD = (dNew - dOld) / (1000 * 60 * 60 * 24);
            // Tolerância: entre 5 e 10 dias é considerado "consistente" com a janela semanal
            if (diffD >= 5 && diffD <= 10) {
              currentStreak++;
            } else {
              break; // quebrou o streak
            }
          }
        }
        setStreak(currentStreak);

        // V4: Cálculo da Perda Total (para Conquistas)
        if (points.length >= 2) {
          // Último registro (que é o mais antigo na array DESC 'points' original)
          const firstWeight = points[points.length - 1].weight;
          const currentW = points[0].weight; // mais recente
          setTotalLoss(Number((firstWeight - currentW).toFixed(1)));
          
          // Restaurando código para lógica de weeklyChange (diferença semanal)
          prevWeightLog = { weight: points[1].weight };
        }
        
        // Inverte para ordem cronológica (ASC) para o gráfico
        setChartPoints(points.reverse());

        // Dados do registro mais recente (qualquer tipo)
        if (points.length > 0) {
          const latest = points[points.length - 1];
          setCurrentWeight(latest.weight);
          
          // Calcular diferença com o registro anterior
          if (prevWeightLog) {
            const diff = prevWeightLog.weight - latest.weight;
            setWeeklyChange(Number(diff.toFixed(1)));
          }
          
          // Calcular progresso da meta
          if (target > 0 && latest.weight > target) {
            const calc = Math.max(0, Math.min(100, (target / latest.weight) * 100));
            setProgressPercent(Number(calc.toFixed(1)));
          } else if (latest.weight <= target && target > 0) {
            setProgressPercent(100);
          }
        }

        // ==========================================
        // V4: IA Custo Zero (Regressão Linear Mínimos Quadrados)
        // Predição de Peso p/ achar data da Meta
        // ==========================================
        if (target > 0 && points.length >= 3) {
          const n = points.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
          
          points.forEach(p => {
            // Converte a data do registro para 'dias' absolutos para simplificar a matemática
            const x = new Date(p.date).getTime() / (1000 * 60 * 60 * 24);
            const y = p.weight;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
          });

          const meanX = sumX / n;
          const meanY = sumY / n;
          // Coeficiente angular (slope) = variação de peso por dia
          const denominator = (sumXX - n * meanX * meanX);
          const slope = denominator === 0 ? 0 : (sumXY - n * meanX * meanY) / denominator;

          // Só gera predição se houver uma tendência clara de PERDA de peso (slope negativo)
          // e o peso atual ainda for maior que a meta.
          const latestW = points[points.length - 1].weight;
          if (slope < -0.01 && latestW > target) {
            // Equação da reta: Y = slope * X + b => b = meanY - slope * meanX
            // Queremos descobrir o X (dias absolutos) onde Y será = target (meta)
            // X = (Y - b) / slope
            const b = meanY - slope * meanX;
            const targetX = (target - b) / slope;
            
            // Limitando predição bizarra (> 5 anos pra frente)
            const daysFromNow = targetX - (new Date().getTime() / (1000 * 60 * 60 * 24));
            if (daysFromNow > 0 && daysFromNow < 1825) { 
               // Add 12 hours to avoid timezone shift to previous day
               const predictedMs = targetX * (1000 * 60 * 60 * 24) + (12 * 60 * 60 * 1000);
               const dt = new Date(predictedMs);
               // Formata ex: "novembro de 2026"
               setPredictedDate(dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
            }
          }
        }
        
        // Dados da última dose aplicada (para volumetria + dias)
        const doseLog = latestDoseLog as { weight: number; date: string; dose?: number; notes?: string } | null;
        if (doseLog) {
          setCurrentDose(doseLog.dose || null);
          // Tratar timezone para calcular dias EXATOS no calendário local (zero horas)
          const [y, m, d] = doseLog.date.split('T')[0].split('-');
          const logDateLocal = new Date(Number(y), Number(m) - 1, Number(d));
          const todayLocal = new Date();
          todayLocal.setHours(0, 0, 0, 0);

          const diffTime = todayLocal.getTime() - logDateLocal.getTime();
          const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

          setDaysSince(diffDays);
          setDaysUntil(Math.max(0, 7 - diffDays));

          // V4: Insight de Sintomas
          if (doseLog.notes) {
            const notesLower = doseLog.notes.toLowerCase();
            const triggerWords = ['enjoo', 'náusea', 'nausea', 'dor ', 'fadiga', 'cansaço', 'cansaco', 'refluxo', 'azia', 'vômit', 'vomit'];
            const found = triggerWords.filter(w => notesLower.includes(w));
            if (found.length > 0) {
              setSymptomAlert(`Notei sintomas recentes (${found.join(', ')}). Lembre-se de manter a hidratação alta e refeições leves!`);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao puxar os dados", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  const progressBarWidth = daysSince !== null ? Math.min(100, (daysSince / 7) * 100) : 0;
  const isDoseOverdue = progressBarWidth >= 100;

  /**
   * Gera o SVG path "d" para uma curva suave (catmull-rom → bezier)
   * usando os pontos de peso do gráfico
   */
  const generateSmoothPath = (pts: ChartPoint[], width: number, height: number, padding: number) => {
    if (pts.length < 2) return '';
    
    const maxW = Math.max(...pts.map(p => p.weight));
    const minW = Math.min(...pts.map(p => p.weight));
    const range = maxW - minW || 1;
    
    // Converte os pesos para coordenadas X,Y no SVG
    const coords = pts.map((p, i) => ({
      x: padding + (i / (pts.length - 1)) * (width - padding * 2),
      y: padding + (1 - (p.weight - minW) / range) * (height - padding * 2)
    }));

    // Gera curvas bezier suaves entre os pontos
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const cp1x = coords[i].x + (coords[i + 1].x - coords[i].x) / 3;
      const cp1y = coords[i].y;
      const cp2x = coords[i + 1].x - (coords[i + 1].x - coords[i].x) / 3;
      const cp2y = coords[i + 1].y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${coords[i + 1].x},${coords[i + 1].y}`;
    }
    return d;
  };

  /**
   * Gera o path de preenchimento (area fill) abaixo da curva
   */
  const generateFillPath = (pts: ChartPoint[], width: number, height: number, padding: number) => {
    const line = generateSmoothPath(pts, width, height, padding);
    if (!line) return '';
    return `${line} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
  };

  const SVG_W = 600;
  const SVG_H = 200;
  const SVG_PAD = 30;

  /**
   * V4: Gera o Link para o Google Calendar
   */
  const getGoogleCalendarLink = () => {
    if (daysSince === null || daysUntil === null) return '#';
    
    // Calcular a data da próxima dose (Sempre D+7 da última)
    const nextDate = new Date();
    // Ajusta a data de hoje para a data futura baseada no daysUntil (se atrasado, fica hoje mesmo)
    nextDate.setDate(nextDate.getDate() + (isDoseOverdue ? 0 : daysUntil));
    
    // Deixar a hora agendada fixada para as 08:00 AM local
    nextDate.setHours(8, 0, 0, 0);
    const end = new Date(nextDate.getTime() + 15 * 60000); // 15 mins
    
    // Calendar format: YYYYMMDDTHHmmssZ
    const toGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const title = encodeURIComponent("🩸 Aplicação Mounjaro");
    const details = encodeURIComponent(`Lembrete de dose semanal! Registre no MounTrack.`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${toGCalDate(nextDate)}/${toGCalDate(end)}`;
  };
  
  return (
    <ProtectedRoute>
      <main className="container" style={{ position: 'relative' }}>
        {/* ===== DECORAÇÃO HERO DE FUNDO ===== */}
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', opacity: 0.15, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'screen', overflow: 'hidden' }}>
          <Image src="/images/hero-bg.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'top right' }} priority sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, var(--bg-primary) 100%)' }}></div>
        </div>

        {/* ===== HEADER ===== */}
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

        {/* ===== NAVEGAÇÃO ===== */}
        <nav className="anim-enter anim-delay-1" style={{ marginBottom: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/analytics" className="nav-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Relatórios
          </Link>
          <Link href="/goals" className="nav-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Metas
          </Link>
          <Link href="/history" className="nav-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Histórico
          </Link>
          <Link href="/journal" className="nav-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Diário
          </Link>
        </nav>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        {loading ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton-pulse" style={{ height: '180px' }}></div>)}
          </section>
        ) : (
          <>
            {/* V4: ALERTA DE SINTOMAS */}
            {symptomAlert && (
              <div className="anim-enter" style={{ marginBottom: '1.5rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💡</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                  <strong style={{ color: '#EAB308' }}>Insight MounTrack:</strong> <br/>
                  {symptomAlert}
                </p>
              </div>
            )}

            {/* V4: PAINEL DE CONQUISTAS GAMIFICADO */}
            {(streak >= 2 || totalLoss >= 2) && (
              <section className="anim-enter" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {streak >= 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.5))' }}>🔥</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consistência</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{streak} Semanas seguidas</span>
                    </div>
                  </div>
                )}
                {totalLoss >= 2 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}>💎</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marco Atingido</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>-{totalLoss} kg perdidos!</span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ===== GRÁFICO DE LINHA SVG ===== */}
            {chartPoints.length >= 2 && (
              <div className="glass-panel anim-enter anim-delay-1" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p className="stat-label" style={{ marginBottom: 0 }}>Evolução do Peso</p>
                  <Link href="/analytics" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>Ver tudo →</Link>
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
                  {/* Área preenchida abaixo da curva */}
                  <path d={generateFillPath(chartPoints, SVG_W, SVG_H, SVG_PAD)} fill="url(#fillGrad)" />
                  {/* Linha da curva suave */}
                  <path d={generateSmoothPath(chartPoints, SVG_W, SVG_H, SVG_PAD)} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Pontos nos vértices */}
                  {chartPoints.map((p, i) => {
                    const maxW = Math.max(...chartPoints.map(pp => pp.weight));
                    const minW = Math.min(...chartPoints.map(pp => pp.weight));
                    const range = maxW - minW || 1;
                    const cx = SVG_PAD + (i / (chartPoints.length - 1)) * (SVG_W - SVG_PAD * 2);
                    const cy = SVG_PAD + (1 - (p.weight - minW) / range) * (SVG_H - SVG_PAD * 2);
                    const isLast = i === chartPoints.length - 1;
                    return (
                      <g key={i}>
                        {isLast && <circle cx={cx} cy={cy} r="6" fill="var(--accent-primary)" opacity="0.2" />}
                        <circle cx={cx} cy={cy} r={isLast ? 4 : 3} fill={isLast ? 'var(--accent-primary)' : 'var(--bg-tertiary)'} stroke="var(--accent-primary)" strokeWidth="1.5" />
                        {/* Label de peso no primeiro e último ponto */}
                        {(i === 0 || isLast) && (
                          <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontFamily="Outfit" fontWeight="600">{p.weight}</text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* ===== ROW DE CARDS ===== */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Card: Dias desde a última dose */}
              <article className="glass-panel anim-enter anim-delay-2" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Próxima Dose</p>
                <div className="stat-number" style={{ color: isDoseOverdue ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                  {daysSince !== null ? daysSince : '—'}
                  <span className="stat-unit">dias atrás</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${isDoseOverdue ? 'danger' : ''}`} style={{ width: `${progressBarWidth}%` }}></div>
                </div>
                <p style={{ fontSize: '0.75rem', color: isDoseOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {daysUntil !== null && !isDoseOverdue && (
                    <a href={getGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Agendar
                    </a>
                  )}
                  <span>
                    {daysUntil !== null
                      ? (isDoseOverdue ? '⚠ Dose atrasada!' : `Em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`)
                      : 'Registre uma dose'}
                  </span>
                </p>
              </article>

              {/* Card: Dose Atual (Volumetria) */}
              <article className="glass-panel anim-enter anim-delay-2" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Dose em Uso</p>
                <div className="stat-number" style={{ color: 'var(--accent-primary)' }}>
                  {currentDose !== null ? currentDose.toFixed(1) : '—'}
                  <span className="stat-unit">mg</span>
                </div>
                {/* Barra visual de volumetria — escala de 2.5 a 15mg */}
                {currentDose !== null && (
                  <>
                    <div className="progress-track" style={{ marginTop: '1rem' }}>
                      <div className="progress-fill" style={{ width: `${((currentDose - 2.5) / (15 - 2.5)) * 100}%` }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>2.5 mg</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>15 mg</span>
                    </div>
                  </>
                )}
              </article>

              {/* Card: Peso Atual */}
              <article className="glass-panel anim-enter anim-delay-3" style={{ padding: '1.75rem' }}>
                <p className="stat-label">Peso Atual</p>
                <div className="stat-number">
                  {currentWeight !== null ? currentWeight : '—'}
                  <span className="stat-unit">kg</span>
                </div>
                {weeklyChange !== null && weeklyChange > 0 && (
                  <span className="badge badge-success" style={{ marginTop: '0.75rem' }}>▼ {weeklyChange} kg</span>
                )}
                {weeklyChange !== null && weeklyChange <= 0 && (
                  <span className="badge badge-warning" style={{ marginTop: '0.75rem' }}>▲ {Math.abs(weeklyChange)} kg</span>
                )}
              </article>

              {/* Card: Progresso da Meta */}
              <article className="glass-panel anim-enter anim-delay-4" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                {progressPercent >= 100 && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.08), transparent 70%)', zIndex: 0 }}></div>}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <p className="stat-label">Meta</p>
                  <div className="stat-number" style={{ color: progressPercent >= 100 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {targetWeight ? `${progressPercent}` : '—'}
                    <span className="stat-unit">{targetWeight ? '%' : ''}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                    {targetWeight
                      ? `Alvo: ${targetWeight} kg`
                      : <Link href="/goals" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Definir meta →</Link>
                    }
                  </p>
                  
                  {/* V4 - Insight Determinístico */}
                  <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    {predictedDate && progressPercent < 100 && (
                      <div className="anim-enter anim-delay-5" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '1rem' }}>✨</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <strong style={{ color: 'var(--accent-secondary)' }}>Previsão IA:</strong><br />
                          No seu ritmo atual, você atingirá a meta em <b>{predictedDate}</b>.
                        </div>
                      </div>
                    )}
                    {progressPercent >= 100 && (
                      <div className="anim-enter anim-delay-5" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
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
      </main>
    </ProtectedRoute>
  );
}
