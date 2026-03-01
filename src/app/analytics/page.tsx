'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

/**
 * Interface para os dados de cada log no Firestore
 */
interface LogData {
  id: string;
  weight: number;
  dose: number;
  date: string;
  type?: string;
}

/**
 * Página de Relatórios Analíticos — Gráfico de linha SVG suave
 * com curvas bezier, gradient fill, métricas resumo e timeline de doses.
 */
export default function Analytics() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [avgWeeklyLoss, setAvgWeeklyLoss] = useState<number>(0);
  const [currentDose, setCurrentDose] = useState<number>(0);
  const [totalLoss, setTotalLoss] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;
      try {
        const logsRef = collection(db, 'users', user.uid, 'logs');
        const q = query(logsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedLogs: LogData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push({ id: doc.id, ...doc.data() } as LogData);
        });

        setLogs(fetchedLogs);

        if (fetchedLogs.length > 0) {
          // Pegar a dose mais recente (registros do tipo dose)
          const doseLogs = fetchedLogs.filter(l => l.dose || l.type === 'dose');
          if (doseLogs.length > 0) {
            setCurrentDose(doseLogs[doseLogs.length - 1].dose);
          }
           
          if (fetchedLogs.length >= 2) {
            const firstLog = fetchedLogs[0];
            const latestLog = fetchedLogs[fetchedLogs.length - 1];
            const weightDiff = firstLog.weight - latestLog.weight;
            setTotalLoss(Number(weightDiff.toFixed(1)));
            
            const d1 = new Date(firstLog.date + 'T12:00:00');
            const d2 = new Date(latestLog.date + 'T12:00:00');
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            let diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
            if (diffWeeks < 1) diffWeeks = 1;
            
            const avgLoss = weightDiff / diffWeeks;
            setAvgWeeklyLoss(avgLoss > 0 ? Number(avgLoss.toFixed(2)) : 0);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar Analytics", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [user]);

  // Pega os últimos 12 registros para o gráfico
  const chartLogs = logs.slice(Math.max(logs.length - 12, 0));

  // Dimensões do SVG viewBox
  const SVG_W = 700;
  const SVG_H = 260;
  const PAD_X = 50;
  const PAD_TOP = 30;
  const PAD_BOTTOM = 45;

  /**
   * Gera curva bezier suave a partir dos pontos de peso
   */
  const generateSmoothPath = () => {
    if (chartLogs.length < 2) return '';
    const maxW = Math.max(...chartLogs.map(p => p.weight));
    const minW = Math.min(...chartLogs.map(p => p.weight));
    const range = maxW - minW || 1;

    const coords = chartLogs.map((p, i) => ({
      x: PAD_X + (i / (chartLogs.length - 1)) * (SVG_W - PAD_X * 2),
      y: PAD_TOP + (1 - (p.weight - minW) / range) * (SVG_H - PAD_TOP - PAD_BOTTOM)
    }));

    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const tension = 0.35;
      const cp1x = coords[i].x + (coords[i + 1].x - coords[i].x) * tension;
      const cp1y = coords[i].y;
      const cp2x = coords[i + 1].x - (coords[i + 1].x - coords[i].x) * tension;
      const cp2y = coords[i + 1].y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${coords[i + 1].x},${coords[i + 1].y}`;
    }
    return d;
  };

  /**
   * Gera o path de preenchimento (area fill) abaixo da curva
   */
  const generateFillPath = () => {
    const line = generateSmoothPath();
    if (!line) return '';
    const startX = PAD_X;
    const endX = PAD_X + ((chartLogs.length - 1) / (chartLogs.length - 1)) * (SVG_W - PAD_X * 2);
    const bottomY = SVG_H - PAD_BOTTOM;
    return `${line} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
  };

  /**
   * Calcula as coordenadas de cada ponto no SVG
   */
  const getPointCoords = () => {
    if (chartLogs.length < 2) return [];
    const maxW = Math.max(...chartLogs.map(p => p.weight));
    const minW = Math.min(...chartLogs.map(p => p.weight));
    const range = maxW - minW || 1;

    return chartLogs.map((p, i) => ({
      x: PAD_X + (i / (chartLogs.length - 1)) * (SVG_W - PAD_X * 2),
      y: PAD_TOP + (1 - (p.weight - minW) / range) * (SVG_H - PAD_TOP - PAD_BOTTOM),
      weight: p.weight,
      date: p.date,
      dose: p.dose,
      type: p.type,
      isLast: i === chartLogs.length - 1,
      isFirst: i === 0
    }));
  };

  // Dados para as linhas de grade horizontais
  const maxW = chartLogs.length > 0 ? Math.max(...chartLogs.map(l => l.weight)) : 100;
  const minW = chartLogs.length > 0 ? Math.min(...chartLogs.map(l => l.weight)) : 80;
  const gridLines = chartLogs.length >= 2 ? [minW, minW + (maxW - minW) * 0.5, maxW] : [];
  const range = maxW - minW || 1;
  
  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '1000px', paddingTop: '3rem', position: 'relative' }}>
        
        {/* Imagem decorativa de fundo da jornada */}
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', opacity: 0.25, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'screen', overflow: 'hidden' }}>
          <Image src="/images/analytics-empty.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center center' }} priority sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11, 17, 32, 0.4) 0%, var(--bg-primary) 100%)' }}></div>
        </div>

        <header className="anim-enter" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <Logo size="md" />
            <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>Acompanhe sua evolução de peso e dosagem.</p>
          </div>
          <Link href="/" className="nav-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </Link>
        </header>
        
        {/* ===== GRÁFICO DE LINHA SVG SUAVE ===== */}
        <div className="glass-panel anim-enter anim-delay-1" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
            Evolução do Peso
          </h2>
          
          {loading ? (
            <div className="skeleton-pulse" style={{ height: '280px' }}></div>
          ) : chartLogs.length >= 2 ? (
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              <defs>
                {/* Gradiente da linha — esmeralda para ciano */}
                <linearGradient id="lineGradAnalytics" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
                {/* Gradiente do preenchimento abaixo da curva */}
                <linearGradient id="fillGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.01" />
                </linearGradient>
                {/* Glow filter para o último ponto */}
                <filter id="dotGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Linhas de grade horizontais */}
              {gridLines.map((val, i) => {
                const y = PAD_TOP + (1 - (val - minW) / range) * (SVG_H - PAD_TOP - PAD_BOTTOM);
                return (
                  <g key={i}>
                    <line x1={PAD_X} y1={y} x2={SVG_W - PAD_X} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <text x={PAD_X - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="DM Sans">{val.toFixed(1)}</text>
                  </g>
                );
              })}

              {/* Preenchimento abaixo da curva */}
              <path d={generateFillPath()} fill="url(#fillGradAnalytics)" />

              {/* Linha da curva suave */}
              <path d={generateSmoothPath()} fill="none" stroke="url(#lineGradAnalytics)" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Pontos nos vértices e labels */}
              {getPointCoords().map((pt, i) => (
                <g key={i}>
                  {/* Halo no último ponto */}
                  {pt.isLast && <circle cx={pt.x} cy={pt.y} r="8" fill="var(--accent-primary)" opacity="0.15" filter="url(#dotGlow)" />}
                  
                  {/* Ponto do vértice */}
                  <circle cx={pt.x} cy={pt.y} r={pt.isLast ? 4.5 : 3} fill={pt.isLast ? 'var(--accent-primary)' : 'var(--bg-tertiary)'} stroke={pt.dose ? 'var(--accent-primary)' : 'var(--accent-secondary)'} strokeWidth="1.5" />
                  
                  {/* Label de peso nos pontos chave */}
                  {(pt.isFirst || pt.isLast || i % Math.max(1, Math.floor(chartLogs.length / 4)) === 0) && (
                    <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontFamily="Outfit" fontWeight="600">{pt.weight}</text>
                  )}
                  
                  {/* Data abaixo do eixo X */}
                  <text x={pt.x} y={SVG_H - PAD_BOTTOM + 16} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans">
                    {new Date(pt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </text>
                </g>
              ))}
            </svg>
          ) : chartLogs.length === 1 ? (
            /* Se tem apenas 1 registro, mostrar dado único central */
            <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="stat-number" style={{ fontSize: '3rem', color: 'var(--accent-primary)' }}>
                {chartLogs[0].weight}<span className="stat-unit">kg</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Registrado em {new Date(chartLogs[0].date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Adicione mais registros para ver o gráfico de evolução.</p>
            </div>
          ) : (
            <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Image src="/images/analytics-empty.png" alt="Ilustração de gráfico" width={180} height={135} style={{ opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)' }}>Cadastre seu primeiro registro para ver os gráficos.</p>
            </div>
          )}
        </div>

        {/* ===== MÉTRICAS RESUMO ===== */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel anim-enter anim-delay-2" style={{ padding: '1.75rem' }}>
            <p className="stat-label">Média Semanal</p>
            <p className="stat-number" style={{ fontSize: '2.25rem', color: 'var(--accent-primary)' }}>{avgWeeklyLoss}<span className="stat-unit">kg</span></p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Perda média por semana</p>
          </div>
          
          <div className="glass-panel anim-enter anim-delay-3" style={{ padding: '1.75rem' }}>
            <p className="stat-label">Perda Total</p>
            <p className="stat-number" style={{ fontSize: '2.25rem', color: totalLoss > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{totalLoss}<span className="stat-unit">kg</span></p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Desde o primeiro registro</p>
          </div>
          
          <div className="glass-panel anim-enter anim-delay-4" style={{ padding: '1.75rem' }}>
            <p className="stat-label">Dose Atual</p>
            <p className="stat-number" style={{ fontSize: '2.25rem' }}>{currentDose > 0 ? currentDose.toFixed(1) : '—'}<span className="stat-unit">mg</span></p>
            {currentDose > 0 && <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>Ativa</span>}
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
