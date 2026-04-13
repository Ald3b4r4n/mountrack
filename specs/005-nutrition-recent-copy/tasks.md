# Tasks: Atalhos de alimentos recentes e cópia entre refeições

**Input**: Design documents from `/specs/005-nutrition-recent-copy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Mandatory. Write failing tests first, verify red state, then implement.

**Organization**: Tasks are grouped by user story so each story can be validated
as an independent increment after the foundational copy primitive is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or only reads.
- **[Story]**: User-story label for story phases only.
- Every task includes an exact repository path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the implementation surface and prevent drift from the plan.

- [X] T001 Review existing diary item creation, update, delete, and history flows in `src/modules/nutrition/repositories/nutrition-store.ts`
- [X] T002 [P] Review current nutrition UI wiring for diary rows and search panels in `src/components/nutrition/NutritionScreen.tsx`
- [X] T003 [P] Confirm no new npm dependency is needed and record any deviation in `specs/005-nutrition-recent-copy/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix existing quality blockers and create the shared copy primitive
required by US1, US2, and US3.

**Critical**: No user story work should begin until this phase is complete.

- [X] T004 [P] Add a regression test that rerenders mobile `NutritionHeader` with and without meal callbacks in `src/components/nutrition/NutritionHeader.test.tsx`
- [X] T005 Fix conditional React hooks by moving hooks before conditional returns or extracting guarded components in `src/components/nutrition/NutritionHeader.tsx`
- [X] T006 [P] Add `DiaryItemCopyRequest` and `RecentConsumedFood` domain types in `src/modules/nutrition/domain/types.ts`
- [X] T007 [P] Add Zod schemas for recent query and copy request validation in `src/modules/nutrition/validators.ts`
- [X] T008 [P] Add failing repository tests for `copyDiaryItem` preserving source item and creating a new item in `src/modules/nutrition/repositories/nutrition-store.test.ts`
- [X] T009 [P] Add failing browser-storage tests for copying a diary item locally in `src/modules/nutrition/client-storage.test.ts`
- [X] T010 Implement `copyDiaryItem` for PostgreSQL and memory storage in `src/modules/nutrition/repositories/nutrition-store.ts`
- [X] T011 Implement browser-storage copy helper for volatile mode in `src/modules/nutrition/client-storage.ts`
- [X] T012 [P] Add failing contract tests for `POST /api/nutrition/diary-items/[id]/copy` in `src/app/api/nutrition/diary-items/[id]/copy/route.test.ts`
- [X] T013 Implement `POST /api/nutrition/diary-items/[id]/copy` with auth, validation, 404 scoping, and 201 response in `src/app/api/nutrition/diary-items/[id]/copy/route.ts`
- [X] T014 Run `npm run lint` and confirm the hook errors are gone for `src/components/nutrition/NutritionHeader.tsx`

**Checkpoint**: Shared copy behavior works in database mode, memory mode, and local browser fallback; lint no longer fails on conditional hooks.

---

## Phase 3: User Story 1 - Registrar alimento recente rapidamente (Priority: P1)

**Goal**: User sees recently consumed foods in nutrition search and can register one quickly in the active meal.

**Independent Test**: With existing diary history, opening food search shows
"Consumidos recentemente"; selecting a recent food creates a new diary item in
the active meal with the last quantity and unit.

### Tests for User Story 1 (MANDATORY - write first)

- [X] T015 [P] [US1] Add failing repository tests for `listRecentConsumedFoods` ordering and dedupe in `src/modules/nutrition/repositories/nutrition-store.test.ts`
- [X] T016 [P] [US1] Add failing browser-storage tests for recent-food listing in `src/modules/nutrition/client-storage.test.ts`
- [X] T017 [P] [US1] Add failing route tests for `GET /api/nutrition/foods/recent` auth, limit, and response shape in `src/app/api/nutrition/foods/recent/route.test.ts`
- [X] T018 [P] [US1] Add failing UI tests for the "Consumidos recentemente" section and no-devnote empty state in `src/components/nutrition/FoodSearchPanel.test.tsx`

### Implementation for User Story 1

