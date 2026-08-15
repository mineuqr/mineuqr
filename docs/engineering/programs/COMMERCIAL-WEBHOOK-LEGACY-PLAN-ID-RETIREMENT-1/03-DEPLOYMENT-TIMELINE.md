# 03 — DEPLOYMENT TIMELINE

GitHub Production environment. Status `success` = "Deployment has completed".

## Production deployments (2026-08-15)

| SHA | Role | Created (UTC) | Status |
|-----|------|---------------|--------|
| `a126a37e` | Last Production release **before** OD-3 UUID writers. Could still **emit** integer `custom_id.planId` / `metadata.plan_id`. | `2026-08-15T13:02:07Z` | success (`5920680975`) |
| `c1d64cba` | **OD-3** — public/API UUID identity; **new** PayPal/Tap writes = UUID; integer webhook **READ retained** | `2026-08-15T13:26:40Z` | success (`5920875333`) |
| `17d990dd` | OD-3 certification docs | `2026-08-15T13:40:12Z` | success (`5920980363`) |
| `e254099c` | OD-4 prepare (legacy identity prep). Webhook integer **READ still present**. Current Production at evidence time. | `2026-08-15T14:08:33Z` | success (`5921206466`) |

## Required timestamps

1. **Last Production deployment that could emit integer webhook metadata:** `a126a37e` at `2026-08-15T13:02:07Z`. After `c1d64cba`, checkout writers are UUID-only (`livePlanUuidInput`).
2. **OD-3 Production deployment:** `c1d64cba` at `2026-08-15T13:26:40Z`.
3. **Current Production deployment (at evidence):** `e254099c` at `2026-08-15T14:08:33Z`.
4. **Known in-app webhook retry/replay retention:** `webhookDedup` in-memory **6 hours**, visibility-only, **does not replay**, **does not persist payloads**. Process restart clears it. This is **not** a provider retention window.
5. **Provider delivery of an old event after a retention window:** **UNKNOWN.** PayPal and Tap APIs were not called. Provider retention periods were **not guessed**.

## Elapsed time (evidence clock)

At Production SELECT `2026-08-15T14:12:49.531Z`:

- ~70 minutes since last integer-capable **writer** deploy (`a126a37e`)
- ~46 minutes since OD-3 UUID **writers** (`c1d64cba`)
- Same calendar day

Checkout sessions and uncleared Tap charges created before `13:26:40Z` can still complete with leftover integer metadata. That in-flight set was **not** inventoried.

## Tap-specific replay shape

Tap plan identity is read from `retrieveTapCharge` (live provider GET). A late `CAPTURED` notification for a charge created **before** OD-3 still carries the charge's original `metadata.plan_id`, which may be an integer. MineuQR has no table of pending Tap charges.

## PayPal-specific replay shape

PayPal plan identity is read from the webhook body's `custom_id`. An order created **before** OD-3 still has integer `planId` in `custom_id` if that order completes later. MineuQR has no table of pending PayPal orders (`stripeSubscriptionId` is empty on all current subscription rows).
