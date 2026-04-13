# Feature Specification: Atalhos de alimentos recentes e cópia entre refeições

**Feature Branch**: `005-nutrition-recent-copy`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "criar em nutrição duas novas funções: alimentos consumidos recentemente(para ter mais rapidez caso vá consumir o mesmo alimento) e na mesma linha, copiar alimento para outra refeição. Lembre de não deixar devnotes visível para usuários e manter padrão limpo de escrita em português-Br"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar alimento recente rapidamente (Priority: P1)

Usuário abre a área de nutrição e encontra uma lista curta de alimentos consumidos
recentemente para registrar novamente sem repetir a busca manual.

**Why this priority**: Reduz atrito no fluxo diário mais recorrente do módulo de
nutrição.

**Independent Test**: Com histórico de alimentos anteriores, abrir a busca de
alimentos deve exibir "Consumidos recentemente"; tocar em um item deve registrar
o alimento na refeição em foco com a última quantidade usada.

**Acceptance Scenarios**:

1. **Given** usuário possui alimentos consumidos nos últimos registros, **When**
   abre a busca de alimentos, **Then** vê uma lista "Consumidos recentemente" com
   nomes, quantidade, refeição de origem e calorias.
2. **Given** usuário toca em um alimento recente, **When** confirma o registro
   rápido, **Then** o alimento é adicionado ao diário do dia na refeição em foco.
3. **Given** usuário não possui histórico alimentar, **When** abre a busca,
   **Then** nenhum texto técnico ou devnote aparece; a interface mantém a
   mensagem limpa de busca normal.
4. **Given** usuário envia uma busca por alimento, **When** resultados do
   catálogo retornam, **Then** os resultados buscados aparecem antes dos
   atalhos recentes, e "Recentes" fica disponível como opção separada de filtro
   ou origem.

---

### User Story 2 - Copiar alimento para outra refeição na mesma linha (Priority: P1)

Usuário vê um alimento já registrado no diário e usa uma ação na própria linha do
item para copiá-lo para outra refeição do mesmo dia.

**Why this priority**: Complementa o registro rápido e evita que refeições
repetidas precisem ser cadastradas novamente.

**Independent Test**: Em uma refeição com item registrado, acionar "Copiar" na
linha do alimento, escolher outra refeição e confirmar deve criar um novo item
com a mesma quantidade, unidade e valores nutricionais no destino escolhido.

**Acceptance Scenarios**:

1. **Given** existe um item em "Café da manhã", **When** usuário escolhe
   "Copiar" na linha do item e seleciona "Almoço", **Then** o mesmo alimento
   aparece em "Almoço" sem remover o item original.
2. **Given** item copiado com sucesso, **When** totais do dia são recalculados,
   **Then** a refeição de destino e o resumo diário refletem o novo item.
3. **Given** a cópia falha por sessão expirada ou indisponibilidade da base,
   **When** a ação termina, **Then** a mensagem exibida é clara em português-BR e
   não expõe termos internos.

---

### User Story 3 - Copiar alimento a partir do histórico recente (Priority: P2)

Usuário registra novamente um alimento vindo de outro dia sem precisar abrir a
data anterior nem buscar o alimento no catálogo.

**Why this priority**: Aumenta a utilidade da lista de recentes quando o consumo
é repetido em dias diferentes.

**Independent Test**: Um item consumido ontem aparece nos recentes; ao registrá-lo
hoje, o diário de hoje recebe uma cópia com novo identificador e horário atual.

**Acceptance Scenarios**:

1. **Given** alimento foi consumido em data anterior, **When** usuário registra a
   partir de "Consumidos recentemente", **Then** o item é copiado para a data
   atual com novo `id` e novo `consumedAt`.
2. **Given** o alimento recente veio de uma refeição customizada que não existe no
   dia atual, **When** usuário registra na refeição em foco, **Then** o destino
   usa a refeição escolhida no dia atual.

---

### User Story 4 - Buscar sem recentes ocupando o topo (Priority: P1)

Usuário envia uma busca por alimento e vê primeiro os resultados pesquisados,
mantendo recentes como opção secundária.

