<div align="center">

# 🧬 MounTrack

_O estado da arte na engenharia de monitoramento de tratamento, aliando UI/UX minimalista ("Glassmorphism") e predições baseadas em dados estruturados._

[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS V3](https://img.shields.io/badge/Tailwind_V3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

[**🖥️ Desenvolvido por A&R Software Development**](https://antoniorafael.com.br)

</div>

---

## 🎯 Por Trás do MounTrack

O **MounTrack** transcende o conceito de uma simples prancheta de controle. Desenvolvido para usuários submetidos a tratamentos delicados de longo termo (como Mounjaro/Ozempic), exigia-se uma interface que diminuísse a carga cognitiva do tratamento, ao mesmo tempo em que consolidasse, no lado da engenharia, um ambiente extremamente robusto e responsivo.

O resultado é uma plataforma "Mobile First", alimentada por rotinas avançadas de predição analítica (sem custos exagerados de LLMs de consumo), processamento em nuvem rigoroso e uma filosofia visual inteiramente baseada em _Glassmorphism_.

---

## ⚡ Engineering Deep Dive

O MounTrack não utiliza IA apenas por _buzzword_; a arquitetura alavanca capacidades de **Machine Learning (Regressão) e PNL** local/híbrida para extrair significado matemático a partir de entradas biológicas do usuário.

### 🧠 1. Predição de Meta Híbrida (IA & Estatística)

- **Engenharia de Regressão Linear:** Para calcular a "Data Efetiva da Vitória" (quando você alcançará o peso alvo), aplicamos de forma limpa algoritmos de regressão e cálculos logarítmicos ao longo do delta de tempo x pesagens históricas.
- **NLP (Natural Language Processing):** O backend incorpora um motor em vanilla JavaScript que processa o léxico (texto) de observações e efeitos colaterais relatados, classificando-os semanticamente para categorizar os sintomas. Zero chamadas onerosas na API; performance ultra-alta de análise de strings em _client e edge_.

### 💎 2. UI/UX "Glassmorphic" (Premium Standards)

- **Framework:** Desenvolvido puramente em cima do Next.js 15 (React 19).
- **Styling Engine:** Construído com o poder do **Tailwind CSS v3**, abstraindo e modernizando temas por meio de componentes como Shadcn UI e DaisyUI.
- **Componentes Vivos:** Forte apelo de micro-interações via **Framer Motion**, desenhado minuciosamente seguindo padrões CSS Nativos V2 flexíveis e Design Systems que evocam Aceternity e MagicUI. O resultado é responsivo, não obstrutivo (zero scroll horizontal forçado) e cristalino em celulares.

### 🏥 3. Motor de Laudos Médicos Nativos

- Em vez de incorrer em custos pesados gerando o PDF em servidores paralelos corporativos, implementamos **media CSS `@print` nativa altamente otimizada**. Com um clique, os mesmos dados belos renderizados no front-end "degradam elegantemente" para um design puramente tabular pronto para impressoras físicas – ideal para discussões com endocrinologistas.

### 🎮 4. Gamificação Dinâmica e Infraestrutura Cloud

- **Streak System:** O banco audita datas de tomadas e engajamento. Regras rígidas atualizam _streaks_ (semanas sem falhas na tomada do medicamento).
- **Automação de API (.ICS):** Motores orgânicos produzem arquivos para Apple Calendar e Google Calendar sob demanda.
- **Backend Inquebrável:** Arquitetura _Serverless_ provendo Firebase Auth (integração via Google Identity) assíncrona, e um modelo NoSQL persistente pelo Cloud Firestore.

---

## 🚀 Guia de Quick Start

Para rodar essa obra de arte arquitetural na sua máquina localmente para contribuição:

### Pré-requisitos

- Node.js (Versão recomendada > 20.x)
- Uma conta e projeto ativo com variáveis do Firebase e Firestore.

### 1. Instalação Padrão

```bash
# Clone o repositório orgânico
git clone https://github.com/SeuUsuario/mountrack.git
cd mountrack

# Instale todas as dependências do ecossistema Next.js
npm install
```

### 2. Configurando o Ambiente

Crie um arquivo seguro e local chamado `.env.local` na raiz do projeto com as chaves obrigatórias descritas abaixo:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=SuaChaveSecretaFireb4seAqU1
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=00000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:00000000:web:0000000
```

*Dica: não versionar `.env.local` (*gitignore* nativo garantirá isso).*

### 3. Start Engines

```bash
npm run dev
# Acesse o server local de UI na porta: http://localhost:3000
```

---

## ☁️ Deploy via Vercel (Produção Total)

O código possui um pipeline transparente pronto para ser acionado sob o guarda-chuva Vercel.

**Ao ligar o repositório na lista Vercel (Import Project), não modifique o Workflow Build**, o padrão fará a mágica ser executada. O único aspecto vital em Produção: **As Variáveis de Ambiente e CronJobs:**

#### Variáveis Exclusivas do Backend (Nutrição e Segurança de Jobs)

Dentro da aba de "Environment Variables" da Vercel para a Produção, cole as variáveis do Firebase usadas no `.env.local`, mas acrescente também os tokens relativos ao enriquecimento automatizado do banco.

```env
CRON_SECRET=gere-um-token-longo-e-aleatorio
NUTRITION_INGEST_TOKEN=gere-um-token-longo-e-aleatorio
```

**O que elas fazem?**

- `CRON_SECRET`: Abstrai a autenticação do Cron Job (via ambiente Vercel) responsável pela constante alimentação orgânica/fresca do catálogo em background.
- `NUTRITION_INGEST_TOKEN`: Autoriza o mesmo canal no gatilho síncrono da API manualmente por um administrador que detenha o segredo.

#### Enriquecimento Manual (Scripting Ops)

Para engatilhar essa persistência dos alimentos via console caso os jobs não cubram:

```bash
# Se o terminal local rodando dev() aponta para localhost
npm run nutrition:enrich -- --limit 5

# Para acionar em um deploy remoto / produção a partir do desktop de engenharia
npm run nutrition:enrich -- --base-url https://seu-app-final.vercel.app --limit 10
```

#### Validação Operacional da Persistência

Para confirmar localmente que a nutrição está realmente em `database`, com escrita/leitura privada e isolamento por usuário:

```bash
# Valida storage, metas, água no diário e isolamento de custom foods
npm run nutrition:validate-persistence

# Inclui também a checagem autenticada da rota interna de enrichment
npm run nutrition:validate-persistence -- --token <NUTRITION_INGEST_TOKEN>
```

Se nenhum token for informado, o script ainda valida a rota de `enrichment` sem autenticação, mas marca a etapa autenticada como `skipped`.

Com estas chaves e procedimentos de ingestão definidos no Vercel, clique em **Deploy**. Espere a compilação paralela da Vercel otimizar os fluxos; agora seu App Premium estará ao vivo!

---

## 🍽️ Nutrition API Integration & FatSecret Proxy Infrastructure

### Problema Original

O FatSecret API bloqueia requisições baseado em IP whitelist. Como **Vercel usa IPs dinâmicos** (múltiplos data centers, ~5 IPs diferentes), e o FatSecret Policy rejeita IPs não-whitelistados, o app não conseguia fazer lookup de alimentos via API.

**Erro observado:**

```
[FatSecret] API error: { code: 21, message: "Invalid IP address detected: '3.214.217.15'" }
```

### Solução Arquitetônica

Implementamos um **FatSecret Proxy Microserviço** rodando em **Oracle Cloud Free Tier VM** (IP fixo: `163.176.57.129`) que:

1. **Gerencia credenciais de forma centralizada** – OAuth 2.0 token + refresh automático
2. **Fornece um endpoint único e fixo (`/fatsecret/call`)** – Vercel chama o proxy (IP fixo whitelistado) ao invés de chamar FatSecret direto
3. **Ignora a dinâmica de IP do Vercel** – Proxy é o intermediário com IP estático
4. **Mantém um cache de tokens** – Reduz latência (token reutilizado por 1h)

```
┌──────────────────┐
│  MounTrack App   │
│  (Vercel, IP    │
│  dinâmico)       │
└────────┬─────────┘
         │
         │ HTTP POST /fatsecret/call
         │ (163.176.57.129:8080)
         ▼
┌──────────────────────────────┐
│ FatSecret Proxy              │
│ (Oracle Cloud VM)            │
│ IP: 163.176.57.129           │
│ - OAuth token cache/renewal  │
│ - Credential isolation       │
│ - Latency logging            │
└────────┬─────────────────────┘
         │
         │ HTTPS
         │ (FatSecret whitelistado)
         ▼
┌──────────────────┐
│  FatSecret API   │
│  (foods.search,  │
│  food.get, etc)  │
└──────────────────┘
```

### Configuração do Proxy

#### 1. Variáveis na Vercel

```env
FATSECRET_PROXY_BASE_URL=http://163.176.57.129:8080
FATSECRET_PROXY_SHARED_SECRET=<seu-secret-de-128-chars>
```

#### 2. Credenciais FatSecret (direto ou via Vercel)

```env
FATSECRET_CLIENT_ID=<seu-client-id>
FATSECRET_CLIENT_SECRET=<seu-client-secret>
# Scope deve ser "premier" para barcode scanning + autocomplete search
```

#### 3. Whitelist de IP no FatSecret Platform

Acesse [platform.fatsecret.com/my-account/ip-restrictions](https://platform.fatsecret.com/my-account/ip-restrictions) e adicione:

```
163.176.57.129
```

#### 4. Deployment do Proxy (Oracle Cloud Free Tier)

O proxy roda em `/home/ubuntu/fatsecret-proxy/` via PM2 com ambiente carregado:

```bash
# Via PM2 com variáveis de ambiente
pm2 start /home/ubuntu/fatsecret-proxy/server.mjs \
  --name fatsecret-proxy \
  --env PORT=8080 \
  --env FATSECRET_CLIENT_ID=<seu-id> \
  --env FATSECRET_CLIENT_SECRET=<seu-secret> \
  --env FATSECRET_SCOPE=premier \
  --env PROXY_SHARED_SECRET=<seu-secret>

# Salvar configuração PM2
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Performance & Latency

**Tempo típico por requisição:**

- FatSecret v3 (premium search): **400-600ms**
- Open Food Facts (fallback): **3-4s** (timeout agressivo)
- USDA FoodData Central: **1.8s**
- **Total (paralelo):** ~4s máximo (vs 15s+ sequencial)

**Observado nos logs:**

```
[FatSecret] Proxy response for foods.search.v3 in 655ms
[FatSecret] Proxy response for foods.search in 423ms
[FatSecret] No direct match, searching by barcode number
[OpenFoodFacts] Barcode lookup: 7896311777204
```

### Troubleshooting

#### Proxy retorna 500 Error

```
[FatSecret] Proxy request failed for foods.search.v3: 500
```

**Solução:**

1. Conecte via SSH: `ssh -i <chave> ubuntu@163.176.57.129`
2. Verifique logs: `pm2 logs fatsecret-proxy`
3. Cheque credenciais: `cat ~/fatsecret-proxy/.env`
4. Restart: `pm2 restart fatsecret-proxy`

#### Health check do proxy

```bash
# Local (via SSH)
curl http://127.0.0.1:8080/health

# Esperado:
{"ok":true,"uptimeSec":123,"tokenCached":true}
```

#### FatSecret IP still blocked

Se mesmo com proxy configurado ainda vê `code: 21, "Invalid IP address" '3.x.x.x'`, significa:

- App **não está usando proxy** → Verifique `FATSECRET_PROXY_BASE_URL` na Vercel
- Proxy **está falhando** → Redirecionando para fallback direto (Vercel IP bloqueado)

**Última garantia:** Remova fallback direto no código – se proxy falha, retorne erro (não caia para IP dinâmico):

```typescript
// src/modules/nutrition/providers/fatsecret.ts
if (proxyConfig && !proxyResponse?.ok) {
  console.error(`Proxy failed for ${method}. Not falling back to direct call.`);
  return null; // Bloqueia fallback perigoso
}
```

#### Certificado de Search Premium

Para confirmar que FatSecret está usando scope **premier** (barcode scanning + autocomplete):

- Verifique logs do proxy: `[Proxy] New token in 893ms (scope=premier)`
- Se disser `scope=basic`, force restart com `--update-env`

---

> _"Great software feels like an invisible extension of the hands, eyes, and process."_  
> – MounTrack Philosophy
