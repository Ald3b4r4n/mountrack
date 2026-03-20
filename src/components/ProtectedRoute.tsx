'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface BillingAccessPayload {
  authenticated?: boolean;
  accessAllowed?: boolean;
}

interface BillingCheckState {
  checkedUserId: string | null;
  allowed: boolean;
}

/**
 * Client gate for authenticated app pages.
 * Auth stays in Firebase, billing access is confirmed against the server cookie.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionReady } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [billingState, setBillingState] = useState<BillingCheckState>({
    checkedUserId: null,
    allowed: false,
  });

  useEffect(() => {
    if (!loading && sessionReady && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login');
    }
  }, [user, loading, sessionReady, router]);

  useEffect(() => {
    if (loading || !sessionReady || !user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/billing/access', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as BillingAccessPayload | null;

        if (cancelled) {
          return;
        }

        if (response.status === 401 || payload?.authenticated === false) {
          hasRedirected.current = true;
          setBillingState({
            checkedUserId: user.uid,
            allowed: false,
          });
          router.push('/login');
          return;
        }

        if (!response.ok || payload?.accessAllowed === false) {
          hasRedirected.current = true;
          setBillingState({
            checkedUserId: user.uid,
            allowed: false,
          });
          router.push('/subscribe');
          return;
        }

        setBillingState({
          checkedUserId: user.uid,
          allowed: true,
        });
      } catch (error) {
        console.error('Error checking billing access', error);
        if (cancelled) {
          return;
        }

        hasRedirected.current = true;
        setBillingState({
          checkedUserId: user.uid,
          allowed: false,
        });
        router.push('/subscribe');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, sessionReady, router]);

  const isBillingCheckedForUser = Boolean(user && billingState.checkedUserId === user.uid);

  if (loading || !sessionReady || (user && !isBillingCheckedForUser)) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2.5px solid rgba(52, 211, 153, 0.1)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || !billingState.allowed) {
    return null;
  }

  return <>{children}</>;
}