**Why this priority**: Em mobile, recentes acima dos resultados empurram a
resposta da busca para baixo e fazem parecer que a busca não trouxe o que foi
pedido.

**Independent Test**: Com recentes carregados e uma busca por "arroz" retornando
resultados, a área de resultados deve aparecer antes de qualquer lista de
recentes; a opção "Recentes" deve estar disponível como filtro separado.

**Acceptance Scenarios**:

1. **Given** usuário possui recentes, **When** ainda não enviou busca, **Then**
   vê "Consumidos recentemente" como atalho.
2. **Given** usuário envia uma busca válida, **When** resultados do catálogo
   retornam, **Then** os resultados buscados aparecem primeiro.
3. **Given** usuário está em uma busca ativa, **When** seleciona "Recentes",
   **Then** vê os alimentos recentes filtrados pelo termo buscado, quando houver
   correspondência.

---

### User Story 5 - Investigar e priorizar FatSecret Brasil (Priority: P1)

Usuário busca alimentos comuns no Brasil e recebe resultados brasileiros ou em
português antes de resultados internacionais quando o FatSecret permitir
localização para `BR`/`pt`.

**Why this priority**: A qualidade da busca é central para o diário alimentar; se
FatSecret retorna itens de fora do Brasil como primeira resposta, o registro fica
mais lento e menos confiável.

**Independent Test**: Uma busca simulada com respostas localizada `BR/pt` e
default `US/en` deve priorizar os itens localizados. Quando a resposta localizada
falhar ou vier vazia, o fallback internacional pode aparecer, mas não deve ser
marcado artificialmente como `countryCode="BR"`.

**Acceptance Scenarios**:

1. **Given** FatSecret localizado retorna itens brasileiros, **When** busca é
   executada, **Then** esses itens aparecem antes dos resultados default.
2. **Given** FatSecret localizado retorna vazio ou erro por falta de permissão,
   **When** fallback default é usado, **Then** o sistema registra diagnóstico
   técnico e não rotula os itens default como brasileiros.
3. **Given** busca por alimento comum no Brasil, **When** existem resultados
   locais em TBCA/catálogo e FatSecret só traz itens internacionais, **Then** o
   ranking não deve deixar resultados internacionais irrelevantes acima dos
   resultados brasileiros mais aderentes.

---

### Edge Cases

- Histórico vazio: não renderizar seção vazia chamativa; manter texto limpo de
  busca.
- Mesmo alimento consumido várias vezes: mostrar apenas a ocorrência mais recente
  por alimento, preservando a última quantidade e unidade.
- Alimento copiado para a mesma refeição: permitir somente se o usuário confirmar
  explicitamente ou manter a ação desabilitada para evitar duplicidade acidental.
- Item de refeição customizada: copiar para qualquer refeição disponível no dia
  de destino, incluindo customizadas existentes.
- Modo sem banco sincronizado: manter compatibilidade com persistência local do
  navegador.
- Erros de autenticação, 404 ou falha de rede: mensagens em português-BR, sem
  stack trace, devnote, código interno ou texto em inglês visível ao usuário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST listar alimentos consumidos recentemente do usuário
  autenticado, ordenados pelo consumo mais recente.
- **FR-002**: A lista de recentes MUST ser deduplicada por alimento, usando a
  ocorrência mais recente como referência de quantidade, unidade, calorias e
  refeição de origem.
- **FR-003**: O sistema MUST permitir registrar rapidamente um alimento recente
  na data ativa e na refeição em foco.
- **FR-004**: O sistema MUST permitir copiar um item existente do diário para
  outra refeição sem alterar ou remover o item original.
- **FR-005**: A cópia MUST criar novo `id`, novo `consumedAt` por padrão e manter
  `foodId`, `foodName`, `quantity`, `unit` e totais nutricionais proporcionais do
  item original.
- **FR-006**: A ação de copiar MUST atualizar totais da refeição de destino, totais
  do dia e histórico sem exigir refresh manual.
- **FR-007**: A UI MUST exibir textos finais em português-BR limpo, sem devnotes,
  TODOs, mensagens técnicas ou termos internos.
