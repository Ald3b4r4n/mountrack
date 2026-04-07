# Data Model: Nutrition UX & Platform Quality Initiative

**Branch**: `master` | **Date**: 2026-04-06

---

## Existing Entities (no schema changes)

All 4 features work within the existing database schema. No new tables or columns are required.

| Entity | Table | Relevant Fields |
|--------|-------|----------------|
| NutritionDiary | `nutrition_diaries` | `userId`, `date` (YYYY-MM-DD), `waterIntakeMl`, `items[]` |
| DiaryItem | `nutrition_diary_items` | `id`, `diaryId`, `foodId`, `mealType`, `quantity`, `unit`, `calories`, `consumedAt` |
| NutritionFood | `nutrition_foods` | `id`, `name`, `source` ("fatsecret" \| "openfoodfacts" \| "usda" \| "custom" \| "internal"), `brand`, `tags[]` |
| NutritionGoal | `nutrition_goals` | `userId`, `targetCalories`, `protein`, `carbs`, `fat` |

---

## State Transitions

### Diary State Machine (Spec 003)

```
Past Date (no record)
        │
        ▼ User adds first item (upsert: create diary record + insert item)
Past Date (record exists, 1+ items)
        │
        ├── User adds item      → item count +1, calorie total recalculated
        ├── User edits item     → quantity/unit updated, calorie total recalculated
        └── User deletes item   → item removed, calorie total recalculated
                │
                └── If 0 items remain → record stays (no auto-delete; water may still exist)
```

**Upsert pattern** (required for Spec 003):
The existing `saveDiaryItem` in `nutrition-store.ts` must handle the case where no diary
record exists for the given `(userId, date)` pair. Confirm it performs an upsert, not
an insert that would fail on missing diary FK.

### Search Result State (Spec 002)

```
FoodSearchPanel state machine:

IDLE (no query)
    │ user types ≥3 chars (after debounce 300ms)
    ▼
LOADING
    │ API responds
    ├── success → RESULTS (cached in session for this query string)
    └── error   → ERROR (show retry)

RESULTS
    │ user changes source filter
    ├── source = "all"    → show cached full results
    └── source = specific → re-fetch with ?source= param (or filter local if sufficient)
    │
    │ user clears query
    └── IDLE (show recent searches)
```

---

## New Component Props / Interfaces

These are UI-layer contracts; not persisted data, but required for planning.

### MealSectionHeader (Spec 001)
```typescript
interface MealSectionHeaderProps {
  mealType: MealType                // "breakfast" | "lunch" | "dinner" | "snack"
  label: string                     // e.g., "Café da Manhã"
  totalCalories: number             // 0 if no items
  isExpanded: boolean
  onToggle: () => void
  onAddItem: () => void
}
```

### DiaryItemRow (Spec 001)
```typescript
interface DiaryItemRowProps {
  item: DiaryItemSnapshot
  onEdit: (item: DiaryItemSnapshot) => void
  onDelete: (itemId: string) => void
}
```

### SourceFilterChips (Spec 002)
```typescript
type FoodSource = "all" | "fatsecret" | "openfoodfacts" | "usda" | "custom"

interface SourceFilterChipsProps {
  activeSource: FoodSource
  onChange: (source: FoodSource) => void
  availableSources: FoodSource[]    // derived from current result set
}
```

### DatePickerModal (Spec 003)
```typescript
interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onDateSelected: (date: string) => void   // YYYY-MM-DD
  maxDate?: string                          // defaults to yesterday
}
```

### RetroactiveDiaryView (Spec 003)
```typescript
interface RetroactiveDiaryViewProps {
  targetDate: string                        // YYYY-MM-DD (past date)
  onClose: () => void
}
// Internally fetches GET /api/nutrition/diaries/[targetDate]
// Uses same add/edit/delete flows as DiaryTodayView, with targetDate forwarded
```

### CustomWaterDialog (Spec 003 — updated)
```typescript
// Existing props +
interface CustomWaterDialogProps {
  // ... existing props ...
  targetDate?: string     // YYYY-MM-DD; defaults to today if omitted
}
```

---

## Validation Rules

### Source Filter (Spec 002)
- Valid values: `"all" | "fatsecret" | "openfoodfacts" | "usda" | "custom"`
- Default: `"all"` (no filter applied)
- Invalid values: reject at route level with 400 — do not silently fallback to "all"

### Retroactive Date (Spec 003)
- Format: `YYYY-MM-DD` (validated by existing `diaryItemSchema`)
- Range: any date ≤ yesterday (frontend enforces `max={yesterday}`; API has no guard)
- Future dates: blocked in `DatePickerModal` UI only; API does not enforce this

### Water Intake (Spec 003 — existing validation, confirmed)
- Range: `0–12000 ml` (enforced by `diaryPatchSchema`)
- Retroactive date: validated as ISO date string in PATCH route; no today-only guard
