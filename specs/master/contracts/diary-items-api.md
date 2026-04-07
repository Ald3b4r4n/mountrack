# API Contract: Diary Items

## POST /api/nutrition/diary-items

**Auth**: Required (`requireNutritionUser` middleware)
**Spec**: `003-retroactive-diary-editing.md` FR-003

---

## Confirmed Behavior (no changes required)

The existing implementation already supports retroactive entries. This document confirms
the contract for planning purposes.

### Request Body

```typescript
{
  date: string,           // YYYY-MM-DD — any past or present date; no today-only guard
  foodId: string,
  foodSnapshot?: FoodItem,
  quantity: number,       // positive
  unit: "g" | "ml" | "serving" | "unit",
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | string,  // "custom:..." allowed
  mealLabel?: string,     // max 40 chars
  consumedAt?: string     // ISO 8601; defaults to current time if omitted
}
```

### Response — 201 Created

```typescript
{
  diary: DiaryRecord,
  item: DiaryItemSnapshot
}
```

### Response — 400 Bad Request (validation failure)
```json
{ "error": "...", "details": [...] }
```

---

## Upsert Behavior (confirm before Spec 003 implementation)

**MUST VERIFY**: Does `saveDiaryItem` in `nutrition-store.ts` create a new diary record
if none exists for `(userId, date)`?

If not, `POST /api/nutrition/diary-items` with a past date that has no existing diary
record will fail. The implementation plan for Spec 003 assumes upsert behavior is in place.

**Action**: Read `nutrition-store.ts` `saveDiaryItem` function before implementing Spec 003.
If it does not upsert, add upsert logic as the first step of Spec 003 backend work.

---

## PATCH /api/nutrition/diaries/[date]

**Auth**: Required
**Spec**: `003-retroactive-diary-editing.md` FR-006

### Confirmed Behavior (no changes required)

The `[date]` path parameter accepts any `YYYY-MM-DD` string. No today-only guard exists.

### Request Body

```typescript
{
  waterIntakeMl?: number,       // 0–12000
  mealDefinitions?: MealDefinition[]   // min 4 items
}
```

### Response — 200 OK

```typescript
{ diary: DiaryRecord }
```

---

## DELETE /api/nutrition/diary-items/[itemId]

**Auth**: Required
**Spec**: `003-retroactive-diary-editing.md` FR-004

Confirm this endpoint exists and accepts deletes for items belonging to past-date diaries.
If it does not exist, it must be created as part of Spec 003 implementation.

**Action**: Verify existence at `src/app/api/nutrition/diary-items/[itemId]/route.ts` before
implementing Spec 003 item deletion flow.
