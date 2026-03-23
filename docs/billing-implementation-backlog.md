# Billing Implementation Backlog

## Objective

Implement paid access for MounTrack with:

- Firebase as the identity provider
- Supabase Postgres as the billing and entitlement database
- Mercado Pago as the payment provider
- server-side access control
- admin and finance operations with auditability
- hardening against SQL injection, IDOR, webhook forgery, replay, privilege escalation, and payment hijacking

## Current gate from Supabase Security Advisor (2026-03-18)

- Billing and nutrition tables created in the `public` schema must keep row level security enabled.
- Current application architecture remains server-only for Postgres access through `pg`; browser access to billing tables stays out of scope.
- The correct default posture is `RLS enabled + no public browser policies` until a concrete Supabase client use case exists.
- The `pg_trgm` warning for extension placement is lower priority than the RLS errors and should be handled in a separate maintenance step.

## Current product status (2026-03-23)

- New users receive `7 days` of trial on the first eligible login.
- The home now carries the trial countdown and pre-blocking CTA before redirecting to `/subscribe`.
- Paid users can see their current subscription summary inside the app and request `cancel at period end` without losing the already paid period.
- The cancellation flow must remain idempotent and preserve `current_period_end`; canceling renewal must not revoke access immediately.

## Final Architecture

## Chosen stack

- Identity: Firebase Auth
- Product app data already in use: Firestore and current app stores
- Billing and access control: Supabase Postgres accessed server-side
- Payment provider: Mercado Pago official API and webhooks
- App server: Next.js route handlers and server-side helpers

## Storage split

### Firebase

- user authentication
- current session origin through Firebase ID token
- existing app data that already lives in Firestore

### Supabase Postgres

- plans
- subscriptions
- payments
- checkout sessions
- entitlements
- manual access grants
- roles
- audit logs
- billing events

## Important implementation rule

- Do not use a public Supabase browser client for billing tables.
- Do not let the browser query billing tables directly.
- Billing flows must go through server-side repositories using parameterized SQL.
- Reuse the existing repository style already present in the nutrition module.

## Runtime flow

### 1. Login

- user signs in with Firebase
- frontend gets Firebase ID token
- backend verifies token
- backend creates secure server session

### 2. Access decision

- backend resolves current user
- backend checks entitlement in Postgres
- access is allowed only when entitlement is active
- `owner` and `admin` bypass the paywall server-side for operational recovery and billing support
- client-side guards remain UX helpers only

### 3. Trial

- first eligible login creates `trialing` entitlement for `7 days`
- trial expiration is computed on the server
- once expired, protected routes redirect to paywall

### 4. Payment

- frontend requests checkout creation from backend
- backend creates checkout session bound to one internal user
- Mercado Pago checkout processes payment
- webhook notifies backend
- backend verifies, reconciles, and updates subscription and entitlement

### 5. Admin operations

- owner and admin can create manual access grants
- finance can inspect revenue and payment state
- support can inspect access state but not change sensitive billing controls
- all privileged actions write audit logs

## Security Architecture

## SQL injection prevention

- Use parameterized queries everywhere.
- No string interpolation for SQL.
- Keep billing persistence in a dedicated repository layer.
- Validate request payloads before repository calls.
- Reject unknown fields with strict schemas.
- Use least-privilege database credentials if possible.

## Access control

- All sensitive endpoints require authenticated server session.
- All user-scoped queries must include the internal authenticated user id.
- Never trust ids coming from the client without ownership checks.
- Role checks happen server-side before any privileged mutation.

## Webhook security

- Verify Mercado Pago webhook signature in production.
- Validate timestamp freshness.
- Reject duplicate deliveries with idempotency keys.
- Store raw event envelope metadata, not unsafe payload logs.
- Reconcile payment status against Mercado Pago API before unlocking access.

## Payment hijack prevention

- Bind checkout session to one user id and one plan.
- Persist expected amount and currency before redirecting to checkout.
- On webhook processing, compare:
  - user binding
  - amount
  - currency
  - provider reference
