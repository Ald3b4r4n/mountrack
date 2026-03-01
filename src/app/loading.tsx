/**
 * Loading UI global — Exibido automaticamente pelo Next.js App Router
 * enquanto o conteúdo de uma rota está sendo carregado.
 * Evita a tela branca/travada durante as transições de página.
 */
export default function Loading() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '2.5px solid rgba(52, 211, 153, 0.1)',
        borderTopColor: '#34D399',
        animation: 'spin 0.7s linear infinite'
      }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