- **FR-008**: A UI MUST manter acessibilidade mínima: botões com `aria-label`
  descritivo para copiar, editar, remover e registrar recente.
- **FR-009**: O backend MUST validar autenticação e escopo do usuário antes de
  retornar recentes ou copiar item.
- **FR-010**: O fluxo MUST manter compatibilidade com banco PostgreSQL e fallback
  local do navegador.
- **FR-011**: Após submissão de busca, a UI MUST priorizar visualmente os
  resultados buscados; alimentos recentes MUST aparecer somente como opção
  secundária, filtro ou origem selecionável, sem ocupar o espaço principal acima
  dos resultados.
- **FR-012**: O filtro de fontes da busca MUST permitir selecionar `Recentes`
  durante busca ativa sem misturar recentes ao resultado `Todos`.
- **FR-013**: O provedor FatSecret MUST enviar e testar `region=BR` e
  `language=pt` nas passagens localizadas, mantendo fallback default separado.
- **FR-014**: Resultados FatSecret vindos de fallback default sem região não
  MUST ser rotulados como `locale="pt-BR"` ou `countryCode="BR"` sem evidência.
- **FR-015**: O ranking MUST priorizar resultados brasileiros/português quando
  disponíveis e reduzir a precedência de resultados internacionais irrelevantes.

### Key Entities *(include if feature involves data)*

- **RecentConsumedFood**: Projeção de um item consumido anteriormente, com
  `sourceItemId`, `foodId`, `foodName`, `quantity`, `unit`, `calories`,
  `lastConsumedAt`, `lastMealType` e `lastMealLabel`.
- **DiaryItemCopyRequest**: Pedido de cópia com `targetDate`, `targetMealType`,
  `targetMealLabel` opcional e `consumedAt` opcional.
- **DiaryItemSnapshot**: Entidade existente usada como fonte de cópia e como item
  persistido no diário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário consegue registrar novamente um alimento recente em até 2
  toques a partir da busca de alimentos.
- **SC-002**: Usuário consegue copiar um alimento de uma refeição para outra em
  até 3 toques a partir da linha do item.
- **SC-003**: 100% das mensagens novas visíveis ao usuário estão em português-BR
  e não contêm devnotes, TODOs, stack traces ou termos internos.
- **SC-004**: Após copiar ou registrar recente, totais de refeição e dia são
  atualizados sem refresh manual.
- **SC-005**: Após uma busca submetida em mobile, o primeiro bloco de resultado
  visível corresponde aos alimentos buscados, não à lista de recentes.
- **SC-006**: Em testes simulados, resultados FatSecret `BR/pt` aparecem antes
  de resultados default `US/en` para a mesma busca.
- **SC-007**: Resultados FatSecret default sem localização não recebem
  `countryCode="BR"` automaticamente.

## Documentation & README Impact *(mandatory)*

- **Technical Documentation**: Criar e manter artefatos desta feature em
  `specs/005-nutrition-recent-copy/`; atualizar contratos de API desta pasta.
- **README Impact**: README deve ser atualizado na implementação, pois a feature
  altera capacidades visíveis do produto em Nutrição.
- **Test Evidence Expected**: Testes de rota, repositório/serviço e componentes
  devem ser escritos antes da implementação e executados com `npm test`.

## Assumptions

- A lista de recentes pode ser derivada de `nutrition_diary_items`; nenhuma nova
  tabela é necessária na primeira versão.
- Registrar um alimento recente reutiliza o mesmo mecanismo de cópia do item
  anterior para evitar nova busca no catálogo.
- A primeira versão prioriza registrar com a última quantidade consumida; ajuste
  fino de quantidade pode continuar pelo fluxo de edição existente.
- A cópia entre refeições acontece no diário atual; cópia retroativa pode usar o
  mesmo contrato quando o fluxo retroativo passar `targetDate`.
- "Todos" representa fontes de catálogo durante busca ativa; recentes não entram
  em "Todos" por padrão para evitar duplicidade e preservar clareza da busca.
- A localização FatSecret depende de suporte da conta/plano; se a API ignorar ou
  negar localização, o app deve diagnosticar e cair para fontes brasileiras
  internas/TBCA quando forem mais relevantes.