- If any mismatch occurs, set `fraud_hold` and require manual review.

## Privileged account security

- `owner` and `admin` require MFA.
- Sensitive actions require recent-auth confirmation.
- Role changes and manual grants must be audited.
- Never hardcode permanent admin users in code.
- Bootstrap the initial owner and any emergency operator roles from environment only once.

## Session hardening

- HTTP-only cookies
- `Secure`
- `SameSite=Lax` or stricter where compatible
- short lifetime for admin sessions
- logout revokes server session

## Logging policy

- Do not log raw card data.
- Do not log provider secrets.
- Do not log full authorization headers.
- Mask payment references where possible in operator-facing logs.
- Audit logs must be immutable from the app UI.

## Implementation Workstreams

## Workstream 1: Billing domain foundation

### Deliverables

- billing status model
- entitlement policy
- role policy
- repository interfaces

### Tasks

1. Define billing statuses:
   - `trialing`
   - `active`
   - `grace_period`
   - `past_due`
   - `cancelled`
   - `expired`
   - `fraud_hold`
   - `chargeback_hold`
2. Define entitlement precedence rules.
3. Define manual grant types.
4. Define role matrix:
   - `owner`
   - `admin`
   - `finance`
   - `support`
   - `user`
5. Define audit actions list.

### Risks

- mixing payment state and access state
- unclear precedence between paid access and courtesy grants

## Workstream 2: Postgres billing persistence

### Deliverables

- migration set for billing tables
- repository layer
- idempotent persistence for webhook events

### Tasks

1. Create migrations for:
   - `plans`
   - `billing_customers`
   - `subscriptions`
   - `payments`
   - `checkout_sessions`
   - `entitlements`
   - `manual_access_grants`
   - `roles`
   - `user_roles`
   - `billing_events`
   - `audit_logs`
2. Add unique constraints for provider ids.
3. Add indexes for:
   - `user_id`
   - `status`
   - `provider_event_id`
   - `current_period_end`
4. Build server-side repositories with parameterized queries only.
5. Add tests specifically targeting malicious input payloads.

### Risks

- weak uniqueness and duplicated webhook processing
- accidental browser exposure of billing data

## Workstream 3: Session and access gate

### Deliverables

- server-side session resolver
- entitlement guard helper
- protected app gate

### Tasks

1. Introduce server-side session cookie after Firebase token verification.
2. Build `requirePaidAccess()` or equivalent helper.
3. Add route-level or layout-level protected access gate.
4. Add paywall redirect when entitlement is invalid.
5. Preserve public routes:
   - login
   - landing
   - billing success or return pages as needed

### Risks

- relying only on current client-side `ProtectedRoute`
- leaving API endpoints accessible to unpaid users

## Workstream 4: Mercado Pago integration

### Deliverables

- checkout creation endpoint
- webhook endpoint
- reconciliation service

### Current state (2026-03-19)

- `POST /api/billing/checkout` creates and persists an internal checkout session bound to the authenticated user, plan, amount, currency, nonce, and expiration.
- When `MERCADO_PAGO_ACCESS_TOKEN` is configured, the route creates a real Mercado Pago recurring `preapproval` checkout, persists `provider_checkout_id` and `provider_checkout_url`, and returns the redirect URL to the client.
- `/subscribe` now prefers direct card tokenization with Mercado Pago.js when `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` is configured, posting `cardTokenId` to the backend so recurring subscriptions can be created with `status: authorized` without depending on the hosted sandbox review screen.
- Sandbox tokenization uses `NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL` on the client and `MERCADO_PAGO_TEST_PAYER_EMAIL` on the server so the test buyer email stays consistent across card token creation and preapproval authorization.
- Mercado Pago sandbox for recurring `preapproval` is stricter than one-off payment tests: collector and payer must both be test actors or both be real actors. Mixing a `TEST-...` buyer flow with a collector/token that Mercado Pago does not recognize as a matching test actor returns `400 Both payer and collector must be real or test users`.
- The collector test check now uses `GET /users/me` so sandbox can also work with `APP_USR-...` credentials that belong to a seller test account created inside Mercado Pago Developers.
- `POST /api/billing/webhooks/mercado-pago` now ingests webhook events, verifies the Mercado Pago signature when `MERCADO_PAGO_WEBHOOK_SECRET` is configured, and stores events idempotently in `billing_events`.
- Payment webhook reconciliation now fetches the provider payment, validates `amount + currency + external_reference`, stores `billing_payments`, updates `billing_subscriptions` and `billing_checkout_sessions`, and grants or blocks entitlements accordingly.
- Subscription lifecycle notifications beyond payment events remain the next increment for this workstream.

