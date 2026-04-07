# Feature Specification: Nutrition UX & Platform Quality Initiative

**Feature Branch**: `master`
**Created**: 2026-04-06
**Status**: Draft

## Overview

This initiative addresses four interconnected improvements to the MounTrack nutrition module,
driven by user feedback citing the FatSecret app as a UX reference.

Individual specs (in `.specify/integrations/claude/specs/`):

| # | Title | File |
|---|-------|------|
| 001 | Nutrition UI/UX Redesign | `001-nutrition-ui-ux-redesign.md` |
| 002 | Food Search Improvements | `002-food-search-improvements.md` |
| 003 | Retroactive Diary Editing | `003-retroactive-diary-editing.md` |
| 004 | Support / SAC Section | `004-support-sac-improvements.md` |

---

## User Scenarios & Testing

### User Story 1 — FatSecret-Parity Diary View (Priority: P1)

User opens the nutrition diary and sees meal sections with inline calorie totals, macro summary
header, and can add/edit/remove items without navigating away.

**Why this priority**: Core daily engagement loop — every other improvement builds on this.

**Independent Test**: Open `/nutrition`. Each meal section shows calorie total in header.
Adding a food item updates the section total and daily header summary in real time.

**Acceptance Scenarios**:
1. **Given** items are logged, **When** diary opens, **Then** meal headers show calorie totals.
2. **Given** user taps `+` on a meal, **When** search opens, **Then** recent searches appear.
3. **Given** user saves a food, **When** diary reloads, **Then** new item appears with correct kcal.

---

### User Story 2 — Precise, Filterable Food Search (Priority: P1)

User searches food and gets relevant ranked results, can filter by source, and gets actionable
feedback on barcode scan failures.

**Why this priority**: Search quality directly affects daily retention.

**Independent Test**: Search "pão francês" — first result must contain all query tokens.
Apply "Meus Alimentos" filter — only user-created foods appear.

**Acceptance Scenarios**:
1. **Given** multi-word query, **When** results load, **Then** full-token matches rank first.
2. **Given** source filter selected, **When** applied, **Then** only that source's items show.
3. **Given** barcode scan finds no match, **When** lookup finishes, **Then** actionable message
   with "Adicionar Manualmente" option appears.

---

### User Story 3 — Edit Past Diary Entries (Priority: P2)

User navigates to a past date and adds, edits, or removes food items and water intake. Totals
recalculate correctly.

**Why this priority**: Retroactive corrections are the second most-requested feature.

**Independent Test**: Navigate to yesterday. Add "Arroz Cozido" to "Almoço". Verify item
appears in history and calorie total updates. Refresh — changes must persist.

**Acceptance Scenarios**:
1. **Given** user views past date, **When** they tap `+`, **Then** food search opens with that
   date as context.
2. **Given** item saved to past date, **When** history view reloads, **Then** correct totals show.
3. **Given** no prior record for past date, **When** item added, **Then** diary record created.

---

### User Story 4 — Discoverable Support Section (Priority: P2)

User can reach support contacts (WhatsApp, email) within 2 taps from any main screen and from
the subscription page before signing up.

**Why this priority**: Support discoverability reduces abandonment and subscription-page churn.

**Independent Test**: From diary screen, reach WhatsApp support in ≤2 taps. From subscription
page (logged out), find and tap WhatsApp link without scrolling.

**Acceptance Scenarios**:
1. **Given** user is on any main screen, **When** they open navigation, **Then** "Suporte" is
   visible and leads to support page.
2. **Given** subscription page, **When** user looks for support, **Then** WhatsApp and email
   are visible without scrolling on 375px viewport.

---

### Edge Cases

- Foods with missing calorie data: show `—` placeholder, don't block saving.
- Retroactive edit on date with no prior record: upsert diary record automatically.
- All search providers down: show empty state with "Adicionar Manualmente" CTA.
- Support tel: links on devices without phone capability: show copyable text fallback.

---

## Requirements (Summary)

See individual spec files for full FR lists. Key cross-cutting requirements:

- **FR-CROSS-001**: All nutritional data updates MUST recalculate meal and day totals atomically.
- **FR-CROSS-002**: All contact details MUST remain in `support-contact.ts` as single source of truth.
- **FR-CROSS-003**: All new UI components MUST be mobile-first (minimum 375px viewport).
- **FR-CROSS-004**: All changes MUST maintain backward compatibility with existing diary data.

---

## Success Criteria

- **SC-001**: User can log a food item in ≤4 taps from the diary screen.
- **SC-002**: Top search result for any multi-word query contains all query tokens.
- **SC-003**: Past diary entries are editable and changes persist after page refresh.
- **SC-004**: Support contact reachable in ≤2 taps from diary and visible on subscription page.

---

## Assumptions

- All 4 features are implemented sequentially (001 → 002 → 003 → 004) for dependency reasons.
- Spec 001 (UI redesign) must be completed before Spec 003 (retroactive editing) since 003
  extends the editable diary UI built in 001.
- Spec 002 (search improvements) is independent and can run in parallel with Spec 001/003.
- Spec 004 (support) is fully independent and can be done at any time.
