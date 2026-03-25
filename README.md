# MounTrack

Plataforma mobile-first para acompanhamento de tratamento, peso, doses, rotina alimentar, metas e assinatura recorrente em uma única conta.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Admin-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Mercado Pago](https://img.shields.io/badge/Mercado%20Pago-Subscriptions-00B1EA?style=for-the-badge&logo=mercadopago&logoColor=white)](https://www.mercadopago.com.br/developers/pt)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

Desenvolvido por **A&R Software Development**.

---

## Visão Geral

O MounTrack foi desenhado para pessoas em acompanhamento terapêutico de médio e longo prazo, com foco em adesão, clareza operacional e continuidade do histórico. O produto concentra:

- acompanhamento de peso e evolução;
- controle de doses, ciclos e ampolas;
- diário de jornada;
- nutrição com metas, água e busca de alimentos;
- assinatura recorrente com trial, cobrança, cancelamento e concessões manuais;
- experiência mobile-first com possibilidade de instalação como PWA.

O objetivo é reduzir fricção para o usuário final e, ao mesmo tempo, entregar uma base confiável para uso em contextos clínicos, acompanhamento individual e monitoramento recorrente.

---

## Para Quem o Produto Serve

- **Clientes finais** que precisam registrar rotina, peso, doses e alimentação no mesmo app.
- **Médicos e equipes clínicas** que precisam de um histórico organizado para consulta.
- **Nutricionistas** que dependem de diário alimentar, metas e consistência de registro.
- **Operação interna** que precisa conceder, editar e revogar acessos manuais com rastreabilidade.

---

## Principais Recursos

### Jornada do usuário

- onboarding mobile-first;
- autenticação com Google via Firebase;
- teste gratuito com contagem regressiva;
- paywall com fluxo de assinatura mensal;
- retorno automático de acesso após confirmação do pagamento.

### Acompanhamento e rotina

- dashboard com indicadores principais;
- registro rápido de peso, dose e notas;
- histórico e relatórios;
- metas e ritmo semanal;
- controle de abertura, uso e fechamento de ampola.

### Nutrição

- diário alimentar;
- metas de calorias, proteína, carboidratos e gordura;
- controle de água;
- busca e cadastro de alimentos;
- integração com catálogo nutricional e atribuição compatível com FatSecret.

### Billing e operação

- trial configurável;
- assinatura recorrente com Mercado Pago;
- webhook e reconciliação de pagamentos;
- cancelamento da renovação pelo próprio usuário;
- painel interno de concessões manuais para `owner/admin`.

---

## Capturas do Produto

### Assinatura e continuidade do histórico

![Tela de assinatura](docs/readme/subscribe-mobile.jpg)

### Nutrição, metas e busca de alimentos

![Galeria de nutrição](docs/readme/nutrition-gallery.jpg)

### Registro no diário e fluxo alimentar

![Galeria de diário e registro](docs/readme/journal-gallery.jpg)

### Tela dedicada de assinatura

![Tela de assinatura do usuário](docs/readme/subscription-mobile.jpg)

---

## Diferenciais de Produto

- **Conta única, histórico contínuo:** o usuário não perde contexto ao sair do trial e entrar na assinatura.
- **Operação interna pronta:** concessões de gratuidade, auditoria e controles administrativos já fazem parte do app.
- **Cobrança integrada:** trial, assinatura, cancelamento e reconciliação já foram estruturados no backend.
- **Foco em uso real no celular:** telas, navegação e fluxos foram pensados para interação rápida e recorrente.
- **PWA instalável:** o app pode ser adicionado à tela inicial e usado com comportamento próximo de aplicativo.

---

## Stack Técnica

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion

### Autenticação e identidade

- Firebase Authentication
- Firebase Admin SDK para rotas protegidas e operação interna

### Dados e backend

- Supabase Postgres
- API routes do App Router
- `pg` para acesso server-side ao banco

### Billing

- Mercado Pago
- assinatura recorrente (`preapproval`)
- webhook de reconciliação

### Deploy

- Vercel

---

## Arquitetura em Alto Nível

```mermaid
flowchart LR
    U["Usuário"] --> W["App Web / PWA"]
    W --> A["Firebase Auth"]
    W --> N["Next.js App Router"]
    N --> P["Supabase Postgres"]
    N --> M["Mercado Pago"]
    N --> F["Firebase Admin"]
    N --> C["Catálogo Nutricional"]
```

### Responsabilidades principais

- **Firebase Auth**: login do usuário no cliente.
- **Firebase Admin**: lookup e diretório de usuários para operação interna.
- **Supabase Postgres**: billing, grants, checkout sessions, subscriptions, payments e dados server-side.
- **Mercado Pago**: assinatura recorrente, checkout e notificações.
- **Next.js**: camada de UI, rotas, SSR, APIs e shell instalável.

---

## Execução Local

### Pré-requisitos

- Node.js 20+
- npm
- projeto Firebase configurado
- banco Supabase/Postgres disponível para o ambiente

### Instalação

```bash
git clone https://github.com/Ald3b4r4n/mountrack.git
cd mountrack
npm install
```

### Ambiente local

Crie um arquivo `.env.local` na raiz com base no `.env.example`.

Exemplo mínimo:

```env
NEXT_PUBLIC_FIREBASE_WEB_API=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_HOST=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"your-project-id","client_email":"firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"}

BOOTSTRAP_OWNER_EMAIL=owner@example.com
BOOTSTRAP_ADMIN_EMAILS=owner@example.com

APP_BASE_URL=http://localhost:3000

MERCADO_PAGO_ACCESS_TOKEN=TEST-your-mercado-pago-access-token
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-your-mercado-pago-public-key
MERCADO_PAGO_TEST_PAYER_EMAIL=test_user_123456@testuser.com
NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL=test_user_123456@testuser.com
MERCADO_PAGO_NOTIFICATION_URL=https://your-app.example.com/api/billing/webhooks/mercado-pago
MERCADO_PAGO_WEBHOOK_SECRET=your-mercado-pago-webhook-secret

CRON_SECRET=generate-a-long-random-token
NUTRITION_INGEST_TOKEN=generate-a-long-random-token
NUTRITION_BASE_URL=http://localhost:3000
```

### Rodando

```bash
npm run dev
```

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000).

