# Nutrition UX Redesign

## Contexto

O modulo `nutrition` hoje tenta resolver muitas tarefas no mesmo nivel visual:

- buscar alimento
- compor lancamento
- revisar diario
- corrigir hidratacao
- editar metas
- gerar cardapio
- consultar historico

Isso funciona parcialmente no desktop, mas no mobile gera excesso de profundidade e varios niveis de tabs.

## Entendimento atual

- A tela principal mistura superficie de busca com superficie de workspace em [`NutritionScreen.tsx`](../src/components/nutrition/NutritionScreen.tsx).
- No mobile, a navegacao ja comeca com tabs de superficie (`Busca` e `Diario/Cardapio/Meta`) e logo abaixo aparecem mais tabs internas por contexto.
- O header ocupa quase toda a primeira dobra com resumo, agua e macros em [`NutritionHeader.tsx`](../src/components/nutrition/NutritionHeader.tsx).
- A busca empilha input, resultados e compositor na mesma coluna em [`FoodSearchPanel.tsx`](../src/components/nutrition/FoodSearchPanel.tsx).
- O diario concentra hidratacao, troca entre hoje/historico e filtros por refeicao em [`DiaryPanel.tsx`](../src/components/nutrition/DiaryPanel.tsx).
- Metas e cardapio sao telas de formulario, mas continuam encaixadas como paines equivalentes ao diario.

## Problemas principais

### 1. Hierarquia fraca

Hoje tudo parece ter a mesma prioridade visual. O usuario nao entende rapido:

- onde ver o dia atual
- onde registrar um alimento
- onde planejar
- onde configurar

### 2. Tabs demais

No mobile existe tab sobre tab:

- superficie: `Busca` vs `Workspace`
- workspace: `Diario`, `Metas`, `Plano Alimentar`
- diario: `Hoje`, `Historico`
- diario: `Cafe da manha`, `Almoco`, `Lanche`, `Jantar`
- hidratacao: `Adicionar`, `Corrigir total`

Isso aumenta carga cognitiva e deixa a tela "solta".

### 3. Fluxo de busca quebrado

Buscar e registrar deveriam ser um fluxo unico, mas hoje sao tres blocos independentes:

1. buscar
2. escolher resultado
3. compor quantidade/unidade/refeicao

No mobile isso vira scroll e perda de contexto.

### 4. Header bonito, mas caro

O hero atual reforca branding, mas rouba a primeira dobra do mobile. O dado util do dia fica abaixo de uma camada grande de decoracao e cards.

### 5. Desktop nao esta ruim, mas esta subaproveitado

O split atual em duas colunas preserva funcionalidade, porem nao cria uma estrutura de trabalho clara. Ainda parece uma pagina de varios paines, nao um workspace.

## Abordagens avaliadas

### Opcao A - Navegacao por tarefas com 3 workspaces

Recomendada.

Top level:

- `Hoje`
- `Buscar`
- `Planejar`

Dentro de `Planejar`:

- `Metas`
- `Cardapio`

Historico sai do topo e vira funcao secundaria dentro de `Hoje`.

### Opcao B - Uma pagina unica com accordions

Mais simples de implementar, mas mantem a sensacao de pagina longa e nao resolve bem o mobile.

### Opcao C - Wizard completo

Bom para onboarding ou montar cardapio, ruim para uso diario. Adiciona friccao demais.

## Decisao recomendada

Seguir com a **Opcao A**.

Ela reduz navegacao de primeiro nivel, separa tarefas frequentes de tarefas de configuracao e deixa o modulo mais claro no mobile sem sacrificar desktop.

## Nova arquitetura de informacao

### Mobile

#### Navegacao primaria

Barra fixa inferior com 3 entradas:

- `Hoje`
- `Buscar`
- `Planejar`

#### 1. Hoje

Tela default do modulo.

Conteudo:

- resumo compacto do dia no topo
- bloco rapido de agua
- cards de refeicao em sequencia:
  - cafe da manha
  - almoco
  - lanche
  - jantar
- CTA/card `Adicionar refeicao`
- cada card mostra:
  - kcal
  - quantidade de itens
  - CTA `Adicionar alimento`
  - CTA secundaria `Ver itens`
- acesso a `Historico` por botao/segmento no topo da tela, nao como tab principal

Regra:

