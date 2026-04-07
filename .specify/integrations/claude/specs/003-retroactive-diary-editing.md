# Feature Specification: Retroactive Diary Editing — Past Date Food & Water Logging

**Feature Branch**: `003-retroactive-diary-editing`
**Created**: 2026-04-06
**Status**: Draft

## Context

Currently, the nutrition diary only allows editing today's entries. Historical records in
`DiaryHistoryView` are read-only (`HistoryEntryCard`). Users need to correct missed entries,
add forgotten meals, and adjust water intake for past dates. The existing API already supports
date-keyed diary operations (`/api/nutrition/diaries/[date]`, `/api/nutrition/diary-items`),
so the primary work is UI access and ensuring recalculation consistency.

---

## User Scenarios & Testing

### User Story 1 — Add Food to a Past Date (Priority: P1)

A user opens a past date in the history view, taps `+` on a meal section, and adds a food item
exactly as they would for today. The past-date diary summary updates to reflect the new item.

**Why this priority**: Most common retroactive action — forgetting to log a meal is the primary
reason users request this feature.

**Independent Test**: Navigate to yesterday's diary entry. Tap `+` on "Almoço". Search and add
"Arroz Cozido". Verify the item appears in yesterday's "Almoço" and the daily calorie total
updates.

**Acceptance Scenarios**:

1. **Given** the user is viewing a past date in history, **When** they tap `+` on a meal section,
   **Then** the food search panel opens with the selected past date and meal pre-set as context.
2. **Given** the user saves a food item to a past date, **When** they return to the history view,
   **Then** the past-date card shows the updated calorie total.
3. **Given** the past date already has a diary record, **When** a new item is added, **Then** the
   existing items remain unchanged and the new item is appended.
4. **Given** the past date has NO existing diary record, **When** the user adds an item, **Then**
   a new diary record is created for that date before the item is inserted.

---

### User Story 2 — Edit or Remove an Item from a Past Date (Priority: P1)

A user views a past diary entry, taps on an existing food item, and can change its quantity/unit
or delete it entirely. Totals update immediately.

**Why this priority**: Correction of incorrect quantities is equally important as adding missed
items.

**Independent Test**: Find a past entry with at least one food item. Tap the item, change
quantity from 1 to 2, save. Verify the kcal value doubles and the day total updates.

**Acceptance Scenarios**:

1. **Given** the user taps a past-date food item, **When** the edit modal opens, **Then** quantity
   and unit are pre-filled with the currently stored values.
2. **Given** the user saves an edited item, **When** the diary view refreshes, **Then** the item
   shows the new quantity and updated calorie value.
3. **Given** the user taps "Remover" on a past-date item, **When** confirmed, **Then** the item
   is deleted and the meal and daily totals recalculate.

---

### User Story 3 — Edit Water Intake for a Past Date (Priority: P2)

A user opens a past date and can adjust the water intake logged for that day, either by setting
an absolute value or adjusting incrementally.

**Why this priority**: Water tracking is logged in the same diary; users should be able to correct
it retroactively alongside food.

**Independent Test**: Navigate to any past date. Open the water adjustment dialog. Set water to
1500ml. Verify the past-date summary shows 1500ml.

**Acceptance Scenarios**:

1. **Given** the user is viewing a past date, **When** they access the water section, **Then**
   the water adjustment controls (CustomWaterDialog equivalent) are accessible.
2. **Given** the user sets a new water value for a past date, **When** saved, **Then** the
   past-date card in history view reflects the updated value.

---

### User Story 4 — Navigate to a Specific Past Date via Calendar (Priority: P2)

A user can tap a calendar icon to pick any specific past date and open that day's diary directly,
without paging through the history list.

**Why this priority**: The paginated history list makes navigating to a specific date 2+ weeks
ago cumbersome.

**Independent Test**: Tap the calendar icon. Select a date 10 days ago. Verify the diary for
that date opens, showing all logged items (or an empty state if nothing was logged).

**Acceptance Scenarios**:

1. **Given** the user taps the calendar picker, **When** they select a date in the past, **Then**
   the diary view for that date opens.
2. **Given** the selected date has no diary record, **When** the view opens, **Then** an empty
   state is shown with `+` buttons on each meal section (allowing the user to create entries).
3. **Given** the selected date is in the future, **When** the user attempts to select it, **Then**
   future dates are disabled in the calendar UI.

---

### Edge Cases

- Past date diary record doesn't exist yet: create on first item add (upsert pattern).
- Editing items updates all derived fields (kcal, macros) atomically — no partial-update states.
- History pagination cache must be invalidated when a past entry is modified.
- The "today" diary must not be reachable via the retroactive flow (use today's normal flow).
- Dates older than the account creation date: either block or show empty state with a note.

---

## Requirements

### Functional Requirements

- **FR-001**: `DiaryHistoryView` and `HistoryEntryCard` MUST transition from read-only to
  editable mode — showing `+` buttons per meal and edit/delete actions on items.
- **FR-002**: The food search panel MUST accept a `targetDate` prop (ISO `YYYY-MM-DD`) and pass
  it to the diary-item creation API call.
- **FR-003**: The diary-item creation endpoint (`POST /api/nutrition/diary-items`) MUST accept
  and correctly store items for any past date (already date-keyed — verify no today-only guards).
- **FR-004**: The diary-item edit and delete endpoints MUST be callable from the history UI with
  the same authorization rules as the today flow.
- **FR-005**: After any retroactive change, the in-memory or cached state for that date's diary
  MUST be invalidated and refetched.
- **FR-006**: `CustomWaterDialog` MUST accept a `targetDate` prop and PATCH the correct diary
  date.
- **FR-007**: A date picker calendar component MUST be accessible from the history view, allowing
  direct navigation to any date from account creation through yesterday.
- **FR-008**: Future dates MUST be non-selectable in the calendar picker.

### Key Entities

- **NutritionDiary** (`nutrition_diaries` table): Must support upsert on `(userId, date)` when
  a retroactive item is added to a date with no prior record.
- **HistoryEntryCard**: Must shift from display-only to interactive, with meal sections and
  item-level actions.
- **useNutritionDashboard**: Cache invalidation logic must cover retroactively modified dates.

---

## Success Criteria

- **SC-001**: A user can add, edit, and delete food items on any past date within 5 taps.
- **SC-002**: Calorie and macro totals for a past date are accurate immediately after any edit
  (no stale values in the UI).
- **SC-003**: Calendar navigation allows reaching any past date in ≤2 taps (open calendar, pick
  date).
- **SC-004**: All retroactive changes are persisted correctly — verified by refreshing the page
  after editing.

---

## Assumptions

- The existing API date-keyed endpoints do not have today-only guards; if they do, removing those
  guards is in scope for this feature.
- Retroactive editing is available to all users (not a premium feature) — confirm with product.
- History pagination cache invalidation is handled by re-fetching the affected page, not a full
  cache clear.
- The calendar component will reuse an existing date-picker library already in the project (or
  the simplest available option) rather than building one from scratch.
- Account-creation date boundary enforcement is a v2 concern; v1 simply allows any past date.
