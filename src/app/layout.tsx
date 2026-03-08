import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PageTransition from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'MounTrack | Progress Dashboard',
  description: 'Track your Monjaro journey with style and precision.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <PageTransition>
            {children}
            <footer style={{ marginTop: '3rem', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
              <div className="glass-panel" style={{ padding: '1rem 2rem', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 211, 153, 0.05)', borderColor: 'rgba(52, 211, 153, 0.15)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Desenvolvido por</span>
                <a 
                  href="https://antoniorafael.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
                  A&R Software Development
                </a>
              </div>
            </footer>
          </PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
