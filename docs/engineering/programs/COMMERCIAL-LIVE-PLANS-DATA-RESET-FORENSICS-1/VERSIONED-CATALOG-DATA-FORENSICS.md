# VERSIONED-CATALOG-DATA-FORENSICS.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1

---

## Plan versions (5)

| Version ID (prefix) | Plan code | State | Published | Retired | Referenced by active sub? | Invoice? | Binding? |
|---------------------|-----------|-------|-----------|---------|---------------------------|----------|----------|
| 7a5ed8e5… | `001` | **published** | 2026-08-02 | — | No | No | No |
| f1b5ae11… | `002` | **published** | 2026-08-02 | — | No | No | No |
| 6ddf7b45… | `basic` | **retired** | 2026-07-30 | 2026-07-30 18:26 | No | No | No |
| 72b09c0c… | `professional` | **retired** | 2026-07-30 | 2026-07-30 18:26 | No | No | No |
| 6376f13f… | `enterprise` | **retired** | 2026-07-30 | 2026-07-30 18:26 | No | No | No |

Referenced only by: `commercial_prices.planVersionId`, bundle/limit FKs inside catalog.  
**Not** referenced by accounts, invoices, billing cycles on subscriptions, or runtime bindings.

Runtime on **current production schema** hydrates versions if the deployed app still has the versioned catalog. Uncommitted live-plan code **does not** read `commercial_plan_versions` (table removed from Drizzle schema). Production **has not** deployed that code.

---

## Snapshots

`commercial_snapshot_definitions`: **0 rows**.  
`commercial_snapshots` table: **ABSENT**.

0086 charged-term JSON backfill would update **zero** bindings (bindings also zero) from **zero** payloads.

---

## Publication / retirement records

| Table | Rows |
|-------|------|
| `commercial_publication_rules` | 0 |
| `commercial_publications` | ABSENT |
| `commercial_retirement_policies` | 3 (bootstrap `no-renew-retired` + admin `001-ret` / `002-ret`) |
| `commercial_retirements` | ABSENT |

Retirement policy rows are catalog metadata only. No subscription references them.

---

## Snapshot bindings

`commercial_subscription_bindings`: **0**.  
No `snapshotId` in use.

---

## Version-specific pricing

14 price rows, all keyed by `planVersionId`:

- Standard plans (retired v1): Basic **0.00 USD**; Professional 99 SAR / 26.40 USD; Enterprise 299 SAR / 79.73 USD
- Admin `001`/`002` (published): 19/190 USD and 39/390 USD — copies of **legacy USD** `subscription_plans` amounts, not the SAR catalog terms

None of these prices appear on paid invoices. Pending invoices use legacy USD amounts via `subscription_plans`, not these version rows.

---

## Legacy capability mappings

Table `commercial_capability_mappings` **does not exist**. Capabilities live in `commercial_bundle_features` (65 rows) attached to bundles, not to subscribers.

Unbound runtime uses `src/lib/commercial/planFeatureMatrix.ts` + `subscription_plans` — a **code** matrix, not these DB rows.

---

## Verdict on “meaningful production data”

Versioned catalog structures are **bootstrap + admin experiment**. They have **no business consumer**:

- not referenced by active (or any) subscription
- not referenced by account FKs
- not referenced by invoice
- not referenced by subscription billing cycle
- not referenced by a binding
- snapshots empty

They may be reset. They must not be **converted in place** by current 0086, because that would promote `001`/`002` as the live published plans and leave standard plans on retired v1 fallback.
