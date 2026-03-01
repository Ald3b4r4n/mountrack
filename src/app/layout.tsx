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
            <footer style={{ marginTop: '4rem', padding: '2rem 1rem', textAlign: 'center', borderTop: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Desenvolvido com <span style={{ color: 'var(--accent-danger)' }}>❤</span> por{' '}
                <a 
                  href="https://antoniorafael.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s ease', WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(90deg, var(--accent-primary), #059669)' }}
                >
                  A&R Software Development
                </a>
              </p>
            </footer>
          </PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