- [X] T019 [US1] Implement `listRecentConsumedFoods` with user scoping, ordering, and `foodId` dedupe in `src/modules/nutrition/repositories/nutrition-store.ts`
- [X] T020 [US1] Implement browser-storage recent-food listing for volatile mode in `src/modules/nutrition/client-storage.ts`
- [X] T021 [US1] Implement `GET /api/nutrition/foods/recent` with `limit` validation and storage headers in `src/app/api/nutrition/foods/recent/route.ts`
- [X] T022 [US1] Add recent-food state, loading, and fetch action to search flow in `src/modules/nutrition/hooks/useNutritionSearch.ts`
- [X] T023 [US1] Render recent foods with Portuguese-BR labels and register callback in `src/components/nutrition/FoodSearchPanel.tsx`
- [X] T024 [US1] Wire recent-food registration through the copy endpoint and dashboard/history refresh in `src/components/nutrition/NutritionScreen.tsx`

**Checkpoint**: US1 is complete when a user can register a recent food from search without manual search and without visible technical text.

---

## Phase 4: User Story 2 - Copiar alimento para outra refeição na mesma linha (Priority: P1)

**Goal**: User copies an existing diary row to another meal from the same row without changing the original item.

**Independent Test**: In a meal with a diary item, clicking "Copiar", selecting a
target meal, and confirming creates a new item in the target meal and keeps the
source item unchanged.

### Tests for User Story 2 (MANDATORY - write first)

- [X] T025 [P] [US2] Add failing `DiaryItemRow` test for the `Copiar` action and Portuguese-BR `aria-label` in `src/components/nutrition/DiaryItemRow.test.tsx`
- [X] T026 [P] [US2] Add failing dialog or meal chooser tests for selecting copy target meal in `src/components/nutrition/MealSwitchDialog.test.tsx`
- [X] T027 [P] [US2] Add failing screen-level test for copying an item and refreshing meal totals in `src/components/nutrition/NutritionScreen.test.tsx`

### Implementation for User Story 2

- [X] T028 [US2] Add optional `onCopy` prop and `Copiar` row button to `src/components/nutrition/DiaryItemRow.tsx`
- [X] T029 [US2] Add copy target selection state and clean Portuguese-BR copy messages in `src/components/nutrition/useNutritionScreenUiState.ts`
- [X] T030 [US2] Implement copy handler that calls `POST /api/nutrition/diary-items/[id]/copy` and refreshes dashboard/history in `src/components/nutrition/useNutritionScreenActions.ts`
- [X] T031 [US2] Pass copy handlers through today workspace desktop flow in `src/components/nutrition/TodayWorkspace.tsx`
- [X] T032 [US2] Pass copy handlers through mobile header meal list in `src/components/nutrition/NutritionHeader.tsx`
- [X] T033 [US2] Pass copy handlers through retroactive/history row usage without exposing route names to users in `src/components/nutrition/RetroactiveDiaryView.tsx`

**Checkpoint**: US2 is complete when a copied item appears in the target meal, source item remains unchanged, and totals update without refresh.

---

## Phase 5: User Story 3 - Copiar alimento a partir do histórico recente (Priority: P2)

**Goal**: User can reuse a food consumed on a previous date from the recent list and register it today in the focused meal.

**Independent Test**: A food consumed yesterday appears in recent foods; selecting
it today creates a new item with new `id`, current `consumedAt`, and the active
meal as destination.

### Tests for User Story 3 (MANDATORY - write first)

- [X] T034 [P] [US3] Add failing repository test for recent source from previous date copied to current target date in `src/modules/nutrition/repositories/nutrition-store.test.ts`
- [X] T035 [P] [US3] Add failing route test for copying a previous-date item into today's target meal in `src/app/api/nutrition/diary-items/[id]/copy/route.test.ts`
- [X] T036 [P] [US3] Add failing UI test that a recent item from a custom source meal registers into the active meal in `src/components/nutrition/FoodSearchPanel.test.tsx`

### Implementation for User Story 3

- [X] T037 [US3] Ensure `copyDiaryItem` overwrites source meal/date with target date and target meal in `src/modules/nutrition/repositories/nutrition-store.ts`
- [X] T038 [US3] Ensure local browser copy helper overwrites source meal/date with target date and target meal in `src/modules/nutrition/client-storage.ts`
- [X] T039 [US3] Ensure recent-food registration passes active meal label and today's date from `src/components/nutrition/NutritionScreen.tsx`

**Checkpoint**: US3 is complete when recent foods from prior dates can be reused today without preserving stale source meal context.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, security planning, final validation, and user-facing copy review.

