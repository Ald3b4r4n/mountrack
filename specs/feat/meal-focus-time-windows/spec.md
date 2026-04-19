# Feature Specification: Refeição em foco por faixa de horário

**Feature Branch**: `feat/meal-focus-time-windows`
**Created**: 2026-04-18
**Status**: Draft
**Input**: "ainda tenho muito erro com 'Refeição em foco' pois havia definido que
cada refeição tinha uma faixa de horarios pra estar em foco, café da mnhã entre
06-11 da manhã, almoço entre 11:01 e 14h, lanche entre 14:01 e 18, jantar entre
18-00 horas, sendo que após meia noite ja poderia rotacionar denovo pra café da
manhã, e também opção de criar refeições extras(estas não entrariam no fluxo do
foco, teriam que ser selecionadas na hora de adicionar o alimento)"

## Context atual (bug)

- `getMealFocusForHour` em
  [nutrition-screen-helpers.ts:110](src/components/nutrition/nutrition-screen-helpers.ts:110)
  usa faixas incorretas: breakfast 00–11, lunch 12–13, snack 14–17, dinner 18–23.
- Não existe gap de 11:01 às 14:00 nem janela dedicada 14:01–18:00.
- Auto-sync por `setInterval(60s)` em
  [NutritionScreen.tsx:594](src/components/nutrition/NutritionScreen.tsx:594) é
  inibido por guard `lastAutoSyncedMealRef` após troca manual. Resultado:
  foco trava numa refeição e não rotaciona mesmo após cruzar a fronteira de
  janela seguinte.
- Refeições customizadas (`custom:...`) entram na mesma pool que as default e
  podem ser escolhidas como foco automático via definição de diário; o usuário
  quer que custom seja **apenas manual** no fluxo de adicionar alimento.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Foco segue a faixa de horário (Priority: P1)

**Independent Test**: Com relógio em cada janela, o foco padrão deve ser:

| Hora local | Foco esperado |
|------------|---------------|
| 00:00–05:59 | breakfast (rotação pós-meia-noite) |
| 06:00–11:00 | breakfast |
| 11:01–14:00 | lunch |
| 14:01–18:00 | snack |
| 18:01–23:59 | dinner |

**Acceptance Scenarios**:

1. **Given** horário 07:30, **When** usuário abre Nutrição, **Then** a refeição
   em foco é `breakfast`.
2. **Given** horário 11:00, **When** usuário abre Nutrição, **Then** `breakfast`.
3. **Given** horário 11:01, **When** usuário abre Nutrição, **Then** `lunch`.
4. **Given** horário 14:00, **When** usuário abre Nutrição, **Then** `lunch`.
5. **Given** horário 14:01, **When** usuário abre Nutrição, **Then** `snack`.
6. **Given** horário 18:00, **When** usuário abre Nutrição, **Then** `snack`.
7. **Given** horário 18:01, **When** usuário abre Nutrição, **Then** `dinner`.
8. **Given** horário 23:59, **When** usuário abre Nutrição, **Then** `dinner`.
9. **Given** horário 00:10, **When** usuário abre Nutrição, **Then** `breakfast`
   (rotação pós-meia-noite).

### User Story 2 - Rotação automática ao cruzar fronteira (Priority: P1)

**Independent Test**: Com tela aberta, ao cruzar de 14:00 para 14:01 o foco
transita automaticamente de `lunch` para `snack` sem interação do usuário,
mesmo que haja alteração manual prévia **na mesma janela**.

**Acceptance Scenarios**:

1. **Given** foco é `lunch` (janela 11:01–14:00), **When** o relógio avança para
   14:01, **Then** o foco transita para `snack` dentro de 60s.
2. **Given** usuário mudou manualmente de `lunch` para `breakfast` às 12:30,
   **When** o relógio avança para 14:01, **Then** o foco transita para `snack`
   (nova janela descarta o override manual anterior).
3. **Given** usuário escolheu manualmente `snack` em refeição cujo tempo já
   pertence à janela de `snack`, **When** relógio avança dentro da mesma janela,
   **Then** o foco permanece em `snack` (override persiste dentro da janela).

### User Story 3 - Refeições extras fora do fluxo de foco (Priority: P1)

**Independent Test**: Criar uma refeição custom (`custom:pre-treino`) e verificar
que ela **não** é escolhida como foco automático em nenhum horário; ela só
aparece como destino no momento de adicionar alimento.

**Acceptance Scenarios**:

1. **Given** existe custom `custom:pre-treino`, **When** o relógio está em
   qualquer horário, **Then** a função de foco automático retorna sempre uma
   das 4 default (`breakfast|lunch|snack|dinner`).
