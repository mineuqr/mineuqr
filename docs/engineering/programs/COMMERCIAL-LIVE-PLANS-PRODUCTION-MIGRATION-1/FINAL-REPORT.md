# FINAL-REPORT.md — COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1

**Date:** 2026-08-15  
**Database:** `mineuqr` (TiDB Cloud)  
**Verdict:** **READY FOR PRODUCTION CERTIFICATION**

This program applied approved migration `0086` and bootstrapped the three canonical Live Commercial Plans. It does **not** self-authorize application deployment. No commit, push, or deploy was performed.

---

## Migration number

`0086_commercial_live_plans` (journal idx 86).

## Migration execution result

| Item | Result |
|------|--------|
| Mechanism | `pnpm exec drizzle-kit migrate` |
| Result | applied successfully |
| Terminus | **0086** — `__drizzle_migrations.id` **6024102**, hash prefix **`cfaec30e54892eaf`**, `created_at` 1784720000000 |
| Prior 0085 | retained (id 5994103, `c104e894606f…`) |
| Governance | all journal hashes recorded; schema verify OK |
| Live columns | `featureBundleId`, `limitProfileId`, `trialPolicyId` on `commercial_plans` |
| Prices | keyed by `planId` |
| Obsolete tables | `commercial_plan_versions`, `commercial_snapshot_definitions`, `commercial_publication_rules`, `commercial_retirement_policies` **dropped** |

## Bootstrap result

| Run | Result |
|-----|--------|
| Phase 3 first | `bootstrapped` — 3 plans, 10 prices, 35 capability mappings |
| Phase 3 second | `already_initialized` — same counts |
| Phase 14 | `already_initialized` twice — no duplicates |

## Exact three Live Plans

| code | name | id |
|------|------|----|
| `basic` | Basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` |
| `professional` | Professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` |
| `enterprise` | Enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` |

## Capability counts

| Plan | Included Projection keys |
|------|-------------------------:|
| Basic | 7 |
| Professional | 13 |
| Enterprise | 15 |
| Total mappings | 35 |

Keys come from Projection + Presentation. `qrMenu` absent. Professional excludes `register` and `expo`. Enterprise includes both.

## Pricing values

**Catalog**

| Plan | USD mo / yr | SAR mo / yr |
|------|-------------|-------------|
| Basic | 0.00 / 0.00 | — |
| Professional | 26.40 / 264.00 | 99.00 / 990.00 |
| Enterprise | 79.73 / 797.33 | 299.00 / 2990.00 |

**Checkout (`subscription_plans`)** unchanged: 19 / 39 / 99 USD monthly (30001–30003).

## Runtime validation

- Bound path: Live Plan capabilities; no version/snapshot/publication/retirement.
- Unbound production subscriptions: still Legacy Bridge (bindings = 0).
- Fail-closed when a bound Live Plan cannot be read: PASS (automated).
- `getCommercialEntitlements` → Subscription Runtime: PASS (automated).
- Admin editor: `updatePlan` / `saveLivePlan` → `saveLive`; no publish/draft/version/retire/snapshot actions.
- Propagation A/B: PASS in-memory TEST A/C. No production test subscribers created.
- Pricing semantics 100 SAR vs 150 SAR: PASS in-memory TEST B. No production billing writes.

## Public pricing validation

Persisted Live Plans are the hydration source. Automated public-catalog tests PASS. HTTP Pricing against the currently deployed app was **not** run (deploy out of scope).

## Checkout validation

Charge path still uses `getSubscriptionPlanById` on `subscription_plans` 30001–30003. Checkout session tests PASS. Dual-book residual remains (see below).

## Owner data comparison

`user_subscriptions.id = 600001` **byte-identical** including `updatedAt` 2026-06-09T18:28:40Z. User 1 identity and restaurant ownership unchanged. Expired-access P0 **not** repaired.

## Tap payment comparison

`payments.id = 60001`: 349.00 SAR, captured, paidAt 2026-05-19T09:39:13Z — **unchanged**.

## Test results

Relevant suite: **143 passed / 3 failed / 22 files** (20 files fully green).

| Suite | Result |
|-------|--------|
| Clean reset A–D + 0086 guards | PASS (7) |
| AA capability / 100 vs 150 SAR | PASS (2) |
| Atomic save / rollback | PASS (4) |
| Bootstrap + public | PASS (4) |
| Public publishing | PASS (2) |
| Entitlement enforcement | PASS (10) |
| Entitlement guards | PASS (5) |
| Snapshot/live runtime authority | PASS (5) |
| `getCommercialEntitlements` | PASS (6) |
| Subscription audit | PASS (13) |
| Trial / webhook | PASS (5) |
| Admin invoices | PASS (5) |
| Invoice verification | PASS (11) |
| Projection guards | PASS (8) |
| Catalog architecture | PASS (7) |
| Admin UI / polish / experience | PASS |
| Operational validation | PASS (8) |
| Migration governance | PASS (10) |
| `createCheckoutSession` cases | PASS |
| `pnpm db:governance-check` | OK |
| Production build (`pnpm build`) | **PASS** |

### Three test failures (not introduced by this program)

`subscription.listPlans`, payment-flow list-plans, and `checkTrialStatus` fail because test `vi.mock("./db")` does not export `getDb`, which live-plan hydrate/binding lookup now calls. These mocks date from `SIMPLIFICATION-1`. This program did not change application code. Checkout **charge** tests in the same files passed.

## Baseline failures vs new failures

| Class | Result |
|-------|--------|
| Repo-wide `pnpm check` | **186** `error TS*` — baseline / pre-existing (kiosk routes, design-system, reporting, CRMP, catalog UI leftovers, etc.) |
| Failures introduced by this program | **none** (no application source edits; migration SQL + bootstrap data + program docs only) |
| Catalog UI tsc leftovers | `CatalogManagementPanels.tsx`, `versionCompare.ts`, `CapabilityFilterPicker.tsx` — prior Live Plan UI debt, not 0086 |

A pre-existing typecheck failure is documented. It is **not** treated as a migration blocker.

## Residuals

1. **Application not deployed.** Production DB is already 0086. The currently deployed app may fail any path that still queries dropped version/snapshot tables. AA must certify, then deploy the live-plan application as a **separate** act.
2. Dual price book: catalog USD ≠ checkout USD (by design this program).
3. After app deploy, `subscription.listPlans` prefers catalog display prices while checkout still charges `subscription_plans`.
4. Unbound runtime still uses `planFeatureMatrix` until a later bind program.
5. Catalog Basic list price is 0.00 USD.
6. Owner expired-access P0 remains open (`OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`).
7. Leftover filenames (`snapshotLoader.ts`, `versionCompare.ts`) are not publish/version actions.
8. Phase 16 authenticated HTTP smoke (login / dashboard / plan editor) was **not** executed because deploy is forbidden here.
9. Three `getDb` mock gaps in subscription/payment-flow tests (pre-existing).

---

**STOP.** Await Architecture Authority Production Certification. Do not commit, push, or deploy from this program.