- [X] T040 [P] Update nutrition feature summary for recent foods and copy actions in `README.md`
- [X] T041 [P] Update contracts if implementation changes response fields or validation in `specs/005-nutrition-recent-copy/contracts/recent-foods-api.md`
- [X] T042 [P] Update copy contract if implementation changes response fields or validation in `specs/005-nutrition-recent-copy/contracts/diary-item-copy-api.md`
- [X] T043 Scan new user-facing strings for devnotes, TODOs, route names, stack traces, and English error copy in `src/components/nutrition/FoodSearchPanel.tsx`, `src/components/nutrition/DiaryItemRow.tsx`, and `src/components/nutrition/NutritionHeader.tsx`
- [X] T044 Run `npm audit --audit-level=high` and update the upgrade/mitigation plan without using `npm audit fix --force` blindly in `docs/dependency-audit-notes.md`
- [X] T045 Run all nutrition-related tests from quickstart and record any failures in `specs/005-nutrition-recent-copy/quickstart.md`
- [X] T046 Run `npm test` using the root script defined in `package.json`
- [X] T047 Run `npm run lint` using the root script defined in `package.json`
- [X] T048 Run `npm run build` using the root script defined in `package.json`
- [X] T049 Fix mobile overflow in recently consumed food cards and add regression coverage in `src/components/nutrition/FoodSearchPanel.tsx`

---

## Phase 7: User Story 4 - Buscar sem recentes ocupando o topo (Priority: P1)

**Goal**: Após uma busca submetida, resultados pesquisados aparecem primeiro e
recentes ficam como opção/filtro separado.

**Independent Test**: Com recentes carregados e busca por `arroz` com resultados,
o painel de resultados aparece antes de qualquer lista de recentes; selecionar
`Recentes` exibe atalhos recentes filtrados pelo termo.

### Tests for User Story 4 (MANDATORY - write first)

- [X] T050 [P] [US4] Add failing test that active search hides the standalone recent-food block above results in `src/components/nutrition/FoodSearchPanel.test.tsx`
- [X] T051 [P] [US4] Add failing test for the `Recentes` source chip label and selection in `src/components/nutrition/SourceFilterChips.test.tsx`
- [X] T052 [P] [US4] Add failing test that `Recentes` renders filtered recent foods and clean empty state in `src/components/nutrition/FoodSearchResultsSection.test.tsx`
- [X] T053 [P] [US4] Add failing hook test that selecting `recent` does not call `/api/nutrition/foods/search` in `src/modules/nutrition/hooks/useNutritionSearch.test.tsx`

### Implementation for User Story 4

- [X] T054 [US4] Extend search filter typing to include UI-only `recent` without sending it to the search API in `src/modules/nutrition/hooks/useNutritionSearch.ts`
- [X] T055 [US4] Add `Recentes` label and supported filter type to source chips in `src/components/nutrition/SourceFilterChips.tsx`
- [X] T056 [US4] Render recent foods inside the results panel when `Recentes` is active in `src/components/nutrition/FoodSearchResultsSection.tsx`
- [X] T057 [US4] Hide standalone `Consumidos recentemente` whenever a search session is active in `src/components/nutrition/FoodSearchPanel.tsx`
- [X] T058 [US4] Pass recent-food props into the results section without duplicating UI state in `src/components/nutrition/FoodSearchPanel.tsx`
- [X] T059 [US4] Preserve Portuguese-BR copy for `Recentes`, `Registrar`, and `Nenhum recente para esta busca.` in `src/components/nutrition/FoodSearchResultsSection.tsx`

**Checkpoint**: US4 is complete when a mobile search shows catalog results first
and recent foods are accessible only through the `Recentes` option.

---

## Phase 8: User Story 5 - Investigar e priorizar FatSecret Brasil (Priority: P1)

**Goal**: Confirmar se FatSecret localizado `BR/pt` está sendo usado, separar
fallback internacional e ajustar ranking para alimentos brasileiros.

**Independent Test**: Respostas simuladas com FatSecret localizado e default
priorizam `BR/pt`; fallback default não recebe `countryCode="BR"`; TBCA/catálogo
brasileiro relevante vence FatSecret internacional irrelevante.

### Tests for User Story 5 (MANDATORY - write first)

