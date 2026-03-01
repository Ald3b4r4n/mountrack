'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Goals() {
  const { user } = useAuth();
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadGoals() {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.targetWeight) setTargetWeight(String(data.targetWeight));
          if (data.weeklyGoal) setWeeklyGoal(String(data.weeklyGoal));
        }
      }
    }
    loadGoals();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        targetWeight: parseFloat(targetWeight),
        weeklyGoal: parseFloat(weeklyGoal),
        updatedAt: new Date()
      }, { merge: true });
      setSaved(true);
      setTimeout(() => router.push('/'), 1200);
    } catch (error) {
      console.error("Erro ao salvar metas", error);
      alert("Falha ao salvar metas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="container" style={{ maxWidth: '600px', paddingTop: '3rem' }}>
        <Link href="/" className="back-link anim-enter">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao Dashboard
        </Link>
        
        <div className="glass-panel anim-enter anim-delay-1" style={{ padding: '2.5rem' }}>
          <h1 className="glow-text" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Gerenciamento de Metas</h1>
          <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Defina seus objetivos para acompanhar no Dashboard.</p>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="targetWeight" className="label">Peso Alvo (kg)</label>
              <input type="number" id="targetWeight" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="Ex: 80.0" required className="input-field" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="weeklyGoal" className="label">Meta de Perda Semanal (kg)</label>
              <input type="number" id="weeklyGoal" step="0.1" value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} placeholder="Ex: 0.5" required className="input-field" />
            </div>

            <button type="submit" disabled={loading || saved} className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
              {saved ? '✓ Salvo com sucesso!' : loading ? 'Salvando...' : 'Salvar Metas'}
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
