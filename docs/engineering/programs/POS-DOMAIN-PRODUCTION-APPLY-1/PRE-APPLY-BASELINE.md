# PRE-APPLY BASELINE

**Queried at:** `2026-08-16T12:17:06.940Z`  
**Mutation:** NONE  
**Evidence:** `PRE-APPLY-BASELINE.json`

## Production identity

| Field | Value |
|-------|--------|
| Database | `mineuqr` |
| Access | PRODUCTION |
| Journal | 0090 `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997` |
| Journal id | 6144102 |

## Affected tables (before)

| Table | Exists | Rows |
|-------|--------|-----:|
| `pos_terminals` | no | — |
| `pos_permission_grants` | no | — |
| `pos_sale_idempotency` | no | — |

## Financial / commercial counts (before)

| Table | Count |
|-------|------:|
| orders | 44 |
| operational_checks | 43 |
| settlement_records | 41 |
| crmp_registers | 2 |
| crmp_financial_shifts | 6 |
| user_subscriptions | 8 |
| commercial_subscription_bindings | 4 |
| commercial_subscription_charged_terms | 1 |
| commercial_subscription_concessions | 0 |
| commercial_plans | 3 |
| commercial_prices | 10 |

## 780001 (before)

| Field | Value |
|-------|--------|
| status | active |
| billingCycle | yearly |
| planId | `d836bd10-9d9f-4408-a076-f921354d785a` |
| currentPeriodEnd | `2027-06-21T10:47:36.000Z` |

## Certified migration hashes

| Tag | SHA-256 |
|-----|---------|
| `0090_commercial_subscription_concessions` | `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997` |
| `0091_pos_terminals` | `05872dc0400bf5857760ef35dea1d7b5e7a9200ad5b375861f8b2138b9f01c21` |
| `0092_pos_permission_grants` | `e7bf4f7392e66eeae9c8b3aa953e3db12dc483f5e667f3702ec94cb3e3efcd5e` |
| `0093_pos_sale_idempotency` | `778caa62a7bb57ad8dd461abab7f34b82633e0608cb289b22c35d8998859236b` |

## Backup

BACKUP: SKIPPED — EXPLICIT OPERATOR AUTHORIZATION  
BACKUP PREREQUISITE: OVERRIDDEN
