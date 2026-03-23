# Billing, Access and Security Plan

## Status

- Scope: monetization, access control, admin permissions, Mercado Pago integration, and payment security.
- Context: MounTrack currently authenticates users with Firebase and validates tokens on backend APIs, but it does not have billing or entitlement infrastructure yet.
- Goal: charge for app access without storing raw payment data, block unpaid users server-side, and provide a secure admin/finance control panel.

## Understanding Summary

- The app will use a paid subscription model with a short free trial.
- Access to the app must depend on server-side payment entitlement, not only client auth state.
- Mercado Pago will be the payment provider for checkout, subscriptions, and webhook notifications.
- The app owner needs an internal admin area for finance, access grants, and operational control.
- Some users must receive manual free access, such as influencers, doctors, partners, or other invited accounts.
- Security requirements are strict: avoid payment hijacking, credential abuse, SQL injection, IDOR, webhook forgery, replay attacks, and privilege escalation.

## Assumptions

- Firebase remains the identity provider for v1.
- Billing state, entitlement state, admin roles, and audit data will live in Supabase Postgres, not only in Firebase custom claims.
- The app backend will be the source of truth for access decisions.
- Mercado Pago hosted or tokenized checkout will be used to reduce PCI scope.
- Mercado Pago MCP is configured in the local Codex environment for this workspace.

## Commercial Decision

### Recommended pricing

- Standard monthly price: `R$ 14,90`
- Free trial: `7 days`
- Annual plan: phase 2, not required for v1

### Launch option

- No temporary launch discount is required in the current decision.
- Permanent self-serve monthly price: `R$ 14,99`

### Why this structure

- `7 days` gives enough time to understand the app in real use before the paywall.
- `R$ 14,99` is still low-friction while giving better room for payment fees, support, and churn.
- Using one permanent price keeps communication and admin reporting simpler in v1.

## Decision Log

### 1. Trial instead of freemium

- Decided: use `7-day trial`.
- Alternatives: permanent free plan, feature-limited free plan.
- Reason: one week is long enough for a real product evaluation while keeping the conversion moment clear.

### 2. One paid tier in v1

- Decided: one self-serve paid plan.
- Alternatives: multiple tiers, family plan, professional tier.
- Reason: lower operational complexity, clearer conversion path, easier pricing validation.

### 3. Server-side entitlement

- Decided: app access depends on backend entitlement state.
- Alternatives: client-side gating, Firebase claims as source of truth.
- Reason: reduces auth bypass risk and keeps payment control auditable.

### 4. Separate payment from access grants

- Decided: manual courtesy access is modeled separately from paid subscriptions.
- Alternatives: mark courtesy users as paid.
- Reason: preserves financial reporting accuracy and avoids fake revenue records.

### 5. Mercado Pago official APIs in the critical path

- Decided: checkout, subscription state, and webhook reconciliation use official Mercado Pago APIs.
- Alternatives: MCP-only orchestration.
- Reason: the critical path must remain deterministic and under app backend control.

### 6. Supabase Postgres for billing and access control

- Decided: billing, entitlements, roles, and audit logs use Supabase Postgres.
- Alternatives: Firestore for financial state, mixed storage without a defined source of truth.
- Reason: relational constraints, idempotency, auditing, reporting, and payment reconciliation are more robust in Postgres.

## Target Architecture

## Identity and session

- Firebase handles login and identity proof.
- Backend validates Firebase ID token and issues a secure HTTP-only session cookie.
- The session cookie is used for server-side page access and API authorization.
- Client-side route protection remains a UX layer only.

## Storage decision

- Firebase continues as the identity provider and can keep existing product data already living in Firestore.
- Supabase Postgres becomes the system of record for:
  - plans
  - subscriptions
  - payments
  - entitlements
  - manual access grants
  - admin roles
  - audit logs
- Billing tables should be accessed only by server-side routes or server actions.
- Do not expose billing tables directly to the browser through a public Supabase client.

## Entitlement model

