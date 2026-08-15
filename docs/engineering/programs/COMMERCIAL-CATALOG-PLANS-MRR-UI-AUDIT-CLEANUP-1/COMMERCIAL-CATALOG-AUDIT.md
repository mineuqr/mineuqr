# COMMERCIAL-CATALOG-AUDIT.md

Durable SSOT: MySQL `commercial_*` tables (`server/db/schema/commercial/tables.ts`).  
Runtime cache: `CommercialCatalogStore` + `planService` / `pricingService`.  
Hydration: `hydrateCommercialCatalogFromDb`.  
Public read: `listPublicOfferings` / `buildOffering` (non-regional USD).

Live plan UUIDs are generated at bootstrap; **codes** are stable: `basic`, `professional`, `enterprise`. Legacy payment IDs: 30001 / 30002 / 30003 (`LEGACY_PLAN_BRIDGE`).

## Canonical catalog matrix

Production values below are the **2026-08-15 read-only snapshots** from COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1, APPLICATION-CUTOVER-1, CAPABILITY-EDITOR-REPAIR-1, and LIMITS-FORENSICS-1. This program issued **no** production writes and did not re-seed.

| Field | Basic | Professional | Enterprise |
|-------|-------|--------------|------------|
| Code | `basic` | `professional` | `enterprise` |
| Legacy ID | 30001 | 30002 | 30003 |
| Commercial name | Basic | Professional | Enterprise |
| Trial policy | none | `default-trial-14` (14 days) | none |
| Public visibility | not hidden (unless admin hid) | same | same |
| Canonical currency | USD | USD | USD |
| Catalog USD monthly / yearly | **19.00 / 199.00** (drift vs certified bootstrap 0.00 / 0.00) | 26.40 / 264.00 | 79.73 / 797.33 |
| Catalog SAR monthly / yearly (`sa`) | — | 99.00 / 990.00 | 299.00 / 2990.00 |
| Checkout USD monthly / yearly (`subscription_plans`) | 19.00 / 175.00 | 39.00 / 349.00 | 99.00 / 899.00 |
| `restaurants` | 1 | 5 | `null` Unlimited |
| `categories` | 10 | 25 | `null` |
| `items` | 100 | 500 | `null` |

Bootstrap seed terms (`legacyPlanCommercialTerms.ts`) still say Basic **0.00 / 0.00**. Production catalog Basic USD drifted **before** this program. Do not “correct” here.

## Status

Live Plans are the **declared** commercial catalog SSOT for identity, capabilities, limits, and public list prices. Checkout and MRR still read `subscription_plans` (see [PRICE-AUDIT.md](./PRICE-AUDIT.md)).
