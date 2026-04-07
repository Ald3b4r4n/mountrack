# Quickstart: Nutrition UX & Platform Quality Initiative

**Branch**: `master` | **Date**: 2026-04-06

---

## Before You Start

### Verify two API behaviors before implementing Spec 003

```bash
# 1. Check if saveDiaryItem upserts or requires an existing diary record
grep -n "saveDiaryItem\|INSERT.*nutrition_diaries\|upsert" \
  src/modules/nutrition/repositories/nutrition-store.ts

# 2. Confirm diary-item DELETE endpoint exists
ls src/app/api/nutrition/diary-items/
```

If the DELETE endpoint (`[itemId]/route.ts`) does not exist, create it **first** as
a prerequisite for Spec 003. If `saveDiaryItem` doesn't upsert, add upsert before
implementing the retroactive add-item flow.

---

## Implementation Order

```
Week 1:  Spec 002 (Search) + Spec 001 (UI) in parallel branches
Week 2:  Spec 003 (Retroactive) — after 001 merges
Week 3:  Spec 004 (Support) — any time
```

---

## TDD Workflow Per Feature

Each new function follows Red → Green → Refactor:

```bash
# 1. Write failing test
# 2. Run — confirm it fails
npm test -- --testPathPattern="ComponentName"

# 3. Write minimum implementation
# 4. Run — confirm it passes
npm test -- --testPathPattern="ComponentName"

# 5. Refactor — keep tests green
npm test
```

---

## Spec 002: Food Search — Key Files

```
src/app/api/nutrition/foods/search/route.ts         ← add source param validation
src/modules/nutrition/services/food-search.service.ts   ← add source filter in searchFoods()
src/components/nutrition/FoodSearchPanel.tsx        ← add debounce + session cache
src/components/nutrition/SourceFilterChips.tsx      ← NEW component
```

**Test first**:
```typescript
// tests/modules/nutrition/food-search.service.test.ts
it('should return only custom foods when source=custom', () => { ... })
it('should return all foods when source=all', () => { ... })
it('should throw for invalid source values', () => { ... })
```

---

## Spec 001: Diary UI — Key Files

```
src/components/nutrition/MealSectionHeader.tsx      ← NEW
src/components/nutrition/DiaryItemRow.tsx           ← NEW
src/components/nutrition/DiaryTodayView.tsx         ← update to use new components
src/components/nutrition/FoodSearchResultsSection.tsx ← update result row layout
```

**Test first**:
```typescript
// tests/components/nutrition/MealSectionHeader.test.tsx
it('should not show calorie total when 0 items', () => { ... })
it('should show calorie total when items exist', () => { ... })
it('should call onToggle when header is tapped', () => { ... })
```

---

## Spec 003: Retroactive Editing — Key Files

```
src/components/nutrition/DatePickerModal.tsx        ← NEW
src/components/nutrition/RetroactiveDiaryView.tsx   ← NEW
src/components/nutrition/DiaryHistoryView.tsx       ← add calendar icon + entry tap handler
src/components/nutrition/DiaryPanelShared.tsx       ← HistoryEntryCard → tappable
src/components/nutrition/CustomWaterDialog.tsx      ← add targetDate prop
```

**Test first**:
```typescript
// tests/components/nutrition/DatePickerModal.test.tsx
it('should disable future dates', () => { ... })
it('should call onDateSelected with YYYY-MM-DD string', () => { ... })

// tests/components/nutrition/RetroactiveDiaryView.test.tsx
it('should pass targetDate to diary item creation call', () => { ... })
it('should create diary record if none exists for target date', () => { ... })
```

---

## Spec 004: Support — Key Files

```
src/app/suporte/page.tsx                            ← NEW route
src/app/page.tsx (line ~570)                        ← update nav pill href
src/app/subscription/page.tsx                       ← add support block above pricing
```

**Test first**:
```typescript
// tests/app/suporte/page.test.tsx
it('should render WhatsApp link with correct href', () => { ... })
it('should render email with mailto: href', () => { ... })
it('should render phone as tel: link and copyable text', () => { ... })
```

---

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- --testPathPattern="SourceFilterChips"

# Watch mode
npm test -- --watch

# Coverage (do not game it)
npm test -- --coverage
```

---

## Constitution Compliance Checklist (per PR)

Before opening a PR for any of these 4 features:

- [ ] All new functions have a failing test written before implementation
- [ ] No new function exceeds 20 lines (or documented in Complexity Tracking)
- [ ] No new file exceeds 300 lines
- [ ] No nesting depth > 3 levels
- [ ] No magic numbers (debounce ms, score values, etc. → named constants)
- [ ] `Documentation/` updated if any public behavior changed
- [ ] ESLint passes with 0 warnings (`npm run lint`)
- [ ] TypeScript strict mode passes (`npm run build`)