2. **Given** usuário adiciona alimento, **When** abre o seletor de refeição,
   **Then** vê todas as refeições (defaults + customs) como opção.
3. **Given** usuário escolhe `custom:pre-treino` manualmente como foco,
   **Then** o foco aceita e persiste, mas ao cruzar fronteira de janela o foco
   retorna para a refeição default daquela janela.
4. **Given** carga inicial com custom persistido como foco de sessão anterior,
   **When** usuário abre Nutrição, **Then** o foco é recalculado pela janela
   atual (default), não reusa o custom persistido.

### Edge Cases

- Fuso horário: usar horário local do dispositivo.
- Mudança de horário de verão: irrelevante — recálculo a cada minuto corrige
  automaticamente.
- Custom sem nenhum default (impossível hoje, defaults são sempre criadas):
  cair para `breakfast`.
- Offline: mesmo comportamento, relógio local.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `getMealFocusForHour(hour, minute)` DEVE retornar a refeição
  default de acordo com a tabela da US1.
- **FR-002**: A função DEVE aceitar `hour: 0..23` e `minute: 0..59` e ser pura
  (sem `new Date()` dentro). `getDefaultFocusedMeal(now: Date)` continua sendo
  o ponto que lê o relógio.
- **FR-003**: O auto-sync DEVE rodar a cada 60s e transitar o foco quando a
  janela atual for diferente da janela anterior, **mesmo se o usuário fez
  override manual na janela anterior**. O override manual só dura até o fim
  daquela janela.
- **FR-004**: `getDefaultFocusedMeal` DEVE retornar apenas uma das 4
  `DefaultMealType` (`breakfast|lunch|snack|dinner`), nunca uma `custom:...`.
- **FR-005**: Ao carregar a tela, se o foco persistido é `custom:...`, a UI
  DEVE recalcular pela janela atual e ignorar o valor persistido (para o foco
  rotativo). A custom ainda é válida como destino manual de adicionar alimento.
- **FR-006**: A lista de refeições no seletor de "adicionar alimento" DEVE
  mostrar defaults + customs; o foco rotativo é só sobre defaults.
- **FR-007**: Não persistir custom como foco rotativo. Pode persistir como
  override manual, mas com expiração na próxima fronteira de janela.
- **FR-008**: Mensagens e rótulos DEVEM permanecer em português-BR limpo.

### Key Entities

- **MealFocusWindow**: nova estrutura pura com `{ mealType: DefaultMealType,
  startMinutes: number, endMinutes: number }` (minutos do dia).
- **MealFocusState** (cliente): `{ current: MealType, manualOverrideWindow?:
  MealFocusWindow }` — override lembra a janela onde foi aplicado; expira ao
  cruzar.
- `DefaultMealType` e `CustomMealType`: sem mudança.

## Success Criteria *(mandatory)*

- **SC-001**: Testes unitários cobrem os 9 pontos da US1, incluindo fronteiras
  exatas (06:00, 11:00, 11:01, 14:00, 14:01, 18:00, 18:01, 23:59, 00:00).
- **SC-002**: Teste simula avanço de relógio por `jest.useFakeTimers()` e
  valida transição automática às fronteiras (US2.1 e US2.2).
- **SC-003**: Teste verifica que `getDefaultFocusedMeal` nunca retorna
  `custom:...` mesmo com customs presentes na lista de definições.
- **SC-004**: UX manual: abrir em diferentes horários e confirmar que o foco
  cai na janela correta.

## Documentation & README Impact *(mandatory)*

- **Technical Documentation**: artefatos em
  `specs/feat/meal-focus-time-windows/`. Atualizar
  `docs/` se houver doc sobre foco (verificar na implementação; caso contrário,
  documentar aqui).
- **README Impact**: sem mudança esperada — comportamento de UX interno.
  Justificar como "README sem alteração necessária" no PR.
- **Test Evidence Expected**: novos testes em
  `src/components/nutrition/nutrition-screen-helpers.test.ts` e teste de
  integração no `NutritionScreen.test.tsx` cobrindo override e rotação.

## Assumptions

- Faixa 00:00–05:59 mapeia para `breakfast` (rotação pós-meia-noite como pedido).
- Granularidade de 1 minuto é suficiente; não há foco que mude em segundos.
- Timer de 60s continua. Não vamos migrar para `setTimeout` alinhado — a
  precisão de 1 min é aceitável.
- Custom persistido como foco em sessão anterior é descartado na carga (FR-005).
  Isso previne o estado travado que o usuário reporta.
