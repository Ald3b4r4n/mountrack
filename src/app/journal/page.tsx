'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import PaginationControls from '@/components/PaginationControls';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';

interface LogData {
  id: string;
  type?: 'dose' | 'weight' | 'note';
  weight?: number;
  dose?: number;
  date: string;
  notes?: string;
}

const JOURNAL_PAGE_SIZE = 6;

/**
 * Página do diário com os registros que possuem anotações em formato de timeline.
 */
export default function Journal() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;

      try {
        const logsRef = collection(db, 'users', user.uid, 'logs');
        const logsQuery = query(logsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(logsQuery);

        const fetched: LogData[] = [];
        snapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data() as LogData;
          if (data.notes && data.notes.trim() !== '') {
            fetched.push({ ...data, id: documentSnapshot.id });
          }
        });

        setLogs(fetched);
      } catch (error) {
        console.error('Erro ao carregar diário', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLogs();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(logs.length / JOURNAL_PAGE_SIZE));
  const paginatedLogs = logs.slice((page - 1) * JOURNAL_PAGE_SIZE, page * JOURNAL_PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (page === 1) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '700px', paddingTop: '3rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="glow-text anim-enter" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Diário</h1>
            <p className="page-subtitle anim-enter anim-delay-1">Seus relatos, sintomas e conquistas ao longo da jornada.</p>
          </div>
          <Link href="/" className="nav-pill anim-enter anim-delay-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Dashboard
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton-pulse" style={{ height: '140px', borderRadius: '1rem' }}></div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel anim-enter" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: '1rem' }}>✍️</span>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Seu diário está em branco</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Use o campo de notas ao registrar uma dose ou pesagem para acompanhar como você está se sentindo.
            </p>
            <Link href="/log" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Escrever primeiro relato
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1rem', bottom: '1rem', left: '1.5rem', width: '2px', background: 'var(--border-glass)', zIndex: 0, opacity: 0.5, display: 'none' }}></div>

            {paginatedLogs.map((log, index) => (
              <article
                key={log.id}
                className="glass-panel anim-enter"
                style={{
                  padding: '1.5rem',
                  position: 'relative',
                  zIndex: 1,
                  animationDelay: `${Math.min(index * 0.05, 0.4)}s`,
                  borderLeft: `4px solid ${log.type === 'note' ? 'var(--accent-warning, #eab308)' : log.dose ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`,
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(log.date + 'T12:00:00')
                        .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                        .replace(/^\w/, (value) => value.toUpperCase())}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      {log.weight !== undefined ? (
                        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-secondary)' }}>⚖️ {log.weight} kg</span>
                      ) : null}

                      {log.dose ? (
                        <span className="badge badge-success">💉 Dose {log.dose} mg</span>
                      ) : null}

                      {log.type === 'note' ? (
                        <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent-warning, #eab308)' }}>✍️ Diário</span>
                      ) : null}

                      {!log.dose && (log.type === 'weight' || log.type === undefined) ? (
                        <span className="badge badge-warning">⚖️ Pesagem</span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ opacity: 0.2 }}>
                    {log.type === 'note' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                    ) : log.dose ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M8 7l4-4 4 4" /><path d="M8 17l4 4 4-4" /></svg>
                    )}
                  </div>
                </header>

                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                  {log.notes}
                </div>
              </article>
            ))}
            <PaginationControls
              page={page}
              pageSize={JOURNAL_PAGE_SIZE}
              totalItems={logs.length}
              totalPages={totalPages}
              itemLabel="relatos"
              onPageChange={setPage}
            />
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
