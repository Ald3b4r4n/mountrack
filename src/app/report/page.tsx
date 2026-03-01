'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

interface LogEntry {
  id: string;
  date: string;
  weight: number;
  dose?: number;
  notes?: string;
  type: string;
}

export default function ReportPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().targetWeight) {
          setTargetWeight(userDoc.data().targetWeight);
        }

        const logsRef = collection(db, 'users', user.uid, 'logs');
        const qLogs = query(logsRef, orderBy('date', 'desc'));
        const snap = await getDocs(qLogs);
        
        const fetchedLogs: LogEntry[] = [];
        snap.forEach(d => {
          fetchedLogs.push({ id: d.id, ...d.data() } as LogEntry);
        });
        
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Erro ao gerar relatório", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  if (!user || loading) {
    return (
      <main className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="skeleton-pulse" style={{ width: '100px', height: '100px', borderRadius: '50%' }}></div>
      </main>
    );
  }

  // Cálculos Básicos pro Header do Relatório
  const firstLog = logs[logs.length - 1];
  const lastLog = logs[0];
  const totalLost = firstLog && lastLog ? (firstLog.weight - lastLog.weight).toFixed(1) : 0;
  
  return (
    <ProtectedRoute>
      <main className="container" style={{ position: 'relative', marginTop: '2rem' }}>
        
        {/* Botões de Ação (Apenas em tela, ocultos na impressão) */}
        <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/history" className="btn-outline">← Voltar</Link>
          <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Salvar como PDF / Imprimir
          </button>
        </div>

        {/* CABEÇALHO DO LAUDO MEDICO */}
        <header className="glass-panel" style={{ borderBottom: '2px solid var(--accent-primary)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Logo size="md" />
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Relatório de Acompanhamento - Mounjaro</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>{user.displayName}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </header>

        {/* RESUMO CLINICO */}
        <section className="glass-panel" style={{ borderRadius: 0, borderTop: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Peso Inicial</span>
            <strong style={{ fontSize: '1.25rem' }}>{firstLog?.weight ?? '—'} kg</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Peso Atual</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>{lastLog?.weight ?? '—'} kg</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Perda Total</span>
            <strong style={{ fontSize: '1.25rem', color: Number(totalLost) > 0 ? 'var(--accent-primary)' : 'inherit' }}>
               {Number(totalLost) > 0 ? '-' : ''}{totalLost} kg
            </strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Meta de Peso</span>
            <strong style={{ fontSize: '1.25rem' }}>{targetWeight ?? '—'} kg</strong>
          </div>
        </section>

        {/* TABELA DE REGISTROS */}
        <section className="glass-panel" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 0, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(52, 211, 153, 0.05)' }}>
              <tr>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Data</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Tipo</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Peso (kg)</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Dose (mg)</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Efeitos Observados</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    {log.type === 'dose' ? (
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Injeção</span>
                    ) : (
                       <span style={{ color: 'var(--text-muted)' }}>Acompanhamento</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>{log.weight}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{log.dose ? log.dose : '—'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '250px' }}>
                    {log.notes || 'Nenhuma observação.'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado para gerar relatório.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* RODAPÉ DO LAUDO */}
        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
          Documento gerado automaticamente pela plataforma MounTrack. Este relatório destina-se apenas a acompanhamento pessoal e apoio à consulta médica.
        </footer>
      </main>
    </ProtectedRoute>
  );
}
