# Tasks: Nutrition UX & Platform Quality Initiative

**Input**: Design documents from `specs/master/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: Included — MounTrack Constitution (§ II) mandates TDD; all tests MUST be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- All file paths are absolute from repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites that block multiple stories before any implementation begins.

- [x] T001 Verify `saveDiaryItem` in `src/modules/nutrition/repositories/nutrition-store.ts` performs upsert on `(userId, date)` — ✅ upsert handled via `getOrCreateDiary`
- [x] T002 Verify DELETE endpoint exists at `src/app/api/nutrition/diary-items/[itemId]/route.ts` — ✅ DELETE + PATCH both exist at `[id]/route.ts`
- [x] T003 [P] Read and confirm characterization tests do NOT exist for `computeFoodScore` — ✅ confirmed, no tests; scope boundary noted

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend fixes required before US3 (retroactive editing) can be implemented.
**⚠️ CRITICAL**: T004 and T005 must be complete before Phase 5 (US3) begins. US2, US1, and US4 are unblocked.

- [x] T004 N/A — upsert already implemented via `getOrCreateDiary`
- [x] T005 N/A — DELETE endpoint already exists at `src/app/api/nutrition/diary-items/[id]/route.ts`
- [x] T006 N/A — endpoint pre-exists; existing `route.test.ts` covers it

**Checkpoint**: Foundation ready — US1, US2, US4 can start immediately; US3 unblocked once T004–T006 are green.

---

## Phase 3: User Story 2 — Precise, Filterable Food Search (Priority: P1)

**Goal**: Deliver ranked search results with source filtering and actionable barcode-miss feedback.

**Independent Test**: Search "pão francês" — first result contains all query tokens. Apply `source=custom` filter — only user-created foods appear. Scan unknown barcode — actionable message with "Adicionar Manualmente" CTA appears.

> **NOTE: Write all tests in this section FIRST and confirm they FAIL before implementing.**

### Tests — User Story 2

- [x] T007 [P] [US2] Write failing unit test: `searchFoods({ source: 'custom' })` returns only foods with `source === 'custom'` in `src/modules/nutrition/services/food-search.service.test.ts`
- [x] T008 [P] [US2] Write failing unit test: `searchFoods({ source: 'all' })` returns mixed-source results in `src/modules/nutrition/services/food-search.service.test.ts`
- [x] T009 [P] [US2] Write failing unit test: invalid `source` value throws validation error at route level in `src/app/api/nutrition/foods/search/route.test.ts`
- [x] T010 [P] [US2] Write failing unit test: `SourceFilterChips` renders correct chip labels and fires `onChange` with selected source in `src/components/nutrition/SourceFilterChips.test.tsx`
- [x] T011 [P] [US2] Write failing unit test: barcode miss in `useNutritionSearch` triggers `onNoMatch` callback with barcode value pre-filled in `src/hooks/useNutritionSearch.test.ts`

### Implementation — User Story 2

- [x] T012 [US2] Add `VALID_FOOD_SOURCES` constant and `source` query param validation to `src/app/api/nutrition/foods/search/route.ts` — reject invalid values with 400
- [x] T013 [US2] Add `source?: FoodSourceFilter` param to `searchFoodsByQuery()` in `src/modules/nutrition/services/food-search.service.ts` — filter candidates before scoring
- [x] T014 [P] [US2] Create `src/components/nutrition/SourceFilterChips.tsx` — chip row with aria-pressed; calls `onChange` on tap
- [x] T015 [US2] Add session-level query cache (`useRef<Map<string, FoodItem[]>>`) to `src/modules/nutrition/hooks/useNutritionSearch.ts`
- [x] T016 [US2] Mount `SourceFilterChips` in `src/components/nutrition/FoodSearchResultsSection.tsx` with client-side source filtering
- [x] T017 [US2] Add `barcodeMissCode` state to `useNutritionSearch`; expose via state; render "Adicionar Manualmente" CTA in `FoodSearchPanel`

**Checkpoint**: User Story 2 is fully functional — run T007–T011 to confirm all pass.

---

## Phase 4: User Story 1 — FatSecret-Parity Diary View (Priority: P1)

**Goal**: Meal sections show per-meal calorie totals; food items are renderable inline with edit/delete actions; search results show IDR% and kcal; macro summary visible in diary header.

**Independent Test**: Open `/nutrition` — meal headers show calorie totals. Add a food item — section total and header summary update. Swipe/long-press item — edit and delete actions appear.

> **NOTE: Write all tests in this section FIRST and confirm they FAIL before implementing.**

### Tests — User Story 1

- [X] T018 [P] [US1] Write failing unit test: `MealSectionHeader` hides calorie total when `totalCalories === 0`; shows total when `totalCalories > 0` in `src/components/nutrition/MealSectionHeader.test.tsx`
- [X] T019 [P] [US1] Write failing unit test: `MealSectionHeader` calls `onToggle` when header tapped; calls `onAddItem` when `+` button tapped in `src/components/nutrition/MealSectionHeader.test.tsx`
- [X] T020 [P] [US1] Write failing unit test: `DiaryItemRow` calls `onDelete(item.id)` when delete action triggered; calls `onEdit(item)` when edit action triggered in `src/components/nutrition/DiaryItemRow.test.tsx`
- [X] T021 [P] [US1] Write failing unit test: `FoodSearchResultsSection` renders IDR% when `nutritionGoal` is set; hides IDR% when goal is null in `src/components/nutrition/FoodSearchResultsSection.test.tsx`

### Implementation — User Story 1

- [X] T022 [P] [US1] Create `src/components/nutrition/MealSectionHeader.tsx` — props per `MealSectionHeaderProps` in data-model.md; meal icon, label, calorie total (hidden at 0), expand chevron, `+` button; use `MEAL_ICONS` constant for icon mapping
- [X] T023 [P] [US1] Create `src/components/nutrition/DiaryItemRow.tsx` — props per `DiaryItemRowProps` in data-model.md; food name (bold), quantity+unit (green), kcal; reveal delete/edit buttons on touch-hold (CSS `:active` + transition, no gesture library)
- [X] T024 [US1] Refactor `src/components/nutrition/DiaryTodayView.tsx` to use `MealSectionHeader` and `DiaryItemRow` — compute `totalCalories` per meal from `diary.items` filtered by `mealType`; wire `onEdit` and `onDelete` callbacks *(depends on T022, T023)*
- [X] T025 [US1] Update result row layout in `src/components/nutrition/FoodSearchResultsSection.tsx` — each row: food name (bold, line 1), serving description (green, line 2 left) + IDR% (line 2 center, only when goal set) + kcal (line 2 right)
- [X] T026 [US1] Update diary summary header in `src/components/nutrition/NutritionScreen.tsx` (or `NutritionHeader` equivalent) — add numeric macro row: Proteína Xg / Carb Xg / Gordura Xg vs. goal; highlight macro in warning color when it exceeds goal

**Checkpoint**: User Story 1 is fully functional — run T018–T021 to confirm all pass.

---

## Phase 5: User Story 3 — Edit Past Diary Entries (Priority: P2)

**Goal**: Users can add, edit, and remove food items and water for any past date; changes persist and totals recalculate.

**⚠️ Depends on Phase 4 (US1) — `DiaryItemRow` and `MealSectionHeader` components must exist.**
**⚠️ Depends on Phase 2 (Foundational) — upsert and DELETE endpoint must be confirmed.**

**Independent Test**: Navigate to yesterday. Add "Arroz Cozido" to "Almoço" — item appears, calorie total updates. Refresh — change persists. Edit quantity — kcal updates. Delete item — removed and totals recalculate.

> **NOTE: Write all tests in this section FIRST and confirm they FAIL before implementing.**

### Tests — User Story 3

- [X] T027 [P] [US3] Write failing unit test: `DatePickerModal` disables future dates (max = yesterday); calls `onDateSelected` with `YYYY-MM-DD` string on selection in `src/components/nutrition/DatePickerModal.test.tsx`
- [X] T028 [P] [US3] Write failing unit test: `RetroactiveDiaryView` passes `targetDate` prop to the diary-items creation API call (not today's date) in `src/components/nutrition/RetroactiveDiaryView.test.tsx`
- [X] T029 [P] [US3] Write failing unit test: `CustomWaterDialog` PATCHes `targetDate` route when `targetDate` prop is provided; falls back to today when omitted in `src/components/nutrition/CustomWaterDialog.test.tsx`

### Implementation — User Story 3

- [X] T030 [US3] Create `src/components/nutrition/DatePickerModal.tsx` — DaisyUI modal wrapping `<input type="date" max={yesterday}>` styled with Tailwind; calls `onDateSelected(date)` on change; `onClose` on backdrop tap *(props per data-model.md)*
- [X] T031 [US3] Create `src/components/nutrition/RetroactiveDiaryView.tsx` — fetches `GET /api/nutrition/diaries/[targetDate]` on mount; renders same `MealSectionHeader` + `DiaryItemRow` grid as `DiaryTodayView`; all add/edit/delete calls forward `targetDate` *(depends on T022, T023, T030)*
- [X] T032 [US3] Update `src/components/nutrition/DiaryHistoryView.tsx` — add calendar icon button in section header that opens `DatePickerModal`; on date selected, render `RetroactiveDiaryView` as a slide-over or modal *(depends on T030, T031)*
- [X] T033 [US3] Update `HistoryEntryCard` in `src/components/nutrition/DiaryPanelShared.tsx` — wrap card in tappable container that opens `RetroactiveDiaryView` for the card's date *(depends on T031)*
- [X] T034 [US3] Add `targetDate?: string` prop to `src/components/nutrition/CustomWaterDialog.tsx` — PATCH `/api/nutrition/diaries/${targetDate ?? todayDate}` instead of always today *(props per data-model.md)*
- [X] T035 [US3] Add cache invalidation in `src/hooks/useNutritionDashboard.ts` — after any retroactive add/edit/delete, clear the cached entry for `targetDate` and trigger a history re-fetch for the affected page

**Checkpoint**: User Story 3 is fully functional — run T027–T029 to confirm all pass. Verify in browser: past-date edits persist after page refresh.

---

## Phase 6: User Story 4 — Discoverable Support Section (Priority: P2)

**Goal**: Support contacts are reachable in ≤2 taps from any main screen; subscription page has a visible support block above pricing.

**Independent Test**: From diary — open nav → "Suporte" → WhatsApp link opens. From subscription page — support block visible without scrolling on 375px viewport.

> **NOTE: Write all tests in this section FIRST and confirm they FAIL before implementing.**

### Tests — User Story 4

- [X] T036 [P] [US4] Write failing unit test: `/suporte` page renders WhatsApp (`wa.me`), email (`mailto:`), phone (`tel:`) and website links with correct `href` values from `USER_SUPPORT_CONTACT` in `src/app/suporte/page.test.tsx`
- [X] T037 [P] [US4] Write failing unit test: subscription page support block contains WhatsApp and email links with correct `href` values in `src/app/subscription/page.test.tsx`

### Implementation — User Story 4

- [X] T038 [US4] Create `src/app/suporte/page.tsx` — dedicated support route; WhatsApp as primary green CTA button; email, phone, website as secondary links; all values from `USER_SUPPORT_CONTACT` imported from `src/modules/support-contact.ts`; phone displayed as copyable text fallback below `tel:` link
- [X] T039 [US4] Update nav pill in `src/app/page.tsx` — change `<a href="#suporte">` to `<a href="/suporte">` (approximately line 570–573) so it routes to the dedicated page instead of anchoring to the home page bottom
- [X] T040 [US4] Add support contact strip to `src/app/subscription/page.tsx` — insert above pricing section: "Dúvidas? Fale conosco" heading + WhatsApp and email links; all values from `USER_SUPPORT_CONTACT`; styled to be visible on first viewport at 375px width
- [X] T041 [US4] Audit codebase for any hardcoded contact values outside `src/modules/support-contact.ts` — replace all with `USER_SUPPORT_CONTACT` references

**Checkpoint**: User Story 4 is fully functional — run T036–T037 to confirm all pass. Verify WhatsApp link on mobile device.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and full regression validation.

- [X] T042 [P] Update `Documentation/` — add entry for `/suporte` route (purpose, access path)
- [X] T043 [P] Update `Documentation/` — document updated `GET /api/nutrition/foods/search` contract with `?source=` parameter per `specs/master/contracts/food-search-api.md`
- [X] T044 Run full test suite `npm test` — fix any regressions introduced across phases
- [X] T045 Run linter `npm run lint` — resolve all ESLint warnings to 0 before marking complete
- [X] T046 Run TypeScript build `npm run build` — confirm strict mode passes with no type errors
- [X] T047 [P] Walk through `specs/master/quickstart.md` validation checklist manually — mark each success criterion from spec.md as verified or flag as failing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 findings
- **Phase 3 (US2 Search)**: Unblocked after Phase 1 — no dependency on Phase 2
- **Phase 4 (US1 Diary UI)**: Unblocked after Phase 1 — no dependency on Phase 2; can run in parallel with Phase 3
- **Phase 5 (US3 Retroactive)**: Depends on Phase 4 (US1) complete + Phase 2 (upsert/DELETE)
- **Phase 6 (US4 Support)**: Unblocked — independent from all other phases; can run any time after Phase 1
- **Phase 7 (Polish)**: Depends on all desired phases complete

### User Story Dependencies

- **US2 (Search)**: Start after Phase 1 — independent
- **US1 (Diary UI)**: Start after Phase 1 — independent, parallel with US2
- **US3 (Retroactive)**: Start after US1 complete + Phase 2 verified
- **US4 (Support)**: Start any time — fully independent

### Within Each User Story

- All test tasks marked [P] MUST be written and MUST FAIL before implementation begins
- Component creation before integration into parent components
- New hooks/services before components that consume them
- Story complete and tests green before moving to next phase

### Parallel Opportunities (Single Developer)

```
Phase 1 → Phase 2 (if T001/T002 reveal issues)
        ↘
         Phase 3 (US2) + Phase 4 (US1) [in parallel branches]
                          ↓
                    Phase 5 (US3)
