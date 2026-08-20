# PRODUCTION-MIGRATION-0097 — Production Migration Report

**Final status: PASS — 0097 PAYMENT COLLECTION FACT PRODUCTION PURPOSE APPLIED**
**Cashier / Collection Fact Revenue / runtime: NOT ADOPTED**

| Field | Value |
|---|---|
| Target environment | Production (TiDB Cloud `gateway01` / `.prod.` / TLS) |
| Target database | `mineuqr` (port 4000) |
| Migration | `0097_payment_collection_facts_production_purpose` |
| SQL hash | `8c92973d8d62797db46067b61e485d2036d6fae0e7e6c952a7e9ffcdf636fc45` |
| Source commit | `baddc644` `feat(financial): define production collection fact eligibility` |
| Mechanism | `pnpm exec drizzle-kit migrate` after proving pending = **0097 only** |
| Start | `2026-08-20T02:12:00.1763589Z` |
| End | `2026-08-20T02:12:06.5663239Z` |
| Result | **SUCCESS** — `migrations applied successfully!` EXIT **0** |
| Backup | Not required / not created |
| Application deploy | **NOT DONE** |
| Git push | **NOT DONE** |

## Baseline (read-only preflight)

Pending = `0097_payment_collection_facts_production_purpose` only. SQL classified as purpose-enum ALTER only (no INSERT/UPDATE/DELETE/CREATE/DROP/FK).

| Item | Before | After |
|---|---|---|
| Journal terminus | 0096 `ae387c23…a0cb1f` id `6264102` | 0097 `8c92973d…36fc45` id `6294102` |
| Hash count 0096 | 1 | 1 |
| Hash count 0097 | 0 | **1** (exactly once) |
| purpose enum | `synthetic\|shadow\|test\|validation` | `synthetic\|shadow\|test\|validation\|production` |
| `payment_collection_facts` rows | 0 | **0** |
| production-purpose rows | 0 | **0** |

## Constraint / index verification (unchanged)

| Index | Unique | Columns |
|---|---|---|
| PRIMARY | yes | `id` |
| `payment_collection_facts_fact_id_unique` | yes | `collectionFactId` |
| `payment_collection_facts_idempotency_unique` | yes | `restaurantId, idempotencyKey` |
| `payment_collection_facts_intent_unique` | yes | `restaurantId, paymentIntentId` |
| `payment_collection_facts_restaurant_id` | no | `restaurantId` |
| `payment_collection_facts_restaurant_order` | no | `restaurantId, orderId` |
| `payment_collection_facts_restaurant_purpose` | no | `restaurantId, purpose` |
| `payment_collection_facts_business_day` | no | `businessDay` |
| `payment_collection_facts_channel` | no | `restaurantId, orderingChannel` |

## Related row counts (preflight vs post)

| Object | Before | After |
|---|---|---|
| `operational_checks` | 222 | 222 |
| `settlement_records` | 149 | 149 |
| `orders` | 177 | 177 |
| `check_settlement_transactions` | 146 | (not re-counted post; Collection Fact table unchanged) |
| `restaurants` | 4 | (unchanged in preflight set) |
| `payment_collection_facts` | 0 | **0** |

No Collection Fact INSERT/UPDATE/DELETE. No 0098+. `pnpm db:verify-schema` **OK** (includes `payment-collection-facts`).

## Runtime impact

Schema eligibility only. No application deployment. Cashier Confirm remains ADR-038. `commitCollectionFact` is not on Confirm/Cashier. PAID, Settlement writers, and Revenue Union logic were not modified by this program. With 0 Collection Fact rows, published Revenue remains legacy-equivalent.
