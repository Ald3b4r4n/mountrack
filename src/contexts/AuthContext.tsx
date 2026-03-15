'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onIdTokenChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionReady: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function syncServerSession(user: User): Promise<boolean> {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error syncing server session", error);
    return false;
  }
}

async function clearServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error("Error clearing server session", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      setSessionReady(false);

      if (!nextUser) {
        await clearServerSession();
        if (!isMounted) {
          return;
        }

        setSessionReady(true);
        setLoading(false);
        return;
      }

      const sessionSynced = await syncServerSession(nextUser);
      if (!isMounted) {
        return;
      }

      if (!sessionSynced) {
        setUser(null);
        await firebaseSignOut(auth).catch(() => undefined);
        await clearServerSession();
      }

      setSessionReady(sessionSynced);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await clearServerSession();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionReady, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
