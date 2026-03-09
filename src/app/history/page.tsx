'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
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

const HISTORY_PAGE_SIZE = 8;

/**
 * Página de histórico com edição inline e exclusão dos registros.
 */
export default function History() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LogData>>({});
  const [saving, setSaving] = useState(false);
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
          fetched.push({ id: documentSnapshot.id, ...documentSnapshot.data() } as LogData);
        });

        setLogs(fetched);
      } catch (error) {
        console.error('Erro ao carregar histórico', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLogs();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(logs.length / HISTORY_PAGE_SIZE));
  const paginatedLogs = logs.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (page === 1) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const startEdit = (log: LogData) => {
    setEditingId(log.id);
    setEditData({
      date: log.date,
      weight: log.weight,
      dose: log.dose,
      notes: log.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (logId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const reference = doc(db, 'users', user.uid, 'logs', logId);
      const updatePayload: Record<string, unknown> = {
        date: editData.date,
        weight: editData.weight,
      };

      if (editData.dose !== undefined && editData.dose !== null) {
        updatePayload.dose = editData.dose;
      }

      if (editData.notes !== undefined) {
        updatePayload.notes = editData.notes;
      }

      await updateDoc(reference, updatePayload);
      setLogs((currentLogs) => currentLogs.map((log) => (log.id === logId ? { ...log, ...updatePayload } as LogData : log)));
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error('Erro ao salvar edição', error);
      alert('Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
      setLogs((currentLogs) => currentLogs.filter((log) => log.id !== logId));
    } catch (error) {
      console.error('Erro ao deletar registro', error);
    }
  };

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '800px', paddingTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="glow-text anim-enter" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Histórico</h1>
            <p className="page-subtitle anim-enter anim-delay-1">Todos os seus registros. Toque para editar.</p>
          </div>
          <Link href="/" className="nav-pill anim-enter anim-delay-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Dashboard
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton-pulse" style={{ height: '90px' }}></div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel anim-enter" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum registro encontrado.</p>
            <Link href="/log" className="btn-primary" style={{ textDecoration: 'none' }}>Criar primeiro registro</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paginatedLogs.map((log, index) => (
              <div key={log.id} className="glass-panel anim-enter" style={{ padding: '1.5rem', animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
                {editingId === log.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label htmlFor={`history-date-${log.id}`} className="label" style={{ fontSize: '0.8rem' }}>Data</label>
                        <input id={`history-date-${log.id}`} type="date" value={editData.date || ''} onChange={(event) => setEditData((current) => ({ ...current, date: event.target.value }))} className="input-field" style={{ marginTop: '0.25rem' }} />
                      </div>
                      {log.type !== 'note' ? (
                        <div>
                          <label htmlFor={`history-weight-${log.id}`} className="label" style={{ fontSize: '0.8rem' }}>Peso (kg)</label>
                          <input id={`history-weight-${log.id}`} type="number" step="0.1" value={editData.weight || ''} onChange={(event) => setEditData((current) => ({ ...current, weight: parseFloat(event.target.value) }))} className="input-field" style={{ marginTop: '0.25rem' }} />
                        </div>
                      ) : null}
                      {log.type === 'dose' || log.dose !== undefined ? (
                        <div>
                          <label htmlFor={`history-dose-${log.id}`} className="label" style={{ fontSize: '0.8rem' }}>Dose (mg)</label>
                          <select id={`history-dose-${log.id}`} value={editData.dose || ''} onChange={(event) => setEditData((current) => ({ ...current, dose: parseFloat(event.target.value) }))} className="input-field" style={{ marginTop: '0.25rem' }}>
                            <option value="2.5">2.5 mg</option>
                            <option value="5.0">5.0 mg</option>
                            <option value="7.5">7.5 mg</option>
                            <option value="10.0">10.0 mg</option>
                            <option value="12.5">12.5 mg</option>
                            <option value="15.0">15.0 mg</option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor={`history-notes-${log.id}`} className="label" style={{ fontSize: '0.8rem' }}>Notas e relatos</label>
                      <textarea id={`history-notes-${log.id}`} rows={2} value={editData.notes || ''} onChange={(event) => setEditData((current) => ({ ...current, notes: event.target.value }))} className="input-field" style={{ marginTop: '0.25rem', resize: 'none' }} placeholder="(Opcional) Adicione anotações a este registro..." />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} className="btn-outline">Cancelar</button>
                      <button onClick={() => saveEdit(log.id)} disabled={saving} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: log.type === 'note' ? 'rgba(234, 179, 8, 0.12)' : (log.type === 'weight' || !log.dose) ? 'rgba(6, 182, 212, 0.12)' : 'rgba(52, 211, 153, 0.12)',
                          border: `1px solid ${log.type === 'note' ? 'rgba(234, 179, 8, 0.2)' : (log.type === 'weight' || !log.dose) ? 'rgba(6, 182, 212, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`,
                        }}
                      >
                        {log.type === 'note' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning, #eab308)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                        ) : (log.type === 'weight' || !log.dose) ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M8 7l4-4 4 4" /><path d="M8 17l4 4 4-4" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                        )}
                      </div>

                      <div>
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '1rem' }}>
                          {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          {log.weight !== undefined ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.weight} kg</span>
                          ) : null}
                          {log.dose ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{log.dose} mg</span>
                          ) : null}
                          {log.type === 'note' ? (
                            <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent-warning, #eab308)' }}>Diário</span>
                          ) : null}
                          {!log.dose && (log.type === 'weight' || log.type === undefined) ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pesagem</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => startEdit(log)}
                        title="Editar"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-glass)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, border-color 0.2s, background-color 0.2s, opacity 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                      </button>
                      <button
                        onClick={() => deleteLog(log.id)}
                        title="Excluir"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-glass)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, border-color 0.2s, background-color 0.2s, opacity 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <PaginationControls
              page={page}
              pageSize={HISTORY_PAGE_SIZE}
              totalItems={logs.length}
              totalPages={totalPages}
              itemLabel="registros"
              onPageChange={setPage}
            />
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
