# Feature Specification: Food Search Improvements — Precision, Filters & Performance

**Feature Branch**: `002-food-search-improvements`
**Created**: 2026-04-06
**Status**: Draft

## Context

The current food search uses a multi-source cascade (FatSecret → OpenFoodFacts → USDA) with a
local PostgreSQL catalog backed by tsvector/trigram indexes. Reported issues include results that
are too generic or not matching user intent. This spec defines improvements to search relevance,
source filtering, and UX.

**Current implementation summary** (from `catalog-search.service.ts` and `food-search.service.ts`):
- Query is normalized (accent removal, stop word stripping, tokenized at ≥3 chars)
- Fuzzy matching on food name, brand, tags
- Deduplication across sources; up to 50 results returned
- FatSecret results returned immediately; OFF and USDA run in background

---

## User Scenarios & Testing

### User Story 1 — Relevant Results for Specific Queries (Priority: P1)

A user searches "pão francês" and sees results ranked with the most specific/relevant matches
first (e.g., "Pão Francês" above "Pão de Forma"), not generic or unrelated items.

**Why this priority**: Low search precision is the most-reported friction point; fixing it
directly reduces user drop-off during food logging.

**Independent Test**: Search "pão francês". The first result must be "Pão Francês" or a clear
variant. Items with zero name overlap must not appear in the top 5.

**Acceptance Scenarios**:

1. **Given** the user types "pão francês", **When** results load, **Then** results with all query
   tokens present in the food name are ranked above partial matches.
2. **Given** the user types a single token "pão", **When** results load, **Then** the list is
   ordered by relevance score (full-name match > prefix match > substring match).
3. **Given** a query matches items in multiple sources, **When** results are deduplicated, **Then**
   the highest-quality source entry (FatSecret > custom > OFF > USDA) is kept.

---

### User Story 2 — Filter Results by Data Source (Priority: P2)

A user can optionally filter search results to show only items from a specific source (e.g., only
their custom foods, or only USDA-verified items) without retyping the query.

**Why this priority**: Power users who manage custom foods or prefer verified databases need
source control.

**Independent Test**: Search "frango", then apply "Meus Alimentos" filter. Verify only custom
foods created by this user appear.

**Acceptance Scenarios**:

1. **Given** the search results screen is open, **When** the user selects a source filter, **Then**
   only items from that source are displayed without a new API call if results are already loaded.
2. **Given** "Todos" (All) filter is active (default), **When** the user selects a specific
   source, **Then** a clear visual indicator shows the active filter and a way to clear it.
3. **Given** the filtered result set is empty, **When** the filter is applied, **Then** an empty
   state message indicates no items from that source match the query (not a generic empty state).

**Available filter options**:
- Todos (default)
- Meus Alimentos (custom foods by this user)
- FatSecret
- OpenFoodFacts
- USDA

---

### User Story 3 — Search Performance: Instant Feedback (Priority: P2)

The search input provides debounced results as the user types, with a visible loading indicator
while waiting for API results, and cached results returned instantly for repeated queries.

**Why this priority**: Perceived performance is a key UX factor; latency without feedback causes
user confusion.

**Independent Test**: Type "frango" slowly. Verify a loading spinner appears, then results load
within the existing SLA. Type "frango" again — results must appear without a new network request
(from cache).

**Acceptance Scenarios**:

1. **Given** the user starts typing, **When** the debounce threshold (≥300ms) is met, **Then**
   a loading indicator appears and the API request is fired.
2. **Given** the same query was searched in the current session, **When** typed again, **Then**
   cached results render immediately with no spinner.
3. **Given** the API returns an error, **When** results fail to load, **Then** an inline error
   message is shown with a "Tentar novamente" option — not a blank list.

---

### User Story 4 — Barcode Scan Fallback Messaging (Priority: P3)

When a barcode scan finds no match, the user receives a clear message explaining what happened and
is offered an option to add the food manually.

**Why this priority**: Currently barcode misses are silent; users don't know if the scan failed
or if the food simply doesn't exist.

**Independent Test**: Scan an unknown barcode. Verify a message appears: "Alimento não encontrado.
Deseja cadastrá-lo?" with a button to open the custom food dialog pre-filled with the barcode.

**Acceptance Scenarios**:

1. **Given** a barcode scan returns no match from any provider, **When** the lookup completes,
   **Then** a toast or modal informs the user and offers "Adicionar Manualmente".
2. **Given** the user selects "Adicionar Manualmente", **When** the custom food dialog opens,
   **Then** the barcode field is pre-filled with the scanned value.

---

### Edge Cases

- Query with only stop words (e.g., "de") → Treat as empty query; show recent searches.
- Query with only 1–2 characters → Show message: "Digite pelo menos 3 letras".
- All providers return 0 results → Show empty state with suggestion to add a custom food.
- FatSecret API is down → Fall through to OFF and USDA without error; mark FatSecret results as
  unavailable in a non-intrusive way.
- Duplicate foods with the same name and source → Deduplicate by canonical ID, not by name.

---

## Requirements

### Functional Requirements

- **FR-001**: Search results MUST be ranked so that full multi-token name matches appear before
  partial matches.
- **FR-002**: The search API MUST accept an optional `source` filter parameter
  (`fatsecret | openfoodfacts | usda | custom | all`).
- **FR-003**: `FoodSearchPanel` MUST debounce the search input with a configurable threshold
  (default 300ms).
- **FR-004**: Search results for a given query string MUST be cached in component state for the
  lifetime of the current search session.
- **FR-005**: A source filter UI MUST be accessible from the search results screen (chips or
  dropdown), defaulting to "Todos".
- **FR-006**: When a barcode scan finds no result, the system MUST display a user-facing message
  and offer a path to manual food creation with the barcode pre-filled.
- **FR-007**: API errors during search MUST surface as actionable inline messages, not silent
  empty lists.

### Key Entities

- **FoodSearchService** (`food-search.service.ts`): Ranking logic update — score full-token
  matches higher.
- **Search API route** (`/api/nutrition/foods/search`): Accept `source` query param.
- **FoodSearchPanel** (`FoodSearchPanel.tsx`): Add debounce, session cache, source filter chips.
- **Barcode lookup flow** (`useNutritionSearch.ts`): Add no-match messaging with manual fallback.

---

## Success Criteria

- **SC-001**: For any single-word query, the top result's name contains the query token — measured
  across 10 representative test queries.
- **SC-002**: Repeated queries within a session render in <50ms (from cache, no network).
- **SC-003**: Source filter correctly restricts results to the selected source in 100% of tested
  cases.
- **SC-004**: Barcode miss rate results in actionable UI in 100% of cases (no silent failures).

---

## Assumptions

- Result caching is session-level only (not persisted to localStorage) in v1.
- Source filter chips are applied client-side on the already-fetched result set when possible
  (to avoid extra API round-trips); server-side filtering is used when the local result set
  is insufficient.
- FatSecret remains the primary source; its results always appear first within a combined list.
- The ranking improvement applies to the local `food-search.service.ts` scoring — FatSecret's
  own ordering is respected as-is for FatSecret-sourced results.
