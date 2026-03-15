'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * ProtectedRoute otimizado — Não mostra mais o spinner em cada troca de página.
 * Usa useRef para saber se o auth já foi verificado antes,
 * evitando o "flash" de loading a cada navegação client-side.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionReady } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Só redireciona após o loading inicial do Firebase Auth terminar
    if (!loading && sessionReady && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login');
    }
  }, [user, loading, sessionReady, router]);

  // Se o Firebase Auth ainda está carregando pela primeira vez (cold start)
  // mostra o spinner elegante
  if (loading || !sessionReady) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2.5px solid rgba(52, 211, 153, 0.1)',
          borderTopColor: 'var(--accent-primary)',
          animation: 'spin 0.7s linear infinite'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Se checou e não tem user, retorna null (o redirect já foi disparado)
  if (!user) return null;

  // Se está autenticado, renderiza o conteúdo imediatamente, sem delay
  return <>{children}</>;
}
