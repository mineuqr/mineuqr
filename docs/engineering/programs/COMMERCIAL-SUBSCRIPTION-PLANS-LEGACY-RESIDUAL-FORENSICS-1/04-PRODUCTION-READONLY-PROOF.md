# 04 — PRODUCTION READ-ONLY PROOF

**Queried at:** 2026-08-15T12:51:39.467Z  
**Access:** PRODUCTION  
**Mutation:** NONE  
**Statements:** SELECT + INFORMATION_SCHEMA only  
**Script:** `_readonly-proof.mjs`  
**Evidence:** `_QUERY-EVIDENCE.json`

## Target

| Field | Value |
|-------|-------|
| hostKind | tidb_cloud |
| hostPattern | tidbcloud_prod |
| database | mineuqr |
| TLS | true |
| port | 4000 |
| matchesKnownProductionShape | true |

No credentials, connection strings, or customer PII in this report.

## subscription_plans

| Fact | Value |
|------|-------|
| Table exists | YES (BASE TABLE) |
| Row count | **3** |
| IDs | 30001, 30002, 30003 (all `isActive`) |
| Foreign keys referencing it | **none** |
| Foreign keys from it | **none** |

Classification of these rows: **unused leftover catalog data** aligned with the three Live Plan codes. Not customer subscription contracts. Not Charged Terms. Not invoices.

Do not delete.

## user_subscriptions

| Fact | Value |
|------|-------|
| `planId` column | `varchar(36) NOT NULL` |
| Row count | 7 |
| NULL `planId` | 0 |
| Shape | **7 UUID**, 0 digit_string, 0 other |
| Join to `commercial_plans.id` | basic 1 · professional 4 · enterprise 2 · unmatched 0 |
| Status | active 5 · expired 2 · trial 0 · canceled 0 |

Canonical UUID: **PASS**. No unexpected integer subscription identity in storage.

## bindings

| Fact | Value |
|------|-------|
| Row count | 2 |
| `planId` | varchar(36), **2 UUID** |
| `legacyPlanId` | populated: one `30001`, one `30003` |
| Disagreement `binding.planId` vs `user_subscriptions.planId` | **0** |

`legacyPlanId` remains populated compatibility residue. `planId` is Live Plan UUID.

## commercial_plans

| Fact | Value |
|------|-------|
| Row count | 3 |
| Codes | basic, professional, enterprise (1 each) |

## Journal

Latest `__drizzle_migrations`:

| id | hash prefix | Role |
|----|-------------|------|
| 6084102 | `0836fac35ca3515d` | 0088 (terminus) |
| 6054102 | `d1d9b161c405cc8e` | 0087 |
| 6024102 | `cfaec30e54892eaf` | 0086 |

0088 remains applied. This program did not migrate.

## Unexpected integer subscription identity

None in `user_subscriptions.planId`. Integers remain only as:

- leftover catalog table ids (`subscription_plans.id`)
- `bindings.legacyPlanId` on 2 rows

## Mutation performed

**NONE.**
