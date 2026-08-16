# PRE-APPLY BASELINE

**Queried at:** `2026-08-16T18:11:34.627Z`  
**Mutation:** NONE  
**Evidence:** `PRE-APPLY-BASELINE.json`

## Production identity

| Field | Value |
|-------|--------|
| Database | `mineuqr` |
| Access | PRODUCTION |
| Journal | 0093 `778caa62a7bb57ad8dd461abab7f34b82633e0608cb289b22c35d8998859236b` |
| Journal id | 6174104 |
| Table count | 87 |

## Affected table (before)

| Table | Exists | Rows |
|-------|--------|-----:|
| `commercial_limit_occupancy_locks` | no | — |

## POS tables (must remain empty / unchanged)

| Table | Exists | Rows |
|-------|--------|-----:|
| `pos_terminals` | yes | 0 |
| `pos_permission_grants` | yes | 0 |
| `pos_sale_idempotency` | yes | 0 |

## Financial / commercial counts (before)

| Table | Count |
|-------|------:|
| orders | 44 |
| operational_checks | 43 |
| settlement_records | 41 |
| crmp_registers | 2 |
| crmp_financial_shifts | 7 |
| user_subscriptions | 8 |
| commercial_subscription_bindings | 4 |
| commercial_subscription_charged_terms | 1 |
| commercial_subscription_concessions | 0 |
| commercial_plans | 3 |
| commercial_prices | 10 |
| restaurants | 4 |
| categories | 7 |
| menu_items | 11 |

## 780001 (before)

| Field | Value |
|-------|--------|
| status | active |
| billingCycle | yearly |
| planId | `d836bd10-9d9f-4408-a076-f921354d785a` |
| currentPeriodEnd | `2027-06-21T10:47:36.000Z` |

## Certified migration hash to apply

| Tag | SHA-256 |
|-----|---------|
| `0094_commercial_limit_occupancy_locks` | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |

## Backup

BACKUP: SKIPPED — EXPLICIT OPERATOR AUTHORIZATION  
BACKUP PREREQUISITE: OVERRIDDEN  

Additive `CREATE TABLE` only. Matches POS-DOMAIN-PRODUCTION-APPLY-1 authorization pattern.
