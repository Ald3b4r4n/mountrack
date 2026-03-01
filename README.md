# MounTrack 🧬

**MounTrack** é uma aplicação web premium e responsiva desenvolvida para monitoramento meticuloso e gamificado da jornada com perda de peso (ex: Monjaro). Projetado com foco absoluto em UI/UX e performance, ele oferece um painel vítreo de análise de saúde ("Glassmorphism") utilizando ecossistemas modernos de front-end.

Desenvolvido por [A&R Software Development](https://antoniorafael.com.br).

---

## 🌟 Funcionalidades Principais (V5)

- **Painel de Monitoramento (Dashboard):** Visão holística da jornada, com volumetria de doses e progresso de metas.
- **Predição de Meta com IA (Custo Zero):** Algoritmo de regressão linear que analisa seu histórico de perda de peso e projeta a data exata da vitória.
- **Alerta de Sintomas:** NLP (Processamento de Linguagem Natural) em JavaScript puro para identificar padrões de efeitos colaterais relatados nas anotações.
- **Gamificação Avançada:** Sistema de *Streaks* (semanas consistentes sem atraso) e destravamento de conquistas baseadas em peso perdido.
- **Lembrete Inteligente (Add to Calendar):** Integração orgânica que gera eventos automáticos (`.ics`) para o Google Agenda e Apple Calendar baseados na data ideal da próxima dose.
- **Laudo Médico em PDF:** Visualização tabular oculta e gerador de impressão nativo perfeito para levar ao endocrinologista (CSS Print Media Nativo).
- **Infraestrutura UI Premium:** Suporte total a **Tailwind CSS V3**, **Shadcn UI**, **DaisyUI** e **Framer Motion**, garantindo escalabilidade para explorar componentes ultra modernos (como Aceternity UI e MagicUI).

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 15 (React 19)
- **Estilização Base:** CSS Vanilla V2 (Variáveis HSL globais e Glassmorphism absoluto)
- **Motor CSS e Componentização:** Tailwind CSS v3
- **Design System Extensions:** Shadcn UI + Daisy UI + Framer Motion
- **Autenticação e Database:** Firebase Auth (Google Sign-in) & Cloud Firestore Database
- **Deploy Recomendado:** Vercel

---

## 📱 Responsividade (Mobile First)

O MounTrack foi estruturado pensando primeiro no dispositivo onde você registrará sua dose semanal: o **Celular**.

Nós unimos CSS Grid e Flexbox puros e os acoplamos às classes responsivas utilitárias do Tailwind. Isso significa que ele se adapta perfeitamente, com uma quebra fluida das colunas.
- Em telas menores (Celulares), os cards estatísticos ocupam a largura total em coluna vertical, os gráficos e históricos colapsam mantendo a legibilidade, e o layout não apresenta rolagem horizontal predatória ao UX.
- Já em Desktops e telas maiores, ele assume automaticamente um Layout em Grade panorâmico, tirando proveito para espalhar os gráficos de desempenho e relatórios ao longo da tela sem explodir fontes.

---

## 🚀 Como Fazer o Deploy Perfeito (Vercel)

Seu código está pronto. O processo de deploy na Vercel requer atenção em um detalhe vital: a injeção das chaves do Firebase.

### 1. Preparação
Certifique-se de que o código deste repositório já está pushado para sua conta no GitHub.

### 2. Importando a Base na Vercel
1. Acesse [vercel.com/new](https://vercel.com/new) e faça login autorizando sua conta GitHub.
2. Na lista de projetos do seu perfil, localize o `mountrack` e clique em **Import**.
3. A Vercel detectará automaticamente que é um projeto "Next.js". Não mude os comandos de *Build*.

### 3. Variáveis de Ambiente na Vercel (CRÍTICO) 🔐
Para que a autenticação e gravação de histórico funcionem online de forma segura longe do seu computador e do arquivo oculto `.env.local` (que é propositalmente ignorado pelo Github), precisamos entregá-las para a Vercel.

No painel de importação, expanda a sanfona **"Environment Variables"** e cole **EXATAMENTE** as mesmas chaves do seu arquivo ambiente local. 

**O padrão deve sempre incluir o prefixo `NEXT_PUBLIC_`, exemplo:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSySuaChaveSecretaFireb4seAqU1
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=00000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:00000000:web:0000000
```
*(Adicione linha por linha clicando em "Add")*.

### 4. Lançamento
Com as 6 Variáveis chave preenchidas em abas de produção da Vercel, clique no botão gigante **Deploy**.
Aguarde por cerca de um minuto enquanto a nuvem otimiza as imagens, compila o React e joga ao ar numa URL animada e global. Prontinho!
