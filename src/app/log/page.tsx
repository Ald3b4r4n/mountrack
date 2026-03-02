'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * Página de Novo Registro — Suporta dois tipos:
 * 1. Registro de DOSE (data, dose mg, peso, notas)
 * 2. Registro de PESO AVULSO (só data e peso, para pesagens entre doses)
 */
export default function LogDose() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Tipo do registro: 'dose', 'weight' ou 'note'
  const [logType, setLogType] = useState<'dose' | 'weight' | 'note'>('dose');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const [dose, setDose] = useState('2.5');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Monta o objeto do registro básico
      const logData: Record<string, unknown> = {
        type: logType,
        date,
        createdAt: serverTimestamp()
      };

      // Se não for apenas nota, exige e salva o peso
      if (logType !== 'note') {
        if (!weight) throw new Error("Peso é obrigatório.");
        logData.weight = parseFloat(weight);
      }

      // Sempre adiciona as notas se existirem
      if (notes.trim() !== '') {
        logData.notes = notes;
      }

      // Se for registro de dose, inclui a dose referida
      if (logType === 'dose') {
        logData.dose = parseFloat(dose);
      }

      await addDoc(collection(db, 'users', user.uid, 'logs'), logData);
      router.push('/');
    } catch (error) {
      console.error("Erro ao salvar o registro", error);
      alert("Falha ao salvar registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '600px', paddingTop: '3rem', paddingBottom: '3rem', position: 'relative' }}>
        
        {/* Imagem decorativa de fundo — seringa estilizada */}
        <div style={{ position: 'fixed', bottom: '-40px', left: '-40px', width: '380px', height: '380px', opacity: 0.35, pointerEvents: 'none', zIndex: 0, transform: 'rotate(-25deg)', mixBlendMode: 'screen' }}>
          <Image src="/images/dose-icon.png" alt="" fill style={{ objectFit: 'contain' }} />
        </div>

        <Link href="/" className="back-link anim-enter" style={{ position: 'relative', zIndex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao Dashboard
        </Link>
        
        <div className="glass-panel anim-enter anim-delay-1" style={{ padding: '2.5rem', position: 'relative', zIndex: 1 }}>
          <h1 className="glow-text" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Novo Registro</h1>
          <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>Escolha o tipo de registro que deseja fazer.</p>

          {/* ===== SELETOR DE TIPO ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => setLogType('dose')}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${logType === 'dose' ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                background: logType === 'dose' ? 'rgba(52, 211, 153, 0.08)' : 'transparent',
                color: logType === 'dose' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Dose Semanal
            </button>
            <button
              type="button"
              onClick={() => setLogType('weight')}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${logType === 'weight' ? 'var(--accent-secondary)' : 'var(--border-glass)'}`,
                background: logType === 'weight' ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: logType === 'weight' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/></svg>
              Só Pesagem
            </button>
            <button
              type="button"
              onClick={() => setLogType('note')}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${logType === 'note' ? 'var(--accent-warning, #eab308)' : 'var(--border-glass)'}`,
                background: logType === 'note' ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                color: logType === 'note' ? 'var(--accent-warning, #eab308)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              Diário Livre
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Data — sempre presente */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="date" className="label">Data</label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input-field" />
            </div>

            {/* Dose — só aparece se for registro de dose */}
            {logType === 'dose' && (
              <div className="anim-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="dose" className="label">Dose Aplicada (mg)</label>
                <select id="dose" value={dose} onChange={(e) => setDose(e.target.value)} className="input-field">
                  <option value="2.5">2.5 mg (Início)</option>
                  <option value="5.0">5.0 mg</option>
                  <option value="7.5">7.5 mg</option>
                  <option value="10.0">10.0 mg</option>
                  <option value="12.5">12.5 mg</option>
                  <option value="15.0">15.0 mg (Máxima)</option>
                </select>
              </div>
            )}

            {/* Peso — não aparece se for só diário */}
            {logType !== 'note' && (
              <div className="anim-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="weight" className="label">Peso Atual (kg)</label>
                <input type="number" id="weight" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex: 87.5" required className="input-field" />
              </div>
            )}

            {/* Notas — sempre presente para o diário */}
            <div className="anim-enter" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="notes" className="label">Efeitos Colaterais / Notas</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como você está se sentindo? Dieta, colaterais, conquistas..." className="input-field" style={{ resize: 'none' }} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Salvando...' : logType === 'dose' ? 'Salvar Dose' : logType === 'weight' ? 'Salvar Pesagem' : 'Salvar Diário'}
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
