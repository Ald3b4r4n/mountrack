# Feature Specification: Support / SAC Section Improvements

**Feature Branch**: `004-support-sac-improvements`
**Created**: 2026-04-06
**Status**: Draft

## Context

Contact information is currently scattered: it exists as a hardcoded constant in
`src/modules/support-contact.ts` and is rendered at the bottom of the main dashboard and on the
subscription page. There is no dedicated, discoverable support section within the authenticated
app experience, and the landing/subscription pages do not prominently surface support options
before the user commits to a plan.

**Current contact details** (from `support-contact.ts`):
- Email: rafasouzacruz@gmail.com
- Phone: (61) 98288-7294
- WhatsApp: https://wa.me/5561982887294
- Website: https://antoniorafael.com.br

---

## User Scenarios & Testing

### User Story 1 — Dedicated Support Page Within the App (Priority: P1)

An authenticated user can navigate to a dedicated "Suporte" (Support) section from anywhere in
the app, where they find all contact channels organized clearly with one-tap actions.

**Why this priority**: Users encountering problems need to find help quickly; a discoverable
dedicated page reduces abandonment and support friction.

**Independent Test**: From the authenticated dashboard, find and navigate to the support section.
Verify it shows at minimum: WhatsApp link, email link, and a response time expectation.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they navigate to the support section, **Then**
   they see all contact channels (WhatsApp, email, phone) with one-tap/click activation.
2. **Given** the user taps the WhatsApp link, **When** their device handles the URL, **Then**
   the WhatsApp chat opens pre-addressed to the support number.
3. **Given** the user taps the email link, **When** their device handles the URL, **Then**
   their mail app opens pre-addressed to the support email.
4. **Given** the support page is open, **When** it renders, **Then** a visual hierarchy makes
   the fastest response channel (WhatsApp) the most prominent.

---

### User Story 2 — Support Access Point in Navigation (Priority: P1)

Users can reach the support section from a persistent, discoverable navigation element (e.g.,
user profile menu, settings, or a help icon) — not only by scrolling to the bottom of the
dashboard.

**Why this priority**: Current implementation requires scrolling past the entire diary to find
support — it is effectively hidden.

**Independent Test**: Without scrolling, find a navigation affordance leading to the support
section. Tap it and verify the support page/modal opens.

**Acceptance Scenarios**:

1. **Given** the user is on any main app screen, **When** they open the profile/settings menu
   or tap a help icon, **Then** a "Suporte" option is visible.
2. **Given** the user taps "Suporte", **When** the support view opens, **Then** it matches the
   dedicated support page content from Story 1.

---

### User Story 3 — Support Section on Landing / Subscription Page (Priority: P2)

A prospective user on the subscription/landing page can easily find contact information before
committing to a plan — to ask questions or verify the product is legitimate.

**Why this priority**: Subscription page conversions improve when users can verify they can get
help; trust signals before payment reduce churn.

**Independent Test**: Navigate to the subscription page without being logged in. Find the support
section. Verify WhatsApp and email links are functional.

**Acceptance Scenarios**:

1. **Given** the user is on the subscription/pricing page, **When** they look for support info,
   **Then** a visible section (not just a footer link) shows at minimum WhatsApp and email with
   a brief "Dúvidas? Fale conosco" CTA.
2. **Given** the support section is visible on the subscription page, **When** the user taps
   WhatsApp, **Then** the WhatsApp chat opens correctly.
3. **Given** the page renders on mobile, **When** viewed at 375px width, **Then** the support
   section is fully visible without horizontal scroll.

---

### User Story 4 — FAQ / Common Questions Section (Priority: P3)

The support page includes a short FAQ addressing the most common user questions (e.g., how to
log food, how to cancel a subscription, what databases are used).

**Why this priority**: Reduces support volume for predictable questions; P3 because it requires
content creation, not just development.

**Independent Test**: Open the support section. Verify at least 3 FAQ items are present, each
expandable to reveal an answer.

**Acceptance Scenarios**:

1. **Given** the support page is open, **When** the user sees the FAQ, **Then** questions are
   collapsed by default and expand on tap.
2. **Given** a FAQ item is expanded, **When** another is tapped, **Then** the first collapses
   (accordion behavior) to keep the view clean.

---

### Edge Cases

- All contact links must degrade gracefully if the app is running in a browser without native
  app integrations (e.g., WhatsApp web fallback via `wa.me` URL).
- Support contact details must be sourced from a single constant (`support-contact.ts`) — never
  duplicated inline across components.
- If the user's device cannot open a `tel:` link, the phone number must still be visible as
  copyable text.

---

## Requirements

### Functional Requirements

- **FR-001**: A dedicated support route or modal MUST be created, accessible from the
  authenticated app's navigation.
- **FR-002**: The support section MUST include: WhatsApp (primary CTA), email, phone number, and
  website — all sourced from `support-contact.ts`.
- **FR-003**: All contact channel links MUST use correct protocol handlers:
  `https://wa.me/...` for WhatsApp, `mailto:` for email, `tel:` for phone.
- **FR-004**: The subscription/landing page MUST include a support contact block with at minimum
  WhatsApp and email, visually distinct from the pricing cards.
- **FR-005**: Navigation to the support section MUST be reachable within 2 taps from any main
  app screen.
- **FR-006**: All contact details MUST remain centralized in `support-contact.ts`; no other file
  may hardcode contact values.
- **FR-007** *(P3)*: The support page SHOULD include an FAQ accordion with at least 3 items.

### Key Entities

- **SupportContact** (`support-contact.ts`): Single source of truth for all contact details —
  no changes needed to data, only to how it's surfaced.
- **Support Page / Component**: New dedicated view (route or modal) within the authenticated app.
- **Subscription Page** (`subscription/page.tsx`): Add support block above or below pricing
  section.

---

## Success Criteria

- **SC-001**: Support contact can be reached within 2 taps from the diary screen.
- **SC-002**: All contact links function correctly on both iOS and Android (WhatsApp, email, tel).
- **SC-003**: Contact details are defined in exactly one place in the codebase (`support-contact.ts`).
- **SC-004**: The subscription page support section is visible on first load without scrolling on
  a 375px mobile viewport [NEEDS CLARIFICATION: confirm placement — above fold or below pricing?].

---

## Assumptions

- `support-contact.ts` contact details are current and valid — no changes to the actual contact
  info in this spec.
- The FAQ content (questions + answers) will be provided by the product owner; the spec covers
  the UI implementation only.
- A new top-level route (e.g., `/suporte`) is preferred over a modal for the dedicated support
  page, to allow direct deep-linking.
- The landing/subscription page is within the same Next.js app; accessing it does not require
  authentication.