- [X] T060 [P] [US5] Add failing provider test that localized FatSecret requests include `region=BR` and `language=pt` in `src/modules/nutrition/providers/fatsecret.test.ts`
- [X] T061 [P] [US5] Add failing provider test that default FatSecret fallback does not mark foods as `countryCode="BR"` in `src/modules/nutrition/providers/fatsecret.test.ts`
- [X] T062 [P] [US5] Add failing provider test that localized FatSecret results are ordered before default results in `src/modules/nutrition/providers/fatsecret.test.ts`
- [X] T063 [P] [US5] Add failing ranking test for TBCA/catalog Brazilian result above FatSecret international fallback in `src/modules/nutrition/services/catalog-search.service.test.ts`
- [X] T064 [P] [US5] Add failing route or service test preserving valid source filters while rejecting UI-only `recent` at API boundary in `src/app/api/nutrition/foods/search/route.test.ts`

### Implementation for User Story 5

- [X] T065 [US5] Carry locale/country metadata in FatSecret search passes in `src/modules/nutrition/providers/fatsecret.ts`
- [X] T066 [US5] Update `normalizeFatSecretFood` to receive optional provider context instead of hardcoding `pt-BR` and `BR` in `src/modules/nutrition/normalizers/normalize-food.ts`
- [X] T067 [US5] Pass FatSecret search-pass context through parsing and dedupe without losing source ids in `src/modules/nutrition/providers/fatsecret.ts`
- [X] T068 [US5] Log technical diagnostics when localized FatSecret returns zero or error and default fallback supplies results in `src/modules/nutrition/providers/fatsecret.ts`
- [X] T069 [US5] Adjust search ranking so `BR`/`pt` and TBCA/catalog relevance beat FatSecret international fallback when appropriate in `src/modules/nutrition/services/food-search.service.ts`
- [X] T070 [US5] Keep `searchNutritionCatalog` source behavior stable while applying the new ranking in `src/modules/nutrition/services/catalog-search.service.ts`
- [X] T071 [US5] Document FatSecret localization assumptions and verification commands in `docs/fatsecret-localization.md`

**Checkpoint**: US5 is complete when FatSecret localized results are clearly
prioritized and fallback international data is visible as fallback in metadata,
not disguised as Brazilian content.

---

## Phase 9: Polish & Cross-Cutting Concerns for Follow-up UX/FatSecret

**Purpose**: Documentation, final validation, and clean user-facing copy review
for US4 and US5.

