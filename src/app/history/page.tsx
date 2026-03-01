'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * Interface para os dados do log armazenados no Firestore
 */
interface LogData {
  id: string;
  type?: 'dose' | 'weight'; // 'dose' = aplicação semanal, 'weight' = pesagem avulsa
  weight: number;
  dose?: number;
  date: string;
  notes?: string;
}

/**
 * Página de Histórico — lista todos os registros com opção de edição inline e exclusão.
 * O usuário pode corrigir erros sem precisar deletar e recriar.
 */
export default function History() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LogData>>({});
  const [saving, setSaving] = useState(false);

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
          fetched.push({ id: d.id, ...d.data() } as LogData);
        });
        setLogs(fetched);
      } catch (err) {
        console.error("Erro ao carregar histórico", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [user]);

  // Inicia a edição de um registro e preenche o formulário com os dados atuais
  const startEdit = (log: LogData) => {
    setEditingId(log.id);
    setEditData({
      date: log.date,
      weight: log.weight,
      dose: log.dose,
      notes: log.notes || ''
    });
  };

  // Cancela a edição e limpa o formulário
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Salva as alterações no Firestore
  const saveEdit = async (logId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, 'users', user.uid, 'logs', logId);
      const updatePayload: Record<string, unknown> = {
        date: editData.date,
        weight: editData.weight,
      };
      
      // Atualiza os campos extras se existirem editados (inclusive notas soltas)
      if (editData.dose !== undefined && editData.dose !== null) {
        updatePayload.dose = editData.dose;
      }
      if (editData.notes !== undefined) {
        updatePayload.notes = editData.notes;
      }
      
      await updateDoc(ref, updatePayload);
      
      // Atualiza o estado local sem recarregar
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, ...updatePayload } as LogData : l));
      setEditingId(null);
      setEditData({});
    } catch (err) {
      console.error("Erro ao salvar edição", err);
      alert("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Deleta um registro do Firestore com confirmação
  const deleteLog = async (logId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      console.error("Erro ao deletar", err);
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-pulse" style={{ height: '90px' }}></div>)}
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel anim-enter" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum registro encontrado.</p>
            <Link href="/log" className="btn-primary" style={{ textDecoration: 'none' }}>Criar Primeiro Registro</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map((log, i) => (
              <div key={log.id} className={`glass-panel anim-enter`} style={{ padding: '1.5rem', animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                {editingId === log.id ? (
                  /* ===== MODO EDIÇÃO ===== */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.8rem' }}>Data</label>
                        <input type="date" value={editData.date || ''} onChange={(e) => setEditData(p => ({...p, date: e.target.value}))} className="input-field" style={{ marginTop: '0.25rem' }} />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '0.8rem' }}>Peso (kg)</label>
                        <input type="number" step="0.1" value={editData.weight || ''} onChange={(e) => setEditData(p => ({...p, weight: parseFloat(e.target.value)}))} className="input-field" style={{ marginTop: '0.25rem' }} />
                      </div>
                      {(log.type === 'dose' || log.dose !== undefined) && (
                        <div>
                          <label className="label" style={{ fontSize: '0.8rem' }}>Dose (mg)</label>
                          <select value={editData.dose || ''} onChange={(e) => setEditData(p => ({...p, dose: parseFloat(e.target.value)}))} className="input-field" style={{ marginTop: '0.25rem' }}>
                            <option value="2.5">2.5 mg</option>
                            <option value="5.0">5.0 mg</option>
                            <option value="7.5">7.5 mg</option>
                            <option value="10.0">10.0 mg</option>
                            <option value="12.5">12.5 mg</option>
                            <option value="15.0">15.0 mg</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: '0.8rem' }}>Notas e Relatos</label>
                      <textarea rows={2} value={editData.notes || ''} onChange={(e) => setEditData(p => ({...p, notes: e.target.value}))} className="input-field" style={{ marginTop: '0.25rem', resize: 'none' }} placeholder="(Opcional) Adicione anotações a esse registro..." />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} className="btn-outline">Cancelar</button>
                      <button onClick={() => saveEdit(log.id)} disabled={saving} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ===== MODO VISUALIZAÇÃO ===== */
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {/* Indicador de tipo */}
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: (log.type === 'weight' || !log.dose) ? 'rgba(6, 182, 212, 0.12)' : 'rgba(52, 211, 153, 0.12)',
                        border: `1px solid ${(log.type === 'weight' || !log.dose) ? 'rgba(6, 182, 212, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`
                      }}>
                        {(log.type === 'weight' || !log.dose) ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        )}
                      </div>

                      <div>
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '1rem' }}>
                          {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.weight} kg</span>
                          {log.dose && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{log.dose} mg</span>
                          )}
                          {(!log.dose && (log.type === 'weight' || log.type === undefined)) && !log.dose && (
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pesagem</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEdit(log)} title="Editar" style={{
                        width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-glass)',
                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                      </button>
                      <button onClick={() => deleteLog(log.id)} title="Excluir" style={{
                        width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-glass)',
                        background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