### Manual sandbox validation note (2026-03-23)

- A recurring sandbox checkout was created successfully against Mercado Pago and approved with a test buyer using the hosted subscription screen.
- The provider payment resource returned the expected `external_reference`, matching the internal `billing_checkout_session.id`.
- A signed webhook delivery to `/api/billing/webhooks/mercado-pago` was accepted and reconciled correctly, moving the records to:
  - `billing_checkout_sessions.status = completed`
  - `billing_payments.internal_status = paid`
  - `billing_subscriptions.status = active`
  - `billing_entitlements.status = active`
- Automatic webhook delivery was **not observed during the initial polling window** after approval, so the remaining operational follow-up is to inspect Mercado Pago webhook delivery logs/configuration for the seller test application.

### Tasks

1. Create `POST /api/billing/checkout`.
2. Generate checkout session with:
   - internal user id
   - plan id
   - expected amount
   - currency
   - nonce
   - expiration
3. Create webhook endpoint.
4. Verify webhook authenticity and replay window.
5. Reconcile event with Mercado Pago API.
6. Update payment, subscription, and entitlement only after reconciliation.
7. Add hold workflow for suspicious events.

### Risks

- trusting redirect success instead of webhook
- unlocking access before provider confirmation

## Workstream 5: Admin and finance panel

### Deliverables

- finance dashboard
- user access admin
- operator role management
- webhook observability

### Tasks

1. Build billing dashboard:
   - active subscribers
   - trial users
   - failed renewals
   - revenue summaries
2. Build user lookup panel.
3. Build manual grant creation flow.
4. Build grant revocation flow.
5. Build payments and webhook events screen.
6. Build roles screen restricted to owner.
7. Show audit history for privileged actions.

### Risks

- overpowered support users
- manual grants without expiration or reason

## Workstream 6: Security hardening and test coverage

### Deliverables

- security-focused automated tests
- operational checklist
- rollout gates

### Tasks

1. Add unit tests for:
   - entitlement logic
   - webhook signature checks
   - replay detection
   - idempotency
2. Add integration tests for:
   - unauthorized access
   - expired trial
   - checkout binding
   - payment mismatch
   - role enforcement
3. Add security tests for:
   - SQL injection
   - IDOR
   - XSS in operator notes
   - privilege escalation
   - replayed webhook
4. Add E2E tests for:
   - trial flow
   - paywall flow
   - successful payment
   - failed renewal
   - manual courtesy grant
5. Add CI gates for the billing surface.

### Risks

- coverage focused only on happy path
- missing abuse cases in payment and role flows

## Security Checklist

## Mandatory before production

- Billing endpoints exist only on the server.
- Billing queries are parameterized.
- Billing payloads are schema-validated.
- Webhook signature verification is enabled.
- Replay protection is enabled.
- Idempotency is enforced.
- Payment-to-user binding is checked.
- Owner bootstrap works once and is audited.
- Owner and admin require MFA.
- Courtesy grants require actor, reason, and timestamps.
- Audit logs capture all privileged mutations.
- No raw payment data is stored or logged.

## Recommended before production

- short admin session TTL
- recent-auth check for sensitive operator actions
- suspicious payment review queue
- chargeback hold workflow
- metrics and alerts for webhook failures

