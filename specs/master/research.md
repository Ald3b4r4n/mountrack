# Research: Nutrition UX & Platform Quality Initiative

**Branch**: `master` | **Date**: 2026-04-06

---

## Clarification 1 — Retroactive Editing: Free or Premium?

**Spec ref**: `003-retroactive-diary-editing.md`, Assumptions section

**Decision**: Free feature (no premium gate).

**Rationale**: The diary-items API already accepts any date without a premium check. Adding a
premium gate retroactively would require a new middleware layer and would contradict existing
behavior (users can already call the API directly for past dates). The UX friction is a UI-only
limitation, not a business rule.

**Alternatives considered**:
- Premium-only: Rejected because the API layer doesn't enforce it, creating a false paywall.
- Free with a limit (e.g., last 7 days): Rejected as arbitrary and complex to implement.

---

## Clarification 2 — Support Block Placement on Subscription Page

**Spec ref**: `004-support-sac-improvements.md`, SC-004 `[NEEDS CLARIFICATION]`

**Decision**: Support block placed **above the pricing section**, immediately below the hero.

**Rationale**: Users who visit the subscription page with questions need answers before seeing
pricing. Placing support below pricing means they only see it after deciding whether to pay —
too late to reduce abandonment. A compact "Dúvidas? Fale conosco" strip between hero and
pricing cards is the standard pattern for SaaS landing pages.

**Alternatives considered**:
- After pricing section: Rejected — users who abandon before scrolling never see it.
- Footer only: Rejected — current state; not discoverable enough.

---

## Clarification 3 — Date Picker Implementation

**Spec ref**: `003-retroactive-diary-editing.md`, Assumptions section

**Decision**: Use native `<input type="date">` wrapped in a DaisyUI modal, styled with Tailwind.

**Rationale**: No date picker library exists in the project. Adding one (e.g., react-datepicker,
react-day-picker) would add a dependency for a small feature. The native `<input type="date">`
has good mobile browser support, respects locale, and handles the `max` constraint natively.

**Alternatives considered**:
- `react-day-picker`: Full-featured but ~50KB; overkill for one use case.
- Custom calendar grid: More work than value; native input is sufficient for this use case.
- DaisyUI's built-in: DaisyUI 4.x doesn't include a fully styled date picker component.

---

## Clarification 4 — Source Filter: Client-Side vs. Server-Side

**Spec ref**: `002-food-search-improvements.md`, Assumptions section

**Decision**: Hybrid. Apply filter **server-side** when source is specified in the query.
Client-side fallback only when the full result set is already cached for that query.

**Rationale**: The current search returns up to 8 results (configurable limit in
`food-search.service.ts`). A client-side filter on 8 results may return 0 items if the
requested source has no representation in the top 8. Server-side filtering ensures the
result set actually contains items from the requested source.

**Implementation**: Add `source` param to `GET /api/nutrition/foods/search?q=...&source=...`.
Pass through to `CatalogSearchService` → `FoodSearchService.searchFoods({ source })`.
Filter in `searchFoods()` before ranking: exclude results not matching requested source.

**Alternatives considered**:
- Client-side only: Rejected for the coverage reason above (top 8 may have no custom foods).
- Separate endpoint per source: Rejected — unnecessary API proliferation.

---

## Clarification 5 — computeFoodScore Refactor Strategy

**Spec ref**: Constitution Check, Complexity Tracking

**Decision**: Do not refactor `computeFoodScore` as part of these 4 features. Isolate it
behind a stable interface and add tests around it before any modification in Spec 002.

**Rationale**: `computeFoodScore` is 76 lines of scoring logic. Refactoring it without
comprehensive tests risks silent regression in search quality. The right order is:
1. Write characterization tests for the current behavior.
2. Implement source filtering by wrapping the score function, not modifying it.
3. Defer the 20-line refactor to a dedicated tech-debt ticket.

**Alternatives considered**:
- Refactor now: Rejected — no tests exist for `computeFoodScore`; unsafe to change.
- Leave as-is forever: Rejected — tracked in Complexity Tracking for future resolution.

---

## Dependency Map (resolved)

```
Spec 002 (Search)    → Independent → implement first
Spec 001 (UI)        → Independent → implement in parallel with 002
Spec 003 (Retro)     → Depends on 001's DiaryItemRow + MealSectionHeader components
Spec 004 (Support)   → Independent → implement last (low risk, quick win)
```

**Confirmed**: No new npm packages required. No database schema changes required.
No breaking changes to existing API contracts.
