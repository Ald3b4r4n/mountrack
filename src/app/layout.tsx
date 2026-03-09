import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import PageTransition from '@/components/PageTransition';
import { AppFooter } from '@/components/AppFooter';

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
            <AppFooter />
          </PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