- [X] T072 [P] Update feature contract for search UX/FatSecret behavior in `specs/005-nutrition-recent-copy/contracts/search-results-ux-and-fatsecret.md`
- [X] T073 [P] Update nutrition README notes if the user-visible search behavior changes in `README.md`
- [X] T074 Scan new user-facing strings for devnotes, TODOs, route names, stack traces, and English error copy in `src/components/nutrition/FoodSearchPanel.tsx`, `src/components/nutrition/FoodSearchResultsSection.tsx`, and `src/components/nutrition/SourceFilterChips.tsx`
- [X] T075 Run focused UI tests for US4 using `npm test -- --runInBand src/components/nutrition/FoodSearchPanel.test.tsx src/components/nutrition/FoodSearchResultsSection.test.tsx src/components/nutrition/SourceFilterChips.test.tsx`
- [X] T076 Run focused FatSecret/search tests for US5 using `npm test -- --runInBand src/modules/nutrition/providers/fatsecret.test.ts src/modules/nutrition/services/catalog-search.service.test.ts src/app/api/nutrition/foods/search/route.test.ts`
- [X] T077 Run `npm test` using the root script defined in `package.json`
- [X] T078 Run `npm run lint` using the root script defined in `package.json`
- [X] T079 Run `npm run build` using the root script defined in `package.json`
- [X] T080 Run `npm audit --audit-level=high` and confirm no new dependency vulnerability was introduced in `docs/dependency-audit-notes.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2.
- **Phase 4 US2**: Depends on Phase 2; can run after or alongside US1 once copy primitive exists.
- **Phase 5 US3**: Depends on Phase 3 and Phase 4 behavior being stable.
- **Phase 6 Polish**: Depends on selected user stories being complete.
- **Phase 7 US4**: Depends on Phase 3 because it refines recent-food UI.
- **Phase 8 US5**: Depends on existing search/FatSecret provider behavior; can run after Phase 2 and in parallel with US4 if file ownership is separated.
- **Phase 9 Polish**: Depends on US4 and US5.

### User Story Dependencies

- **US1 (P1)**: Requires foundational copy primitive and recent-food listing.
- **US2 (P1)**: Requires foundational copy primitive; independent from recent-food UI.
- **US3 (P2)**: Extends US1 recent-food registration and US2 copy behavior.
- **US4 (P1 follow-up)**: Refines US1 UI placement; should land before further visual polish.
- **US5 (P1 follow-up)**: Refines search quality; independent from US4 UI except source chip typing.

### Within Each User Story

- Tests must be written and verified red before implementation.
- Repository/browser-storage behavior before routes.
- Routes before client wiring.
- Client wiring before UI interaction polish.
- Story checkpoint must pass before moving to the next priority unless work is intentionally parallelized.

---

## Parallel Opportunities

- T002 and T003 can run in parallel with T001.
- T004, T006, T007, T008, T009, and T012 can run in parallel before foundational implementation.
- T015, T016, T017, and T018 can run in parallel for US1 test-first work.
- T025, T026, and T027 can run in parallel for US2 test-first work.
- T034, T035, and T036 can run in parallel for US3 test-first work.
- T040, T041, and T042 can run in parallel after implementation stabilizes.
- T050, T051, T052, and T053 can run in parallel for US4 test-first work.
- T060, T061, T062, T063, and T064 can run in parallel for US5 test-first work.
- US4 implementation should own `FoodSearchPanel.tsx`, `FoodSearchResultsSection.tsx`, `SourceFilterChips.tsx`, and `useNutritionSearch.ts`.
- US5 implementation should own `fatsecret.ts`, `normalize-food.ts`, `food-search.service.ts`, and `catalog-search.service.ts`.

---

## Parallel Example: User Story 1

```bash
# Start US1 red-state tasks in parallel:
Task: "T015 Add repository tests in src/modules/nutrition/repositories/nutrition-store.test.ts"
Task: "T016 Add browser-storage tests in src/modules/nutrition/client-storage.test.ts"
Task: "T017 Add route tests in src/app/api/nutrition/foods/recent/route.test.ts"
Task: "T018 Add UI tests in src/components/nutrition/FoodSearchPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
# Start US2 red-state tasks in parallel:
Task: "T025 Add row action tests in src/components/nutrition/DiaryItemRow.test.tsx"
Task: "T026 Add meal chooser tests in src/components/nutrition/MealSwitchDialog.test.tsx"
Task: "T027 Add screen copy-flow tests in src/components/nutrition/NutritionScreen.test.tsx"
```

## Parallel Example: User Story 4

```bash
# Start US4 red-state tasks in parallel:
Task: "T050 Add active search/recent block regression in src/components/nutrition/FoodSearchPanel.test.tsx"
Task: "T051 Add Recentes source chip test in src/components/nutrition/SourceFilterChips.test.tsx"
Task: "T052 Add recent filter rendering test in src/components/nutrition/FoodSearchResultsSection.test.tsx"
Task: "T053 Add no-API-call recent filter hook test in src/modules/nutrition/hooks/useNutritionSearch.test.tsx"
```

## Parallel Example: User Story 5

```bash
# Start US5 red-state tasks in parallel:
Task: "T060-T062 Add FatSecret localized/default provider tests in src/modules/nutrition/providers/fatsecret.test.ts"
Task: "T063 Add Brazilian ranking test in src/modules/nutrition/services/catalog-search.service.test.ts"
Task: "T064 Add API-boundary source filter test in src/app/api/nutrition/foods/search/route.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) so users can register recent foods quickly.
3. Validate US1 independently with route, repository, browser-storage, and UI tests.

### Incremental Delivery

1. Foundation: lint blocker fixed and copy primitive ready.
2. US1: recent foods visible and registrable.
3. US2: row-level copy action between meals.
4. US3: previous-date recent foods copied into today's active meal.
5. US4: search results stay above recent shortcuts after active search.
6. US5: FatSecret BR localization/fallback is diagnosed and ranked correctly.
7. Polish: README, contracts, audit mitigation plan, full checks.

### Risk Notes

- Keep copy logic backend-owned to avoid client-side nutrition drift.
- Do not introduce a `nutrition_recent_foods` table unless measured query cost proves it necessary.
- Do not expose devnotes, TODOs, route names, stack traces, or English technical errors in UI.
- Do not run `npm audit fix --force` blindly; document a safe upgrade or mitigation path first.