- Access is granted by entitlement, not by auth alone.
- A user may have one active entitlement source at a time, or multiple sources with clear precedence.

### Allowed access states

- `trialing`
- `active`
- `grace_period`
- `manual_grant_active`

### Blocked states

- `expired`
- `past_due`
- `cancelled`
- `fraud_hold`
- `chargeback_hold`
- `suspended`

### Entitlement precedence

1. `fraud_hold` or `chargeback_hold` blocks access regardless of other state.
2. `manual_grant_active` can override unpaid status if issued by authorized admin.
3. `active` and `trialing` allow access.
4. `grace_period` allows temporary access after payment failure.
5. all other states block access.

## Payment integration strategy

### Recommended provider flow

- Use Mercado Pago hosted or tokenized checkout.
- Do not capture or store raw card fields inside MounTrack.
- Use subscription or recurring billing capability from Mercado Pago for monthly plans.
- Receive payment lifecycle updates through signed webhooks.

### Critical flow

1. User logs in.
2. Backend creates or finds internal billing customer.
3. If first access and no prior plan, backend opens `trialing` entitlement with `trial_ends_at`.
4. After trial ends, backend blocks app and shows paywall.
5. User starts checkout through backend.
6. Backend creates checkout session and stores expected amount, plan, user binding, nonce, and expiration.
7. Mercado Pago processes payment.
8. Webhook arrives.
9. Backend verifies webhook authenticity, idempotency, and replay window.
10. Backend reconciles payment with Mercado Pago API and internal expected values.
11. Backend updates subscription and entitlement.
12. User access is unlocked only after successful reconciliation.

## Mercado Pago MCP policy

### Current state

- Mercado Pago MCP is installed in the local Codex environment used for this workspace.

### Recommended usage

- Phase 1: integrate official Mercado Pago APIs or SDK directly in the backend.
- Phase 2: use the configured Mercado Pago MCP for documentation lookup, operator tooling, sandbox support, or reporting assistance.

### Forbidden usage

- MCP must not be the only source of truth for:
  - payment approval
  - entitlement creation
  - webhook verification
  - fraud decisions

## Data Model

## Core tables

### `users`

- `id`
- `firebase_uid`
- `email`
- `display_name`
- `created_at`
- `updated_at`

### `roles`

- `id`
- `code` (`owner`, `admin`, `finance`, `support`, `user`)
- `description`

### `user_roles`

- `user_id`
- `role_id`
- `granted_by`
- `granted_at`

### `billing_customers`

- `id`
- `user_id`
- `provider` (`mercado_pago`)
- `provider_customer_id`
- `created_at`
- `updated_at`

### `plans`

- `id`
- `code`
- `name`
- `billing_interval` (`monthly`)
- `amount_cents`
- `currency`
- `trial_days`
- `is_active`

### `subscriptions`

- `id`
- `user_id`
- `billing_customer_id`
- `plan_id`
- `provider_subscription_id`
- `status`
- `trial_ends_at`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `canceled_at`
- `grace_period_ends_at`
- `created_at`
- `updated_at`

### `payments`

- `id`
- `user_id`
- `subscription_id`
- `provider_payment_id`
- `provider_status`
- `internal_status`
- `amount_cents`
- `currency`
- `paid_at`
- `raw_reference_id`
- `created_at`

### `checkout_sessions`

- `id`
- `user_id`
- `plan_id`
- `expected_amount_cents`
- `currency`
- `nonce`
- `provider_checkout_id`
- `status`
- `expires_at`
- `created_at`

### `entitlements`

- `id`
- `user_id`
- `source_type` (`trial`, `subscription`, `manual_grant`, `staff`)
- `source_id`
- `status`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

### `manual_access_grants`

- `id`
- `user_id`
- `grant_type` (`influencer`, `doctor`, `partner`, `courtesy`, `staff`, `lifetime`)
- `reason`
- `notes`
- `starts_at`
- `ends_at`
- `granted_by`
- `revoked_by`
- `revoked_at`
- `created_at`

