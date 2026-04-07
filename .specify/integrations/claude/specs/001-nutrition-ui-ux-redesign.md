# Feature Specification: Nutrition UI/UX Redesign — FatSecret-Inspired Meal Management

**Feature Branch**: `001-nutrition-ui-ux-redesign`
**Created**: 2026-04-06
**Status**: Draft

## Context

A user reported difficulty understanding the current food management interface. The FatSecret app
(screenshots provided) was cited as a reference for intuitive UX. This spec defines the
redesigned nutrition diary experience, focused on mobile-first clarity, meal-based organization,
and macro/calorie visibility.

**Reference UI patterns observed in FatSecret screenshots:**
- Diary view shows each meal as an expandable card with calorie total in header
- Search bar is always prominent, with recent searches shown before any query
- Search results show: food name, default serving unit, IDR%, and kcal per item
- Food detail screen shows add-to-diary controls (quantity + unit) above nutritional panel
- Added meal items show calorie count inline, one food per row

---

## User Scenarios & Testing

### User Story 1 — View Daily Diary with Meal Summaries (Priority: P1)

A user opens the nutrition diary and immediately sees all meals organized by type (Café da Manhã,
Almoço, Jantar, Lanches/Outros) with calorie totals per meal and a clear remaining/consumed
summary at the top — without needing to expand or scroll.

**Why this priority**: Core daily workflow. Every other story depends on this view being clear.

**Independent Test**: Open the `/nutrition` page. Verify the diary shows meal cards each with
inline calorie total, and a header summary of calories consumed vs. remaining.

**Acceptance Scenarios**:

1. **Given** the user has logged food items today, **When** they open the diary, **Then** each
   meal section shows its total calories in the section header (e.g., "137 Calorias") and items
   listed with their calorie value inline.
2. **Given** the user has no items logged today, **When** they open the diary, **Then** each
   meal section shows the `+` button only, with no calorie display until items are added.
3. **Given** a meal section has items, **When** the user taps the section header, **Then** the
   items list expands/collapses without navigating away.

---

### User Story 2 — Add Food to a Meal via Prominent Search (Priority: P1)

A user taps `+` on a meal section, lands on a search screen that opens with recent searches
pre-populated, types a query, sees ranked results with serving unit + kcal, and taps an item to
add it. The quantity/unit selector appears above the nutritional panel before saving.

**Why this priority**: Primary action in the diary — directly translates to daily retention.

**Independent Test**: Tap `+` on "Café da Manhã", search "pão", select "Pão Francês", set
quantity to 2, tap save. Verify the diary shows "Pão Francês — 2 unidades — 274 kcal".

**Acceptance Scenarios**:

1. **Given** the user taps `+` on any meal, **When** the search screen opens, **Then** recent
   searches are displayed immediately without any API call.
2. **Given** the user types a query, **When** results load, **Then** each result shows: food name
   (bold), default serving description (green), IDR% and kcal — matching FatSecret layout.
3. **Given** the user selects a food, **When** the detail screen opens, **Then** quantity input
   and unit selector are visible above the fold before the nutrition table.
4. **Given** the user taps "Salvar", **When** the diary reloads, **Then** the new item appears
   under the correct meal with calories summed in the section header.

---

### User Story 3 — Remove or Edit a Diary Item Inline (Priority: P2)

A user can swipe or long-press a logged food item to reveal delete/edit options without leaving
the diary screen.

**Why this priority**: Friction reducer — users frequently need to correct logging mistakes.

**Independent Test**: Log "Pão Francês", then swipe-left on the item. Verify delete and edit
actions appear. Tap delete; verify item is removed and calorie totals update.

**Acceptance Scenarios**:

1. **Given** a food item is logged, **When** the user swipes left or long-presses it, **Then**
   "Editar" and "Remover" actions are revealed.
2. **Given** the user taps "Remover", **When** confirmed, **Then** the item is deleted, the meal
   calorie total updates immediately, and the daily summary header recalculates.
3. **Given** the user taps "Editar", **When** the edit flow opens, **Then** quantity and unit
   fields are pre-filled with the current values.

---

### User Story 4 — Macro Summary Ring / Progress Bar (Priority: P2)

The diary header shows a visual breakdown of protein, carbohydrates, and fat consumed vs. daily
goals — mirroring the compact summary panel in FatSecret.

**Why this priority**: Users cited macro visibility as a primary reason for using nutrition apps.

**Independent Test**: Log a food item. Verify the header updates to show calories consumed,
calories remaining, and at least a numeric breakdown of protein/carb/fat.

**Acceptance Scenarios**:

1. **Given** the user has logged food today, **When** viewing the diary, **Then** the header
   shows: calories remaining, calories consumed, and macros (P/C/G) with current vs. goal values.
2. **Given** a macro exceeds its goal, **When** viewing the header, **Then** the relevant macro
   value is visually highlighted (e.g., red or warning color).

---

### Edge Cases

- What happens when a meal has 0 items? → Section shows only `+`, no calorie display.
- What if calorie data for a food is missing? → Show "— kcal" placeholder; do not block saving.
- What if the user's daily goal is not set? → Hide IDR% and goal-based visuals; show raw kcal.
- What happens on very long food names? → Truncate to 2 lines with ellipsis; full name on detail.

---

## Requirements

### Functional Requirements

- **FR-001**: Each meal section in `DiaryTodayView` MUST display its summed calorie total in the
  section header when at least one item is logged.
- **FR-002**: The `FoodSearchPanel` MUST show recent search terms (from local state or storage)
  before the user types anything.
- **FR-003**: Each food search result row MUST display: food name, default serving description,
  IDR% (if daily goal is set), and kcal value.
- **FR-004**: The food detail/add screen MUST render quantity input and unit selector above the
  nutritional information panel.
- **FR-005**: Inline item removal from the diary MUST update meal totals and the daily header
  summary without a full page reload.
- **FR-006**: The daily summary header MUST show calories consumed, calories remaining, and
  numeric macro values (protein, carb, fat).
- **FR-007**: Meal sections MUST be independently collapsible/expandable via tap on section
  header.

### Key Entities

- **DiaryTodayView**: Renders today's meal sections; must be updated to show per-meal calorie
  totals and support inline item actions.
- **FoodSearchPanel / FoodSearchResultsSection**: Must adopt new result row layout with IDR% and
  kcal inline.
- **NutritionHeader (or equivalent)**: Must render macro summary (P/C/G vs. goals) alongside
  existing calorie display.

---

## Success Criteria

- **SC-001**: A new user can add a food item to a meal in ≤4 taps from the diary screen.
- **SC-002**: Calorie totals per meal are visible without any interaction (no expand required).
- **SC-003**: 100% of existing diary data continues to display correctly after UI changes.
- **SC-004**: No regression in food search response time (results appear within existing SLA).

---

## Assumptions

- The redesign is limited to `DiaryTodayView`, `FoodSearchPanel`, `FoodSearchResultsSection`, and
  `NutritionHeader` — the data layer and API contracts remain unchanged.
- IDR% is only shown when the user has configured a daily calorie goal.
- "Swipe to delete/edit" interaction is implemented as a touch-friendly button reveal (not native
  swipe gesture) to keep complexity manageable in v1.
- The existing meal types (Café da Manhã, Almoço, Jantar, Lanches/Outros) remain fixed in v1;
  custom meals are a separate feature.
