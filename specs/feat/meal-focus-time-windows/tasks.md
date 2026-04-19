# Tasks: Refeição em foco por faixa de horário

**Branch**: `feat/meal-focus-time-windows` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

TDD: testes escritos e verificados como RED antes da implementação (constituição v1.1.0).

## Phase 1: Setup

- [X] T001 Confirmar ambiente: `npm test -- --listTests | grep nutrition-screen-helpers` em `G:/Apps/MounTrack` retorna a suite existente; anotar o caminho exato para garantir que novos casos de teste serão adicionados ao arquivo certo (`src/components/nutrition/nutrition-screen-helpers.test.ts`).

## Phase 2: Foundational

*(nenhuma task bloqueadora — o helper puro será criado diretamente na fase da US1)*

## Phase 3: User Story 1 — Foco segue a faixa de horário (P1)

**Goal**: `getMealFocusForHour(hour, minute)` retorna a default correta para qualquer horário, incluindo todas as fronteiras.

**Independent Test**: `npm test -- nutrition-screen-helpers` cobre 10 casos de borda (00:00, 05:59, 06:00, 11:00, 11:01, 14:00, 14:01, 18:00, 18:01, 23:59) e 3 casos via `getDefaultFocusedMeal(now: Date)`.

### Tests (RED)

- [X] T002 [US1] Adicionar casos ao [nutrition-screen-helpers.test.ts](src/components/nutrition/nutrition-screen-helpers.test.ts) cobrindo todas as fronteiras de `getMealFocusForHour(hour, minute)`: 00:00→breakfast, 05:59→breakfast, 06:00→breakfast, 11:00→breakfast, 11:01→lunch, 14:00→lunch, 14:01→snack, 18:00→snack, 18:01→dinner, 23:59→dinner.
- [X] T003 [US1] Adicionar casos ao mesmo arquivo para `getDefaultFocusedMeal(now)`: `new Date("2026-04-18T07:30:00")`→breakfast, `…T11:01:00`→lunch, `…T00:10:00`→breakfast.

### Implementation (GREEN)

- [X] T004 [US1] Criar [meal-focus-windows.ts](src/modules/nutrition/meal-focus-windows.ts) com: constante `MEAL_FOCUS_WINDOWS` (minutos `0..660` breakfast, `661..840` lunch, `841..1080` snack, `1081..1439` dinner); função pura `getMealFocusForHour(hour: number, minute: number): DefaultMealType`; função `getMealFocusWindow(mealType: DefaultMealType): { start: number; end: number }`.
- [X] T005 [US1] Atualizar [nutrition-screen-helpers.ts](src/components/nutrition/nutrition-screen-helpers.ts): remover a tabela antiga; `getDefaultFocusedMeal(now)` passa a delegar ao novo helper via `getMealFocusForHour(now.getHours(), now.getMinutes())`. Remover `getMealFocusForHour` antigo (ou re-exportar do novo helper se houver outros callers).
- [X] T006 [P] [US1] Ajustar qualquer import quebrado em callers de `getMealFocusForHour` no projeto (`src/**/*.ts` / `*.tsx`) apontando para o novo módulo; manter API pública equivalente.

**Checkpoint**: US1 entregue quando T002–T006 passam em `npm test`.

## Phase 4: User Story 2 — Rotação automática ao cruzar fronteira (P1)

**Goal**: Auto-sync a cada 60s transita o foco ao cruzar fronteira mesmo após override manual; override expira ao fim da janela.

**Independent Test**: Teste de integração com `jest.useFakeTimers` em `NutritionScreen.test.tsx` simula override manual às 13:00 e avança relógio para 14:01; foco esperado: `snack`.

### Tests (RED)

- [X] T007 [US2] Adicionar teste em [NutritionScreen.test.tsx](src/components/nutrition/NutritionScreen.test.tsx): montar com `jest.useFakeTimers({ now: new Date("2026-04-18T13:00:00") })`, disparar troca manual para `breakfast`, `jest.setSystemTime(new Date("2026-04-18T14:01:00"))`, `jest.advanceTimersByTime(60_000)`, assertar que o estado/UI mostra `snack`.
- [X] T008 [US2] Adicionar teste no mesmo arquivo: override manual feito dentro da janela de `snack` (14:30) não é descartado ao avançar 5 min dentro da mesma janela (ex.: 14:35) — continua `snack` (override respeitado dentro da janela).

### Implementation (GREEN)

- [X] T009 [US2] Em [NutritionScreen.tsx](src/components/nutrition/NutritionScreen.tsx): substituir o guard `lastAutoSyncedMealRef` por `manualOverrideMinuteRef: React.MutableRefObject<number | null>`. No handler de troca manual (onde hoje atualiza `lastAutoSyncedMealRef`): gravar `manualOverrideMinuteRef.current = now.getHours()*60 + now.getMinutes()`.
- [X] T010 [US2] No efeito de `setInterval(60_000)` de [NutritionScreen.tsx](src/components/nutrition/NutritionScreen.tsx): a cada tick, calcular `nowMinutes` e comparar janela do override (via `getMealFocusWindow` aplicado ao `activeDiaryMeal` **e** ao `manualOverrideMinuteRef`) com a janela do `nowMinutes`. Se diferirem, aplicar `getDefaultFocusedMeal(new Date())` e zerar o ref. Caso contrário, manter.

