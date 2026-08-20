# PRODUCTION-MIGRATION-0096-COLLECTION-FACT-EXECUTION-1

**Final status: PASS — 0096 PAYMENT COLLECTION FACT INFRASTRUCTURE APPLIED**
**Adoption: NOT ADOPTED**

| Field | Value |
|-------|--------|
| Target environment | Production (TiDB Cloud `gateway01` / `.prod.` / TLS) |
| Target database/schema | `mineuqr` (port 4000) |
| Migration | `0096_payment_collection_facts` |
| SQL hash | `ae387c23fc92e9ac9769552f125fec5780d58eff3af59c3baa6306c235a0cb1f` |
| Source commit | `bb875be3` `feat(financial): implement immutable payment collection fact` |
| Mechanism | `pnpm exec drizzle-kit migrate` after proving pending = **0096 only** |
| Start | `2026-08-20T00:55:38.3925167Z` |
| End | `2026-08-20T00:55:47.4188049Z` |
| Result | **SUCCESS** — `migrations applied successfully!` EXIT **0** |
| Backup | No new backup created — explicitly authorized by user |
| Application deploy | **NOT DONE** |
| Git push | **NOT DONE** |

## Previous migration state

| Item | Before | After |
|------|--------|--------|
| Journal terminus | `0095_check_charges` (`02f6ad22…12d08cca`, id `6234102`) | `0096_payment_collection_facts` (`ae387c23…a0cb1f`, id `6264102`) |
| Hash count 0095 | 1 | 1 |
| Hash count 0096 | 0 | **1** (exactly once) |
| `payment_collection_facts` | absent | present, **0 rows** |
| Pending | `0096_payment_collection_facts` only | none |

## Table verification

`payment_collection_facts` exists. Expected columns present, including frozen money (`subtotal`, `discountAmount`, `taxAmount`, `amount`, `currencyCode`), snapshots, tenders, `purpose` enum `synthetic|shadow|test|validation` (no `production`), `kind` `collection`.

0096 did **not** create a restaurant collection `payments` table. The pre-existing SaaS/Tap `payments` table (subscription billing, `tapChargeId`) remains at **5** rows.

## Constraint / index verification

| Index | Unique | Columns |
|-------|--------|---------|
| PRIMARY | yes | `id` |
| `payment_collection_facts_fact_id_unique` | yes | `collectionFactId` |
| `payment_collection_facts_idempotency_unique` | yes | `restaurantId, idempotencyKey` |
| `payment_collection_facts_intent_unique` | yes | `restaurantId, paymentIntentId` |
| `payment_collection_facts_restaurant_id` | no | `restaurantId` |
| `payment_collection_facts_restaurant_order` | no | `restaurantId, orderId` |
| `payment_collection_facts_restaurant_purpose` | no | `restaurantId, purpose` |
| `payment_collection_facts_business_day` | no | `businessDay` |
| `payment_collection_facts_channel` | no | `restaurantId, orderingChannel` |

## Data-safety verification (row counts unchanged)

| Object | Before | After |
|--------|--------|--------|
| `operational_checks` | 221 | 221 |
| `settlement_records` | 148 | 148 |
| `orders` | 176 | 176 |
| `check_settlement_transactions` | 145 | 145 |
| `check_charges` | 88 | 88 |
| `restaurants` | 4 | 4 |
| SaaS `payments` | 5 | 5 |
| `payment_collection_facts` | n/a | **0** |

No UPDATE/INSERT/ALTER against existing financial tables. `pnpm db:verify-schema` **OK** (includes `payment-collection-facts`).

## Runtime impact

Dormant infrastructure only. No application deployment.

Cashier Confirm remains ADR-038: `confirmPayment` → Check materialize/finalize + ST + OS + SR. Collection Fact is not on that path. PAID, Revenue, and Settlement are unchanged. No customer-facing behavior change from this migration.
