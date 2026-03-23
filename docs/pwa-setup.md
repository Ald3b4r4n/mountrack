# PWA Setup

O MounTrack agora possui base de Progressive Web App com estes pontos:

- `src/app/manifest.ts`: manifesto installable com icones, atalhos e theme color.
- `src/components/pwa/PwaRegistrar.tsx`: registro do service worker apenas em build de producao.
- `src/components/pwa/PwaInstallPrompt.tsx`: sugestao de instalacao com CTA nativo (`beforeinstallprompt`) e fallback manual para iPhone/Android.
- `public/sw.js`: cache conservador do shell, com bypass de `GET /api/*`.
- `public/offline.html`: fallback simples para navegacao sem rede.
- `public/pwa/*`: icones do app.
- `scripts/pwa/generate-icons.ps1`: script para regenerar `icon-192`, `icon-512`, `icon-maskable-512` e `apple-touch-icon`.

Decisoes operacionais:

- o service worker nao registra em `npm run dev`, para evitar cache agressivo durante desenvolvimento;
- o shell offline nao tenta servir respostas autenticadas da API;
- `sw.js` recebe header `Cache-Control: no-cache, no-store, must-revalidate` em `next.config.ts`.
- a instalacao nao pode ser forcada em todos os navegadores; o app agora sugere de forma explicita e usa o prompt nativo quando o navegador liberar.
