# 02 — PRODUCTION IDENTITY PROOF

**Queried at:** 2026-08-15T13:29:47.217Z  
**Access:** PRODUCTION  
**Mutation:** NONE  
**Statements:** SELECT + INFORMATION_SCHEMA only  
**Script:** `_readonly-proof.mjs`  
**Evidence:** `_QUERY-EVIDENCE.json`

## Target

| Field | Value |
|-------|-------|
| Environment | TiDB Cloud Production |
| hostKind | tidb_cloud |
| hostPattern | tidbcloud_prod |
| database | mineuqr |
| TLS | true |
| port | 4000 |
| matchesKnownProductionShape | true |
| Session DATABASE() | mineuqr |
| Server timestamp | 2026-08-15T10:29:52.000Z |

No credentials, connection strings, or customer PII in this report.

## Schema

`user_subscriptions.planId`:

| Fact | Value |
|------|-------|
| DATA_TYPE | varchar |
| COLUMN_TYPE | varchar(36) |
| IS_NULLABLE | NO |
| CHARACTER_MAXIMUM_LENGTH | 36 |

## Subscription identity

| Metric | Value |
|--------|-------|
| total subscriptions | 7 |
| valid UUIDs | 7 |
| invalid UUIDs | 0 |
| orphan UUIDs | 0 |
| NULL count | 0 |
| digit_string / other | 0 |
| distinct UUID count | 3 |
| ambiguous identity | 0 |

Status distribution:

| status | n |
|--------|---|
| active | 5 |
| expired | 2 |
| trial | 0 |
| canceled | 0 |

## Live Plan mapping

Every stored UUID exists in `commercial_plans.id` and maps to exactly one Live Plan code:

| UUID | code | n |
|------|------|---|
| `0ade795a-02fa-4d3e-b9b5-262515bade09` | professional | 4 |
| `d836bd10-9d9f-4408-a076-f921354d785a` | enterprise | 2 |
| `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | basic | 1 |

No reverse integer bridge is required for normal subscription identity resolution.

## Journal

Latest `__drizzle_migrations`:

| id | hash prefix | Role |
|----|-------------|------|
| 6084102 | `0836fac35ca3515d` | 0088 (terminus) |
| 6054102 | `d1d9b161c405cc8e` | 0087 |
| 6024102 | `cfaec30e54892eaf` | 0086 |

0088 remains applied. This program did not migrate.

## Parity vs OD-2 / forensics (2026-08-15T12:51:39.467Z)

| Metric | Prior | Current | Delta |
|--------|-------|---------|-------|
| subscriptions | 7 | 7 | 0 |
| active / expired | 5 / 2 | 5 / 2 | 0 |
| distinct UUIDs | 3 | 3 | 0 |
| UUID → code | basic 1 · professional 4 · enterprise 2 | same | 0 |
| invalid / orphan / NULL | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| bindings | 2, disagreement 0 | 2, disagreement 0 | 0 |
| leftover `subscription_plans` | 3 rows | 3 rows | 0 |
| journal terminus | 0088 | 0088 | none |

Population change: **none**. Identity anomalies: **none**.

## Decision

**IDENTITY GATE: PASS**