## Backlog Order Recommendation

1. Billing domain foundation
2. Postgres billing persistence
3. Session and access gate
4. Mercado Pago integration
5. Admin and finance panel
6. Security hardening and test coverage

## Non-goals for v1

- multi-tier packaging
- family or team plans
- coupon engine
- affiliate payouts
- in-app self-service advanced billing portal
- browser-side billing data access

## Open product decisions

- monthly permanent pricing is fixed at `R$ 14,99`
- whether annual plan is deferred fully to phase 2
- whether courtesy grants expire by default
- whether finance role can export CSV in v1 or only inspect dashboard

## Operator access note

- Regular users follow the billing decision again.
- Owner and admin keep the controlled bypass in [server-access.ts](G:/Apps/MounTrack/src/modules/billing/auth/server-access.ts) so internal operation is not blocked by billing incidents.

## Production credential cutover note

- Sandbox checkout, webhook delivery, reconciliation, entitlement unlock, and recurring subscription updates are already validated end to end.
- You can switch to real Mercado Pago credentials as soon as you want to start charging real customers.
- Vercel variables to replace together:
  - `MERCADO_PAGO_ACCESS_TOKEN`
  - `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
  - `MERCADO_PAGO_WEBHOOK_SECRET`
- Variables that stay the same if the production domain does not change:
  - `APP_BASE_URL`
  - `MERCADO_PAGO_NOTIFICATION_URL`
- Before opening the gate for real users:
  - point the Mercado Pago production webhook to `https://mountrack.vercel.app/api/billing/webhooks/mercado-pago`
  - confirm the webhook secret shown in the Mercado Pago production app matches Vercel exactly
  - run one real low-risk payment and confirm `checkout_session`, `payment`, `subscription`, and `entitlement` move to the expected states

## Webhook observability note

- Operator health check endpoint now exists at `GET /api/billing/webhook-health`.
- Access is restricted to `owner`, `admin`, and `finance`.
- The endpoint summarizes:
  - processed events in the last 24h
  - reconciliation failures in the last 24h
  - `received` events older than 10 minutes
  - latest processed timestamp
  - latest failure timestamp and event type

## Manual sandbox validation note (2026-03-23)

- A recurring sandbox checkout was created and approved successfully with the seller test app and buyer test account.
- Provider resource validation confirmed the real payment `150869308887` carried the expected internal `external_reference`, matching the checkout session created by the app.
- A signed delivery to [route.ts](G:/Apps/MounTrack/src/app/api/billing/webhooks/mercado-pago/route.ts) reconciled the payment correctly and produced:
  - `billing_checkout_sessions.status = completed`
  - `billing_payments.internal_status = paid`
  - `billing_subscriptions.status = active`
  - `billing_entitlements.status = active`
- Automatic delivery did not appear at first because the seller test application's webhook secret diverged from the value configured in Vercel.
- The fastest proof was the Mercado Pago webhook simulator:
  - first it returned `401 Unauthorized` against `https://mountrack.vercel.app/api/billing/webhooks/mercado-pago`
  - after aligning `MERCADO_PAGO_WEBHOOK_SECRET` in Vercel with the seller test application's current secret and redeploying, the simulator advanced to business-logic execution
- Once automatic delivery started, the seller test app sent a mix of `payment`, `subscription_preapproval`, and `subscription_authorized_payment` events. The webhook handler now branches by resource type, resolves authorized payments through `GET /authorized_payments/{id}` when needed, and no longer assumes `billing_payments.subscription_id` can be derived from a synthetic subscription id string.
  - with a fake `data.id`, the simulator returned `500`, which confirmed signature acceptance and a downstream reconciliation failure on a nonexistent payment id
  - with the real payment id `150869308887`, the simulator returned `200 OK`
- Operational nuance for this seller test application:
  - `Modo de teste` is the relevant webhook target for sandbox notifications
  - `Modo de produção` was empty in the app configuration