Phase 6 (US4) ─────────────────────────────────→ any time
                                         Phase 7 (Polish)
```

---

## Parallel Example: User Story 2 (Food Search)

```bash
# Write all tests first (can be done in parallel — different files):
T007: food-search.service.test.ts → source=custom filter
T008: food-search.service.test.ts → source=all filter
T009: route.test.ts → invalid source rejection
T010: SourceFilterChips.test.tsx → chip behavior
T011: useNutritionSearch.test.ts → barcode miss

# Confirm all 5 tests FAIL, then implement:
T012: route.ts → source param validation
T013: food-search.service.ts → source filter in searchFoods()
T014: SourceFilterChips.tsx → new component [P with T015]
T015: FoodSearchPanel.tsx → debounce + cache [P with T014]
T016: FoodSearchPanel.tsx → mount SourceFilterChips
T017: useNutritionSearch.ts → barcode miss callback
```

## Parallel Example: User Story 1 (Diary UI)

```bash
# Write all tests first (can be done in parallel — different files):
T018: MealSectionHeader.test.tsx → calorie total visibility
T019: MealSectionHeader.test.tsx → toggle/add callbacks
T020: DiaryItemRow.test.tsx → edit/delete callbacks
T021: FoodSearchResultsSection.test.tsx → IDR% conditional