**Checkpoint**: US2 entregue quando T007–T010 passam em `npm test`.

## Phase 5: User Story 3 — Refeições extras fora do fluxo de foco (P1)

**Goal**: `getDefaultFocusedMeal` nunca retorna `custom:*`; custom persistido é descartado na carga; custom continua disponível no seletor de "adicionar alimento".

**Independent Test**: Montar `NutritionScreen` com `localStorage` contendo `focusedMeal = "custom:pre-treino"`; foco inicial deve ser a default da janela atual; o seletor de adicionar alimento continua listando a custom.

### Tests (RED)

- [X] T011 [US3] Em [NutritionScreen.test.tsx](src/components/nutrition/NutritionScreen.test.tsx): pré-popular `window.localStorage` com valor persistido `custom:pre-treino` via `saveNutritionFocusedMealToBrowser`; montar a tela com `jest.useFakeTimers({ now: new Date("2026-04-18T12:00:00") })`; assertar que o foco inicial é `lunch`, não `custom:pre-treino`.
- [X] T012 [P] [US3] Em [nutrition-screen-helpers.test.ts](src/components/nutrition/nutrition-screen-helpers.test.ts): assertar que `getDefaultFocusedMeal` nunca retorna um valor `custom:*` — cobrir cobrindo o tipo de retorno como `DefaultMealType` (teste de contrato).
- [X] T013 [US3] Em [MealSwitchDialog.test.tsx](src/components/nutrition/MealSwitchDialog.test.tsx) (ou equivalente do seletor de adicionar alimento): manter/adicionar asserção de que refeições custom continuam listadas como opção manual.

### Implementation (GREEN)

- [X] T014 [US3] Em [NutritionScreen.tsx](src/components/nutrition/NutritionScreen.tsx), dentro do efeito de carga (linhas ~443–468): após `loadNutritionFocusedMealFromBrowser(userId)`, se o valor for `custom:*`, ignorar e usar `getDefaultFocusedMeal(new Date())`. Se for default, aceitar **apenas se** pertencer à mesma janela atual (usar `getMealFocusWindow`); caso contrário, usar `getDefaultFocusedMeal(new Date())`.
- [X] T015 [US3] Garantir que o tipo de retorno de `getDefaultFocusedMeal` é `DefaultMealType` (não `MealType`) em [meal-focus-windows.ts](src/modules/nutrition/meal-focus-windows.ts) e que os callers aceitam o estreitamento sem erro de tipo. Ajustar conversões se necessário.

**Checkpoint**: US3 entregue quando T011–T015 passam e as suites anteriores continuam verdes.

## Phase 6: Polish & Cross-Cutting

- [X] T016 Rodar `npm test` em `G:/Apps/MounTrack` e corrigir eventuais regressões em testes pré-existentes que dependiam das janelas antigas (ex.: testes que afirmam `lunch` às 12:00 — continuam válidos; testes que afirmam `snack` às 17:00 — continuam válidos; casos entre 11:01–11:59 e 14:01 passam a ser diferentes).
- [X] T017 Rodar `npm run lint` em `G:/Apps/MounTrack` e zerar erros introduzidos.
- [X] T018 Atualizar tabela do README se houver referência a janelas de foco (grep `README.md` por "refeição em foco" ou "breakfast"); caso não haja, deixar registrado no PR "README sem alteração necessária".
- [X] T019 Verificar `docs/` por documento de foco (grep por `focused meal`/`refeição em foco`); atualizar ou criar nota curta apontando para este spec em `specs/feat/meal-focus-time-windows/`.

## Dependency Graph

```
Phase 1 (Setup: T001)
   └→ Phase 3 (US1: T002,T003 → T004 → T005 → T006)
         └→ Phase 4 (US2: T007,T008 → T009 → T010)
               └→ Phase 5 (US3: T011,T012,T013 → T014 → T015)
                     └→ Phase 6 (Polish: T016 → T017 → T018,T019)
```

- US1 precisa vir antes de US2/US3 porque provê o helper puro `getMealFocusWindow`.
- T006 (ajuste de imports) pode rodar em paralelo com T005 se forem arquivos distintos — por isso `[P]`.
- T012 pode rodar em paralelo com T011 (arquivos diferentes) — `[P]`.
- T018 e T019 podem rodar em paralelo entre si no fim.

## Parallel Opportunities

- Dentro da US1: escrever T002 e T003 em uma sessão (mesmo arquivo, sequencial). T006 paraleliza com T005.
- Dentro da US3: T011, T012, T013 podem ser escritos em paralelo (arquivos distintos).
- Dentro da Polish: T018 e T019 em paralelo.

## Implementation Strategy

- **MVP** = US1 (janelas corretas no helper puro). Mesmo antes do auto-sync novo, a experiência já melhora porque a carga inicial e trocas manuais passam a cair na janela certa.
- **Incremento 1** = US2 (rotação real após cruzar fronteira). Resolve o bug principal do usuário ("foco trava").
- **Incremento 2** = US3 (custom fora do foco rotativo). Elimina o segundo caminho de travamento.

## Validation Checklist

- Todos os itens seguem `- [ ] Tnnn [P?] [US?] descrição com caminho`.
- Cada tarefa referencia arquivos concretos em `G:/Apps/MounTrack`.
- Cada US tem testes (RED) antes da implementação (GREEN).
- Cada US tem critério independente de teste e checkpoint.