- trocar as tabs de refeicao por cards empilhados
- usar expansao inline ou bottom sheet para detalhes da refeicao
- nao limitar a estrutura do dia apenas as 4 refeicoes base; elas viram defaults
- `Adicionar refeicao` cria um bloco extra nomeavel, como `Pre treino`, `Ceia` ou `Sobremesa`

#### 2. Buscar

Tela focada em descoberta e registro.

Estrutura:

- cabecalho curto
- switch de modo: `Nome`, `Codigo`, `Custom`
- campo principal
- lista de resultados

Quando o usuario seleciona um alimento:

- abrir um **bottom sheet de compositor**
- dentro do sheet:
  - alimento selecionado
  - macros
  - quantidade
  - unidade
  - refeicao
  - CTA `Adicionar ao diario`

Regra:

- o compositor deixa de ocupar espaco fixo na pagina
- resultados e composicao nao competem visualmente

#### 3. Planejar

Tela secundaria, orientada a configuracao.

Segmento interno:

- `Metas`
- `Cardapio`

##### Metas

Agrupar campos por secoes:

- energia
- macros
- agua
- objetivo

Com resumo compacto e CTA fixo `Salvar`.

##### Cardapio

Separar:

- configuracao de geracao
- resumo do plano
- lista de refeicoes

Cada refeicao como card expansivel. Em mobile, apenas um card aberto por vez.

### Desktop

Nao espelhar o mobile como coluna unica.

Usar uma shell de workspace:

- coluna esquerda: navegacao + resumo rapido
- coluna central: area principal da tarefa atual
- coluna direita: contexto auxiliar

Distribuicao sugerida:

- `Hoje`: refeicoes no centro, contexto/agua/resumo na direita
- `Buscar`: busca e resultados no centro, compositor fixo na direita
- `Planejar`: formulario ou geracao no centro, resumo/impacto na direita

## Ajustes visuais recomendados

### Direcao estetica

Manter a linguagem atual, mas com menos ruido:

- mesmo tema dark clinical
- menos glow no miolo da interface
- contraste maior nas areas de trabalho
- menos hero e mais densidade funcional

### Header novo

No mobile, substituir o header atual por:

- titulo
- data
- resumo em strip compacto:
  - kcal consumidas / meta
  - agua
  - proteina/carbo/gordura em chips

O detalhamento completo pode abrir via `Ver resumo`.

### Padrao de componentes

- `SegmentButton` fica para segmentos locais, nao para navegar a IA inteira
- cards de refeicao viram a unidade principal do diario
- o diario precisa aceitar cards dinamicos extras alem das refeicoes padrao
- bottom sheet vira a unidade principal de composicao
- formularios longos devem usar secoes com heading e spacing maior

## Mapa de componentes sugerido

- `NutritionShell`
- `NutritionTopSummary`
- `NutritionBottomNav`
- `TodayWorkspace`
- `MealCard`
- `AddMealCard`
- `MealItemsSheet`
- `SearchWorkspace`
- `SearchModeSwitch`
- `FoodComposerSheet`
- `PlanningWorkspace`
- `GoalSettingsSection`
- `MealPlanWorkspace`

## Ordem de implementacao

### Fase 1

- reduzir header mobile
- introduzir navegacao primaria nova
- manter logica atual por baixo

### Fase 2

- separar `Buscar` em fluxo de resultados + bottom sheet
- remover compositor inline da tela de busca

### Fase 3

- refatorar `Diario` para cards por refeicao
- mover historico para acesso secundario
- simplificar hidratacao
- adicionar suporte a refeicoes extras customizadas

### Fase 4

- juntar `Metas` e `Cardapio` sob `Planejar`
- reorganizar formularios

### Fase 5

- otimizar desktop com layout de workspace
- revisar estados vazios, loading e acessibilidade

## Criterios de sucesso

- mobile mostra acao principal na primeira dobra
- o usuario entende em menos de 3 segundos onde registrar alimento
- nenhuma tela mobile depende de mais de 2 niveis de tabs
- a composicao de alimento acontece sem scroll longo
- o usuario consegue adicionar uma refeicao fora das 4 categorias base sem friccao
- desktop ganha estrutura de trabalho clara, nao apenas paines lado a lado

## Observacao final

O problema principal do modulo nao e falta de estilo. E falta de **hierarquia de tarefas**.

Se a refatoracao comecar pela navegacao e pelo fluxo `buscar -> selecionar -> adicionar`, o restante tende a organizar naturalmente.