---

## Variáveis de Ambiente

### Públicas do cliente

- `NEXT_PUBLIC_FIREBASE_WEB_API`
- `NEXT_PUBLIC_FIREBASE_AUTH_HOST`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
- `NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL`

### Backend e operação

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `BOOTSTRAP_OWNER_EMAIL`
- `BOOTSTRAP_ADMIN_EMAILS`
- `APP_BASE_URL`
- `CRON_SECRET`
- `NUTRITION_INGEST_TOKEN`
- `NUTRITION_BASE_URL`

### Billing

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_TEST_PAYER_EMAIL`
- `MERCADO_PAGO_NOTIFICATION_URL`
- `MERCADO_PAGO_WEBHOOK_SECRET`

---

## Scripts Úteis

### Desenvolvimento

```bash
npm run dev
npm run build
npm run start
npm test
```

### Nutrição e catálogo

```bash
npm run nutrition:enrich
npm run nutrition:test-mobile-add
npm run nutrition:validate-persistence
npm run nutrition:catalog:build
npm run nutrition:catalog:refresh-missing
```

### Verificações

```bash
npx eslint src --ext .ts,.tsx
npx tsc --noEmit --pretty false
npm audit --audit-level=high
```

---

## Billing e Assinatura

O modelo atual do produto é de **assinatura mensal recorrente** com:

- período de teste gratuito;
- checkout no Mercado Pago;
- webhook de reconciliação;
- cancelamento da renovação pelo próprio usuário;
- concessões manuais para operação interna.

### Fluxos já previstos

- trial inicial automático;
- expiração do trial com redirecionamento para assinatura;
- retorno ao app após pagamento;
- cancelamento da renovação sem perda imediata do período já pago;
- painel administrativo de grants em `/billing/grants`.

---

## Painel de Concessões

O MounTrack já inclui um console administrativo para `owner/admin` com:

- listagem de usuários;
- busca por e-mail, nome ou UID;
- concessão manual de gratuidade;
- edição e revogação de grants;
- auditoria recente por usuário.

Esse fluxo depende de **Firebase Admin configurado corretamente** no backend.

---

## PWA

O app já possui base de Progressive Web App:

- `manifest.webmanifest`
- service worker
- ícones dedicados
- instalação sugerida em navegadores compatíveis
- fallback offline básico

Objetivo: reduzir fricção de acesso recorrente e aproximar o uso da experiência de aplicativo.

---

## Deploy em Produção

### Plataforma

- Vercel para frontend e rotas server-side
- Firebase para autenticação
- Supabase/Postgres para dados e billing
- Mercado Pago para assinatura

### Recomendação de publicação

Antes de abrir para usuários finais:

1. validar login e sessão;
2. validar trial e expiração;
3. validar assinatura no Mercado Pago;
4. validar cancelamento;
5. validar webhook e reconciliação;
6. validar o painel de grants com conta `owner/admin`.

---

## Integrações e Compliance

### FatSecret

O projeto possui integração nutricional com atribuição obrigatória. Para canais públicos e lojas, a frase exigida pela política é:

`Powered by fatsecret nutrition API`

### Mercado Pago

As credenciais de produção e o secret de webhook devem ser configurados na Vercel antes do uso real da cobrança.

### Firebase Admin

O diretório de usuários, grants e rotas operacionais internas exigem `FIREBASE_SERVICE_ACCOUNT_JSON` ou o trio:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

---

## Estado Atual do Projeto

O produto já cobre os principais fluxos operacionais:

- autenticação;
- dashboard;
- nutrição;
- billing recorrente;
- trial;
- grants;
- cancelamento;
- PWA.

Na prática, o projeto está em estágio de **lançamento controlado**, com base suficiente para demonstração comercial, pilotos e uso interno assistido.

---

## Licença e Uso

Repositório privado de produto. Uso, distribuição e operação sujeitos às regras definidas pela A&R Software Development e pelos provedores integrados.