# Confirm all 4 tests FAIL, then implement:
T022: MealSectionHeader.tsx → new component [P with T023]
T023: DiaryItemRow.tsx → new component [P with T022]
T024: DiaryTodayView.tsx → integrate new components
T025: FoodSearchResultsSection.tsx → new row layout [P with T024]
T026: NutritionScreen.tsx → macro summary header
```

---

## Implementation Strategy

### MVP First (US2 + US1 only)

1. Complete Phase 1: Setup (verify prerequisites)
2. Complete Phase 3 (US2): Search improvements
3. Complete Phase 4 (US1): Diary UI redesign
4. **STOP and VALIDATE**: Both P1 stories independently functional
5. Demo/release if ready

### Incremental Delivery

1. Phase 1 + Phase 3 + Phase 4 → **P1 Release** (search + diary UI)
2. Phase 2 + Phase 5 → **P2a Release** (retroactive editing)
3. Phase 6 → **P2b Release** (support section, 0-risk, can deploy at any time)
4. Phase 7 → **Polish Release**

### Parallel Team Strategy (2 developers)

After Phase 1 completes:
- Developer A: Phase 3 (US2 Search) → Phase 5 (US3 Retroactive) after Dev B completes Phase 4
- Developer B: Phase 4 (US1 Diary UI) → Phase 6 (US4 Support)

---

## Task Summary

| Phase | Tasks | Story | Can Parallel With |
|-------|-------|-------|-------------------|
| Phase 1: Setup | T001–T003 | — | Nothing (must be first) |
| Phase 2: Foundational | T004–T006 | — | Phase 3, 4, 6 unblocked already |
| Phase 3: US2 Search | T007–T017 | US2 | Phase 4, Phase 6 |
| Phase 4: US1 Diary UI | T018–T026 | US1 | Phase 3, Phase 6 |
| Phase 5: US3 Retroactive | T027–T035 | US3 | Phase 6 |
| Phase 6: US4 Support | T036–T041 | US4 | Any phase |
| Phase 7: Polish | T042–T047 | — | Nothing (must be last) |

**Total tasks**: 47
**Test tasks (TDD)**: 16 (T007–T011, T018–T021, T027–T029, T036–T037)
**Implementation tasks**: 26
**Infrastructure/verification tasks**: 5
**Parallel opportunities**: 28 tasks marked [P]

---

## Notes

- [P] tasks = different files, no dependencies on incomplete sibling tasks
- All [P] test tasks MUST fail before any implementation task in the same story begins
- Commit after each task or logical group (Constitution § Dev Workflow)
- Stop at any checkpoint to validate the story independently before proceeding
- `computeFoodScore` must NOT be modified in these tasks — tracked as a separate tech-debt ticket
- Contact details must ALWAYS be imported from `src/modules/support-contact.ts` — never hardcoded
