# Feature Specification: Recentes por refeição em Nutrição

**Feature Branch**: `homologation`
**Created**: 2026-04-18
**Status**: Draft
**Input**: "planeje mudança para que alimentos Consumidos recentemente em nutrição,
sejam os recentemente para cada refeição, exemplo, consumidos recentemente no café
da manhã e listar até 15 está bom eu acho. se não tiver testes, antes crie
(sempre tdd)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recentes filtrados pela refeição em foco (Priority: P1)

Usuário abre a busca de alimentos com uma refeição em foco (ex.: Café da manhã)
e vê, em "Consumidos recentemente", apenas alimentos registrados antes naquela
mesma refeição.

**Independent Test**: Com histórico misto (café, almoço, jantar), abrir a busca
com foco em Café da manhã deve mostrar somente itens cujo `lastMealType` seja
`breakfast` (ou a chave customizada correspondente quando a refeição em foco for
customizada).

**Acceptance Scenarios**:

1. **Given** usuário tem itens recentes em múltiplas refeições, **When** abre a
   busca com Café da manhã em foco, **Then** a lista de recentes mostra apenas
   itens cujo `lastMealType` é `breakfast`.
2. **Given** usuário tem apenas itens recentes em Almoço, **When** abre a busca
   com Café da manhã em foco, **Then** a seção "Consumidos recentemente" não é
   renderizada (estado vazio silencioso).
3. **Given** usuário troca o foco de refeição na mesma sessão, **When** o foco
   muda para Jantar, **Then** a lista de recentes é recarregada e passa a mostrar
   apenas itens de Jantar.
4. **Given** a refeição em foco é customizada (`custom:pre-treino`), **When** a
   busca abre, **Then** apenas itens cujo `lastMealType` é `custom:pre-treino`
   aparecem.

### User Story 2 - Limite de 15 itens recentes (Priority: P2)

Usuário com muitos alimentos repetidos numa refeição vê até 15 itens distintos
por refeição, não mais apenas 8.

**Independent Test**: Com 20 itens únicos em Café da manhã, a API retorna no
máximo 15 itens ordenados por `lastConsumedAt` desc.

**Acceptance Scenarios**:

1. **Given** há mais de 15 `foodId` distintos consumidos em Café da manhã,
   **When** usuário abre recentes com foco em Café da manhã, **Then** vê 15
   itens (os mais recentes).
2. **Given** cliente envia `limit=20`, **When** a API valida, **Then** retorna
   `400` com mensagem limpa em português-BR, sem stack trace.

### Edge Cases

- Sem refeição em foco (busca aberta fora do contexto de uma refeição): manter
  comportamento atual (sem filtro de `mealType`).
- Mudança de foco enquanto a requisição anterior ainda está em voo: o resultado
  exibido DEVE corresponder ao último foco selecionado, não a uma resposta
  obsoleta.
- Persistência offline/local: o mesmo filtro DEVE se aplicar em modo volátil
  (browser storage) para manter paridade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API `GET /api/nutrition/foods/recent` MUST aceitar parâmetro
  opcional `mealType` seguindo o formato já validado em `mealTypeSchema`.
- **FR-002**: Quando `mealType` for informado, a resposta MUST conter apenas
  alimentos cujo `lastMealType` seja exatamente igual ao solicitado.
- **FR-003**: Quando `mealType` for omitido, o comportamento atual MUST ser
  preservado (todos os recentes do usuário, deduplicados por `foodId`).
- **FR-004**: O limite máximo de `limit` MUST ser 15 (default segue 8).
- **FR-005**: O caminho de persistência em browser (`listRecentNutritionFoodsFromBrowser`)
  MUST aceitar e aplicar o mesmo filtro de `mealType`.
- **FR-006**: O hook `useNutritionSearch` MUST repassar a refeição em foco
  (`searchMealContextRef`) ao carregar recentes e MUST recarregar quando o foco
  mudar.
- **FR-007**: A resposta MUST rejeitar `mealType` inválido com `400` e mensagem
  genérica sem vazar detalhes internos.
- **FR-008**: Textos visíveis MUST permanecer em português-BR limpo; nenhuma
  string de devnote, TODO ou termo técnico DEVE ser adicionada.

### Key Entities

- **RecentConsumedFood**: entidade existente; nenhuma mudança de formato.
- **RecentFoodsQuery**: query da API ganha campo opcional `mealType`.

## Success Criteria *(mandatory)*

- **SC-001**: Com refeição em foco selecionada, 100% dos itens exibidos em
  "Consumidos recentemente" pertencem àquela refeição.
- **SC-002**: Em testes unitários, a função de projeção retorna no máximo 15
  itens quando `limit=15` e existem mais de 15 únicos.
- **SC-003**: Trocar a refeição em foco atualiza a lista sem refresh manual.

## Documentation & README Impact *(mandatory)*

- **Technical Documentation**: Atualizar artefatos em `specs/homologation/`.
  Atualizar contrato em `specs/005-nutrition-recent-copy/contracts/recent-foods-api.md`
  para refletir o novo parâmetro opcional e o novo teto de `limit`.
- **README Impact**: Nenhuma mudança necessária; a feature refina comportamento
  interno já descrito genericamente como "alimentos recentes" na Nutrição. Será
  justificado no PR como "README sem alteração necessária".
- **Test Evidence Expected**: testes de validator, store (memória e DB),
  rota HTTP, client-storage e hook devem falhar antes da implementação.

## Assumptions

- O foco de refeição já é rastreado pelo hook (`searchMealContextRef`); basta
  propagá-lo à chamada de recentes.
- Deduplicação por `foodId` continua válida; ao filtrar por `mealType`, a
  dedup passa a considerar apenas itens daquela refeição.
- Nenhuma migração de schema é necessária.
