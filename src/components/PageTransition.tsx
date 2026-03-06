'use client';

/**
 * Componente de Transição de Página — Envolve o conteúdo das páginas
 * e aplica uma animação suave de fade+slide ao montar.
 * Elimina o efeito "travado" entre as trocas de rota.
 */

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Se a rota mudou, faz o fade out → troca conteúdo → fade in
    if (pathname !== prevPathname.current) {
      setTimeout(() => {
        setIsVisible(false);
      }, 0);

      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        prevPathname.current = pathname;
        // Aguarda 1 frame antes de iniciar o fade in para o browser processar o DOM
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      }, 150); // Duração do fade out

      return () => clearTimeout(timeout);
    } else {
      // Se é a primeira montagem ou o conteúdo mudou sem mudar de rota
      setTimeout(() => {
        setDisplayChildren(children);
      }, 0);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [pathname, children]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'opacity, transform',
        minHeight: '100vh',
      }}
    >
      {displayChildren}
    </div>
  );
}