### `billing_events`

- `id`
- `provider`
- `provider_event_id`
- `event_type`
- `signature_verified`
- `processed_at`
- `processing_status`
- `idempotency_key`
- `created_at`

### `audit_logs`

- `id`
- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `metadata_json`
- `created_at`

## Access Rules

## Entry rule

- A logged-in user may enter the app only if `access_allowed = true`.
- `access_allowed` must be computed on the server using entitlement state.
- `owner` and `admin` may bypass the subscription gate server-side so operators are not blocked during billing recovery flows.
- Frontend checks are informative only.

## Sensitive operations

- Only `owner` can assign or revoke `admin`.
- `owner` and `admin` can create or revoke `manual_access_grant`.
- `finance` can view billing, payments, and export reports but cannot change roles.
- `support` can view user status and operational history but cannot unlock paid access.

## Owner bootstrap strategy

- The owner must be a normal user account inside the system.
- Use environment bootstrap for the first secure promotion:
  - `BOOTSTRAP_OWNER_EMAIL=your@email.com`
- Use environment bootstrap for additional operator seeding when needed:
  - `BOOTSTRAP_ADMIN_EMAILS=admin1@email.com,admin2@email.com`
- On first successful login with that email:
  - create user if needed
  - assign `owner` and any configured bootstrap operator roles
  - write audit log
- After that, role escalation must happen only through owner-controlled admin actions.
- Enforce MFA for `owner` and `admin`.

## Admin and Finance Interface

## 1. Billing dashboard

- MRR estimate
- active subscribers
- trial users
- conversions from trial to paid
- failed renewals
- churn count
- chargeback count
- revenue by day, week, month

## 2. Users and access panel

- search by email, uid, or name
- current entitlement summary
- payment history
- trial start and trial end
- create manual grant
- revoke manual grant
- reason and note fields

## 3. Subscriptions panel

- subscription status
- plan
- next renewal
- grace period deadline
- cancel-at-period-end flag
- provider ids

## 4. Payments and webhooks panel

- incoming events
- webhook signature result
- replay detection result
- idempotency result
- reconciliation failures
- mismatch alerts for amount, currency, or user binding

## 5. Roles and operators panel

- owner list
- admin list
- finance list
- support list
- permission history
- admin actions with audit details

## Security Policy

## Payment data rules

- MounTrack must never store raw card number, CVV, or full sensitive card payloads.
- MounTrack should only store provider ids, status, value, timestamps, and minimal metadata needed for reconciliation.
- Logs must exclude secrets, tokens, authorization headers, and sensitive PSP payload fragments.

## Webhook rules

- Verify webhook signature using provider secret.
- Verify timestamp freshness.
- Reject replayed events.
- Enforce idempotent processing.
- Reconcile important events against Mercado Pago API before changing access state.
- Reject events with amount, currency, or user binding mismatch.

## Auth and session rules

- Session cookies must be HTTP-only, secure, and same-site hardened.
- Admin sessions should have shorter lifetime than standard user sessions.
- Owner and admin accounts must require MFA.
- Privileged actions must require recent-auth checks for sensitive mutations.

## Database and API rules

- All SQL must be parameterized.
- No string interpolation for queries.
- Input schemas must be strict.
- Billing endpoints must be rate-limited.
- Audit logging is mandatory for:
  - role changes
  - manual access grants
  - grant revocations
  - fraud holds
  - chargeback holds
  - owner bootstrap

## Fraud and payment hijack defenses

- Bind each checkout session to one internal `user_id`.
- Include nonce and expiration in checkout initiation.
- Do not trust frontend success redirects as approval.
- Reconcile provider payment id against expected checkout session.
- Hold suspicious records in `fraud_hold`.
- Separate courtesy grants from real payments to preserve reporting integrity.

## Threat Model Summary

## Key assets

- user identity
- paid entitlement
- admin privileges
- webhook secret
- provider tokens
- payment event integrity
- financial reporting data

