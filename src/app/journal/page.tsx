'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

/**
 * Interface para os dados do log armazenados no Firestore
 */
interface LogData {
  id: string;
  type?: 'dose' | 'weight' | 'note';
  weight?: number;
  dose?: number;
  date: string;
  notes?: string;
}

/**
 * Página do Diário — exibe todos os registros que contêm anotações em formato de feed/timeline.
 * Permite que o usuário leia seu progresso como um diário de bordo.
 */
export default function Journal() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar todos os registros do Firestore
  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;
      try {
        const logsRef = collection(db, 'users', user.uid, 'logs');
        const q = query(logsRef, orderBy('date', 'desc'));
        const snap = await getDocs(q);
        
        const fetched: LogData[] = [];
        snap.forEach((d) => {
          const data = d.data() as LogData;
          // Mostra apenas registros que têm algo escrito nas notas
          if (data.notes && data.notes.trim() !== '') {
            fetched.push({ ...data, id: d.id });
          }
        });
        setLogs(fetched);
      } catch (err) {
        console.error("Erro ao carregar diário", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [user]);

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '700px', paddingTop: '3rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="glow-text anim-enter" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Diário</h1>
            <p className="page-subtitle anim-enter anim-delay-1">Seus relatos, sintomas e conquistas ao longo da jornada.</p>
          </div>
          <Link href="/" className="nav-pill anim-enter anim-delay-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-pulse" style={{ height: '140px', borderRadius: '1rem' }}></div>)}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel anim-enter" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: '1rem' }}>✍️</span>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Seu diário está em branco</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Use o campo de notas ao registrar uma dose ou pesagem para acompanhar como você está se sentindo.
            </p>
            <Link href="/log" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Escrever primeiro relato</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            {/* Linha vertical da Timeline */}
            <div style={{ position: 'absolute', top: '1rem', bottom: '1rem', left: '1.5rem', width: '2px', background: 'var(--border-glass)', zIndex: 0, opacity: 0.5, display: 'none' }}></div>
            
            {logs.map((log, i) => (
              <article key={log.id} className="glass-panel anim-enter" style={{ padding: '1.5rem', position: 'relative', zIndex: 1, animationDelay: `${Math.min(i * 0.05, 0.4)}s`, borderLeft: `4px solid ${log.type === 'note' ? 'var(--accent-warning, #eab308)' : log.dose ? 'var(--accent-primary)' : 'var(--accent-secondary)'}` }}>
                
                {/* Header do Card (Data e Stats) */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      {log.weight !== undefined && (
                        <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{log.weight} kg</span>
                      )}
                      
                      {log.dose && (
                        <span className="badge badge-success">💉 Dose {log.dose} mg</span>
                      )}
                      
                      {log.type === 'note' && (
                        <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent-warning, #eab308)' }}>✍️ Diário</span>
                      )}
                      
                      {(!log.dose && (log.type === 'weight' || log.type === undefined)) && (
                        <span className="badge badge-warning">⚖️ Pesagem</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Ícone sutil no canto indicando o tipo da nota */}
                  <div style={{ opacity: 0.2 }}>
                    {log.type === 'note' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    ) : log.dose ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/></svg>
                    )}
                  </div>
                </header>
                
                {/* Conteúdo da Nota */}
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                  {log.notes}
                </div>
                
              </article>
            ))}
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
