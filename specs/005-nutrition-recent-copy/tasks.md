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

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2.
- **Phase 4 US2**: Depends on Phase 2; can run after or alongside US1 once copy primitive exists.
- **Phase 5 US3**: Depends on Phase 3 and Phase 4 behavior being stable.
- **Phase 6 Polish**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Requires foundational copy primitive and recent-food listing.
- **US2 (P1)**: Requires foundational copy primitive; independent from recent-food UI.
- **US3 (P2)**: Extends US1 recent-food registration and US2 copy behavior.

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
5. Polish: README, contracts, audit mitigation plan, full checks.

### Risk Notes

- Keep copy logic backend-owned to avoid client-side nutrition drift.
- Do not introduce a `nutrition_recent_foods` table unless measured query cost proves it necessary.
- Do not expose devnotes, TODOs, route names, stack traces, or English technical errors in UI.
- Do not run `npm audit fix --force` blindly; document a safe upgrade or mitigation path first.
