# COMMERCIAL-LIVE-PLAN-IDENTITY-CONSOLIDATION-1 — FINAL REPORT

Date: 2026-08-15  
Authority: Architecture Authority / Technical Design Authority

## A. STATUS

**IDENTITY CONSOLIDATION — BLOCKED**

Full cutover to one internal plan identity was **not executed**.

Repository evidence proves the integer compatibility identity is still required by:

- `user_subscriptions.planId` (`int NOT NULL`)
- public checkout / admin `planId: z.number()`
- `PublicCatalogOffering.legacyPlanId`
- trial row writes
- PayPal `custom_id.planId` / Tap `metadata.plan_id` (MineuQR-echoed integers)
- `LEGACY_PLAN_BRIDGE` + `PLAN_ID_TO_CATALOG_PLAN`

STOP conditions that fired:

1. Live Plan UUID is not stable across catalog wipe; AA must choose UUID vs `code` (OD-1).
2. Production mapping was **not** re-queried this session (OD-5).
3. Changing `user_subscriptions.planId` is an ALTER that can lose unmapped rows.
4. Public API consumers exist — integer fields were not removed for aesthetics.
5. A new mapping table is forbidden; half-cutover would keep the bridge.

No Charged Terms reconstruction. No Checkout / MRR / entitlement policy change. No DROP of `subscription_plans`. No ADR amendment.

## B. CURRENT IDENTITY MODEL

```
LIVE PLAN (commercial_plans)
  ├── id   varchar(36) UUID PK     ← catalog PK; bindings already store this
  ├── code unique (basic|professional|enterprise)
  ├── capabilities / limits / offer list price / metadata
  └── public offering.planId = UUID

INTEGER COMPATIBILITY (second internal handle)
  ├── user_subscriptions.planId     int NOT NULL  (no FK)
  ├── bindings.legacyPlanId         int nullable
  ├── LEGACY_PLAN_BRIDGE            30001/30002/30003 ↔ code
  ├── PLAN_ID_TO_CATALOG_PLAN       duplicate client/shared map
  └── public/admin/checkout planId  number

subscription_plans
  └── leftover ORM table — NOT commercial authority
```

## C. TARGET IDENTITY MODEL (preferred, not executed)

```
                    LIVE PLAN
               Canonical Identity
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Capabilities      Limits        Offer Price
        │                             │
        ▼                             ▼
   Entitlements                    Checkout
        │
        ▼
   Subscription  ── livePlanId or code (AA chooses)
        │
        ▼
   Charged Terms
        │
        ▼
       MRR
```

No `legacyPlanId`. No `LEGACY_PLAN_BRIDGE`. No `subscription_plans.id` as commercial identity.

External provider IDs, financial document IDs, payment transaction IDs, and subscription row IDs remain their own classes.

## D. LEGACY IDENTITY

| Artifact | Remains? |
|----------|----------|
| `legacyPlanId` | **YES** — public offering, bindings, trial, checkout handle |
| `LEGACY_PLAN_BRIDGE` | **YES** — still required |
| `subscription_plans.id` in runtime commercial paths | **NO as authority** — table + unused ORM helpers remain |

## E. SUBSCRIPTION

Subscription does **not** store canonical Live Plan identity.

- `user_subscriptions.planId` = legacy integer
- `commercial_subscription_bindings.planId` = Live Plan UUID when bound
- Unbound path: integer → `LEGACY_PLAN_BRIDGE` → catalog code → entitlements

## F. WEBHOOKS

| Field | Class | Use |
|-------|-------|-----|
| PayPal `custom_id.planId` | B — our checkout integer echoed | Correlate subscription / bind Live Plan |
| Tap `metadata.plan_id` | B — our checkout integer echoed | Same |
| PayPal order / capture id | F | Provider transaction — unchanged |
| Tap charge id | F | Provider transaction — unchanged |

Webhooks do **not** read `subscription_plans`. They require the same integer checkout sent.

## G. TRIAL

Policy unchanged (14-day Professional).

Identity:

1. Catalog trial policy → integer `legacyPlanId` + UUID `professionalPlanId`
2. Fallback: `LEGACY_PLAN_BRIDGE` professional **30002**
3. Write: `user_subscriptions.planId = integer`
4. Bind: Live Plan UUID + `legacyPlanId`

## H. DTO / API

Legacy integer identity **remains exposed**.

Consumers exist: `Pricing.tsx` (`planId={legacyPlanId}`), `listPlans[].id`, checkout `z.number()`, admin create/update, Customer Success UI, `OwnerCommercialState.planId`.

Canonical UUID is already exposed as `PublicCatalogOffering.planId`.  
Canonical catalog key is already exposed as `planCode`.

No public field removed merely because it is ugly.

## I. DATABASE

| Object | Status |
|--------|--------|
| `commercial_plans.id` / `code` | Unchanged |
| `user_subscriptions.planId` | Unchanged `int NOT NULL`, no FK |
| `commercial_subscription_bindings` | Unchanged (UUID + optional legacy int) |
| `subscription_plans` | **Not dropped** |
| Migrations | **None executed** |

## J. DATA

Migration **not required for this program** because cutover was not executed.

Historical production forensics (2026-08-14): 5 test/internal rows, 30002×4 + 30003×1, 0 paid invoices.  
**This session did not re-query production.** Mapping is therefore not certified.

## K. TESTS

Executed 2026-08-15:

```
pnpm exec vitest run
  [20 commercial / identity / subscription / checkout / MRR /
   entitlements / trial / webhook / admin / invoice / notification /
   CRS-adjacent / reporting files]
```

**20 files passed. 165 tests passed. 0 failed.**

Identity guards GUARD-IDENTITY-01…07: **6 passed**.

Deferred until AA-approved cutover: subscription-column proofs 1–5, 8–9, 13–17; bridge removal proof 12.

## L. BUILD

```
pnpm build
```

**Exit code 0.** Vite production build + server esbuild + vercel handler completed.

## M. FINAL IDENTITY SCAN

See `FINAL-IDENTITY-SCAN.md`. Every remaining identity class is classified. No unexplained reference.

## N. SAFE DELETE READINESS

**NO — SCHEMA / ORM REMAINS**  
**NO — EXTERNAL COMPATIBILITY DEPENDENCY REMAINS** (integer public `planId` / subscription column)

`subscription_plans` is **not** ready for SAFE DELETE. Do not start that program from this one.

## O. ADR IMPACT

| ADR | Amendment? |
|-----|------------|
| ADR-ARCH-034 Commercial Catalog Authority | **NO** |
| ADR-ARCH-035 Commercial Price Semantics | **NO** |
| ADR-ARCH-036 Commercial MRR Constitution | **NO** |

Identity cutover, if later approved, is implementation under 034. Choosing `code` vs UUID as the subscription FK is OD-1, not an automatic ADR amend.

## P. GIT

| Item | Value |
|------|-------|
| HEAD | `e83eea82c7dc49d30002e4defc9ef3566acd2f9c` |
| Message | `refactor(commercial): remove legacy subscription plan dependencies` |
| Branch | `main` tracking `origin/main` |
| Modified | none (package + guard test are untracked) |
| Untracked | `docs/engineering/programs/COMMERCIAL-LIVE-PLAN-IDENTITY-CONSOLIDATION-1/` |
| Untracked | `server/commercial-catalog/__tests__/livePlanIdentity.guards.test.ts` |
| Commit | **NOT executed** |
| Push | **NOT executed** |
| Deploy | **NOT executed** |

## What this program shipped

- Forensic package (this directory)
- Authority guards proving Live Plan / Charged Terms remain commercial law
- Classification of every remaining identity
- Open decisions OD-1…OD-5 for Architecture Authority

## What this program did not do

- ALTER `user_subscriptions.planId`
- Remove `legacyPlanId` / `LEGACY_PLAN_BRIDGE`
- Drop `subscription_plans`
- Change Checkout price, MRR, Charged Terms, entitlements, or provider architecture
- Amend ADRs
- Commit / push / deploy

## STOP

Do not start SAFE DELETE.  
Do not start the schema/API identity cutover without Architecture Authority decisions OD-1…OD-5.
