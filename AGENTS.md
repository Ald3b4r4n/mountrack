# Agent Instructions

## Package Manager

- Use `npm`: `npm install`, `npm run dev`, `npm run build`, `npm test`

## File-Scoped Commands

| Task              | Command                                      |
| ----------------- | -------------------------------------------- |
| Lint file         | `npx eslint path/to/file.tsx`                |
| Test file         | `npx jest path/to/file.test.tsx --runInBand` |
| Typecheck         | `npx tsc --noEmit --pretty false`            |
| Dependency audit  | `npm audit --audit-level=high`               |
| Persistence check | `npm run nutrition:validate-persistence`     |

## Commit Attribution

- AI commits MUST include:

```text
A&R Software Development
```

## MirrorXP Loop

- Work in 10-30 minute micro-features.
- Keep every change small, understandable, testable, and reversible.
- `feature + tests = commit`; never defer tests.
- Refactor as soon as duplication or confusion appears.
- Document API limits, odd behavior, bugs, and workarounds in project docs while they are fresh.

## Commit Gates

- Every commit must be releasable: compile, pass relevant tests, and be safe to ship.
- Never leave known breakage behind with "fix later".
- Verification order:
  - lint
  - security scan when available for the touched surface
  - dependency audit
  - tests
  - build when the change affects runtime or release output
- If any gate fails, stop and fix it before continuing.

## Project Conventions

- Use `apply_patch` for manual code edits.
- Prefer targeted verification for touched files, but leave the touched surface green before moving on.
- Keep changes and commits small; avoid giant refactors and stacked unrelated edits.
- Update `AGENTS.md`, `README.md`, or the relevant project doc when workflow or architectural knowledge changes.

## Nutrition Module Fixes (2026-03-17)

### Water Buttons Timeout Issue

- **Problem**: Buttons were using `setTimeout(..., 0)` which was too aggressive for React state updates
- **Solution**: Increased timeout to `50ms` in [DiaryTodayView.tsx](src/components/nutrition/DiaryTodayView.tsx) and [NutritionHeader.tsx](src/components/nutrition/NutritionHeader.tsx)
- **Reasoning**: Allows React to process state updates before calling `handleSaveWater()`

### Water Quick-Add Double Save Race

- **Problem**: Parent callbacks were also saving water, while child water buttons already called save; duplicated saves caused race conditions and inconsistent totals
- **Solution**: Route quick-add directly through `handleSaveCustomWater(amount, "increment")` in [NutritionScreen.tsx](src/components/nutrition/NutritionScreen.tsx), and remove delayed secondary saves from [DiaryTodayView.tsx](src/components/nutrition/DiaryTodayView.tsx) and [NutritionHeader.tsx](src/components/nutrition/NutritionHeader.tsx)
- **Impact**: Prevents quick-add clicks from resetting/overwriting previously registered water intake and removes state-timing dependency on `waterDraft`

### Hydration Helper Canonicalization

- **Problem**: Hydration input logic existed in both `hooks/useHydration.ts` and `services/hydration-input.ts`, enabling divergent behavior
- **Solution**: Use `services/hydration-input.ts` as canonical helper implementation and re-export from [useHydration.ts](src/modules/nutrition/hooks/useHydration.ts)
- **Testing**: Added regression coverage in [hydration-input.test.ts](src/modules/nutrition/services/hydration-input.test.ts) and button interaction test in [DiaryTodayView.water.test.tsx](src/components/nutrition/DiaryTodayView.water.test.tsx)

### Water State Hydration Bug

- **Problem**: After saving water intake, state would zero out instead of preserving the updated value
- **Root cause**: In [useNutritionDashboard.ts](src/modules/nutrition/hooks/useNutritionDashboard.ts) `hydrateDashboard()`, spreading `createEmptySummary(today)` first with empty values could override valid data if `nextSummary` was incomplete
- **Solution**: Check if `nextSummary` has complete water/calorie data before applying defaults
- **Impact**: Prevents accidental zeroing of water intake after updates

### Active Meal Auto-Sync

- **Feature**: Active meal now automatically syncs to current meal type based on hour
- **Implementation**: Added `useEffect` in [NutritionScreen.tsx](src/components/nutrition/NutritionScreen.tsx) that checks every minute
- **Behavior**: Automatically updates from breakfast → lunch → snack → dinner as time progresses
- **Override**: User can still manually select meals; auto-sync only applies when needed

### Search Relevance and Result Volume

- **Problem**: Generic queries could return unrelated items via brand-only matches (e.g., `frango` surfacing chocolates) and search responses were capped too aggressively
- **Solution**: In [food-search.service.ts](src/modules/nutrition/services/food-search.service.ts), require name/tag token evidence for generic one-word queries before accepting brand-only matches; in [catalog-search.service.ts](src/modules/nutrition/services/catalog-search.service.ts), raise result cap from 8 to 50
- **Testing**: Added regression coverage in [food-search.service.test.ts](src/modules/nutrition/services/food-search.service.test.ts) and [catalog-search.service.test.ts](src/modules/nutrition/services/catalog-search.service.test.ts)

### Mobile Water CTA Typography Alignment

- **Problem**: The `Personalizado` quick action in mobile hydration controls looked visually inconsistent compared to `250` and `500` and could overflow on narrow widths
- **Solution**: In [DiaryTodayView.tsx](src/components/nutrition/DiaryTodayView.tsx), align typography/color with the quick-add buttons and keep overflow protection (`overflow-hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`)
- **Impact**: Keeps visual consistency across hydration CTAs while preventing text spill in narrow mobile viewports

### FatSecret Attribution Policy Compliance

- **Policy requirement**: FatSecret attribution must exist in app content surfaces, at least one screen accessible without login, and app store listings.
- **Solution**: Added reusable attribution component in [FatSecretAttribution.tsx](src/components/FatSecretAttribution.tsx), rendered in [NutritionScreenShell.tsx](src/components/nutrition/NutritionScreenShell.tsx) and [login/page.tsx](src/app/login/page.tsx).
- **Operational note**: Store listing descriptions must include the exact phrase `Powered by fatsecret nutrition API` ([www.fatsecret.com](https://www.fatsecret.com)).
