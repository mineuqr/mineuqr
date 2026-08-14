# REGRESSION-REPORT.md

## Public Pricing

`projectPublicCatalogOfferings` still reads live plans + current bundle features. Capability save invalidates the public cache. Display continues to use Presentation (`projectFeatureKeysForCommercialDisplay`) — no bundle IDs or database IDs on the customer surface.

## Pricing (capability save path)

Tests: `saveLive({ capabilities })` on Professional leaves catalog amounts unchanged (26.40 USD monthly fixture).

This repair does **not** write production prices.

### Production catalog (read-only 2026-08-15)

| Plan | USD monthly / yearly | SAR monthly / yearly |
|------|----------------------|----------------------|
| Basic | **19.00 / 199.00** (drift vs certified 0.00 / 0.00) | — |
| Professional | 26.40 / 264.00 | 99.00 / 990.00 |
| Enterprise | 79.73 / 797.33 | 299.00 / 2990.00 |

Professional and Enterprise match the certified book. Basic catalog USD drifted **before** this program; do not correct here.

## Checkout

`subscription_plans` 30001–30003 monthly **19 / 39 / 99** USD unchanged. This program does not modify subscriptions, invoices, payments, or checkout.

## Removed architecture

No reintroduction of versions, snapshots, publications, retirements, draft, or publish.

## Typecheck

| Metric | APPLICATION-CUTOVER-1 baseline | This program |
|--------|-------------------------------:|-------------:|
| `error TS*` | 186 | **185** |

No new errors. One incidental `Array.from` conversion in a file already being edited removed a baseline `TS2802`. Remaining errors are the known repo baseline (kiosk, design-system, reporting, MapIterator `downlevelIteration` in catalog services, and pre-existing `CapabilityFilterPicker` `tone="healthy"`).

## Production build

`pnpm build` **PASS** (Vite client + `dist/index.js` + `dist/vercel-api.mjs`).

## Tests

| Suite | Result |
|-------|--------|
| `commercialLivePlans.capabilityEditor.repair.test.ts` | PASS |
| `commercialLivePlans.cleanReset.test.ts` | PASS |
| `commercialCatalogPublicPublishing.test.ts` | PASS |
| `commercialCatalogAdminExperience.guards.test.ts` | PASS |
| `commercialCapabilityExperience.guards.test.ts` | PASS |
| `commercialCatalogRationalization.guards.test.ts` | PASS |
| `commercialCatalogFoundation.architecture.guards.test.ts` | PASS |
| `commercialCapabilityOperationalValidation.test.ts` | PASS |

**7 files / 35 tests** in the first batch, plus **8** operational validation tests.

Pre-existing unrelated failures (3 vitest `getDb` mock gaps on `listPlans` / `checkTrialStatus`) are **not** introduced here and were not re-run as a blocker.

## Subscription boundary

No changes to `users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, or checkout code.