## Trust boundaries

- browser to app frontend
- frontend to app backend
- app backend to Mercado Pago
- Mercado Pago to webhook endpoint
- app backend to database
- operators to admin interface

## Priority threats

### 1. SQL injection

- Risk: unauthorized read or mutation of subscriptions, roles, or payments.
- Mitigation: parameterized queries, schema validation, narrow database permissions, integration tests with malicious payloads.

### 2. IDOR / broken access control

- Risk: user reads or manipulates another user payment or entitlement.
- Mitigation: all billing queries scoped to authenticated server-side user id; object ownership checks; negative integration tests.

### 3. Webhook forgery or replay

- Risk: attacker activates access without paying.
- Mitigation: signature verification, timestamp validation, replay cache, idempotency, provider-side reconciliation before entitlement update.

### 4. Role escalation

- Risk: normal user becomes admin or owner.
- Mitigation: server-side RBAC, owner-only admin assignment, MFA, audit trail, recent-auth requirement.

### 5. Payment hijack

- Risk: attacker causes one payment to unlock another account.
- Mitigation: strict binding between checkout session, payment reference, and internal user id.

### 6. Secrets leakage

- Risk: provider secret or webhook secret exposed in logs or client code.
- Mitigation: backend-only storage, env isolation, no client exposure, secret rotation policy.

## Test Plan

## Unit tests

- subscription state transitions
- trial expiration logic
- grace period logic
- manual grant precedence logic
- RBAC permission checks
- webhook signature verification
- replay detection
- idempotency handling

## Integration tests

- login plus trial creation
- expired trial blocks access
- approved payment activates entitlement
- failed payment enters grace period
- repeated webhook is ignored safely
- forged webhook is rejected
- payment amount mismatch results in hold
- checkout session from one user cannot unlock another user
- role change writes audit log
- manual grant creation and revocation update access correctly

## Security tests

- SQL injection attempts in all billing endpoints
- IDOR attempts across user, subscription, payment, and grant identifiers
- XSS attempts in admin notes and operator fields
- CSRF validation for authenticated mutations where relevant
- brute-force and rate-limit tests on login-adjacent and billing endpoints
- privilege escalation attempts on admin and finance routes
- replay and delayed webhook delivery tests

## E2E tests

- new user login -> trialing -> paywall after trial
- trial user -> checkout -> approved payment -> active access
- active user -> renewal failure -> grace period -> blocked access
- owner promotes admin -> admin grants courtesy access -> audit log visible

## Go/No-Go Security Gates

- No raw payment data stored.
- All billing queries parameterized.
- All billing mutations authenticated server-side.
- Webhook signature verification enabled in production.
- Replay and idempotency protections enabled.
- Role changes fully audited.
- Owner/admin MFA enabled.
- Entitlement computed on server before page or API access.
- Manual access grants visible in audit and reporting.

## Implementation Phases

### Phase 0: design and schema

- finalize price and launch offer
- create billing schema
- define roles and entitlement policy
- define webhook verification rules

### Phase 1: billing core

- create plans, subscriptions, entitlements, checkout sessions, payments
- integrate Mercado Pago official APIs
- create webhook ingestion and reconciliation
- block access by server-side entitlement

### Phase 2: admin and finance panel

- dashboard
- user lookup
- manual grants
- payment and webhook observability
- audit log views

### Phase 3: hardening

- MFA for privileged users
- replay protection
- rate limiting
- security tests in CI
- secret rotation and incident runbook

## Open Business Choices

- Whether annual plan should wait for phase 2.
- Whether courtesy grants should expire by default or permit lifetime access.

## External References

- Mercado Pago subscriptions: <https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview>
- Mercado Pago webhooks: <https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks>
- MyFitnessPal Premium trial reference: <https://support.myfitnesspal.com/hc/en-us/articles/34347930588557-Premium>
- YAZIO pricing reference: <https://filecontent.yazio.com/press/international_pricing_awin.pdf>
