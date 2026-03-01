/**
 * Componente Logo MounTrack — SVG estilizado com gradiente,
 * efeito glow, ícone de pulso cardíaco integrado e tipografia premium.
 * Usado em todas as telas como identidade visual do app.
 */
export default function Logo({ 
  size = 'lg',
  showText = true 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}) {
  // Mapeamento de tamanhos para o ícone e texto
  const sizes = {
    sm: { icon: 28, text: '1.25rem', gap: '0.5rem', glow: 20 },
    md: { icon: 40, text: '1.75rem', gap: '0.75rem', glow: 30 },
    lg: { icon: 52, text: '2.5rem', gap: '0.75rem', glow: 40 },
    xl: { icon: 72, text: '3.5rem', gap: '1rem', glow: 50 },
  };

  const s = sizes[size];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap }}>
      {/* Ícone SVG com gradiente e glow */}
      <div style={{
        position: 'relative',
        width: `${s.icon}px`,
        height: `${s.icon}px`,
        flexShrink: 0,
      }}>
        {/* Halo de glow atrás */}
        <div style={{
          position: 'absolute',
          inset: `-${s.glow * 0.3}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 70%)',
          filter: `blur(${s.glow * 0.4}px)`,
          pointerEvents: 'none',
        }}></div>
        
        <svg 
          width={s.icon} 
          height={s.icon} 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <defs>
            {/* Gradiente principal do ícone */}
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            {/* Gradiente do fundo circular */}
            <linearGradient id="logoBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(52, 211, 153, 0.15)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.08)" />
            </linearGradient>
          </defs>
          
          {/* Círculo de fundo */}
          <circle cx="32" cy="32" r="30" fill="url(#logoBg)" stroke="url(#logoGrad)" strokeWidth="1.5" />
          
          {/* Linha de pulso cardíaco estilizada */}
          <path 
            d="M 12 32 L 20 32 L 24 22 L 28 42 L 32 18 L 36 44 L 40 28 L 44 32 L 52 32" 
            stroke="url(#logoGrad)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Ponto de destaque no pico */}
          <circle cx="32" cy="18" r="2" fill="#34D399" opacity="0.8" />
        </svg>
      </div>

      {/* Texto "MounTrack" com gradiente */}
      {showText && (
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: s.text,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #34D399 0%, #06B6D4 50%, #34D399 100%)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1,
          userSelect: 'none',
        }}>
          Moun<span style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #34D399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Track</span>
        </span>
      )}
    </div>
  );
}
