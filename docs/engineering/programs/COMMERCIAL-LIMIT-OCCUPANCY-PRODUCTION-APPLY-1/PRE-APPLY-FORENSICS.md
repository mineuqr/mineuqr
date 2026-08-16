# PRE-APPLY FORENSICS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1  
**Queried at:** `2026-08-16T18:11:34.627Z`  
**Server time:** `2026-08-16T15:11:28.000Z`  
**Mutation:** NONE  
**Access:** PRODUCTION (`tidbcloud_prod`, TLS, port 4000, `DATABASE()=mineuqr`)  
**Evidence:** `PRE-APPLY-BASELINE.json`

## Gate results

| Check | Result |
|-------|--------|
| Production target `mineuqr` | PASS |
| Journal terminus `0093_pos_sale_idempotency` | PASS (id 6174104, hash `778caa62…`) |
| `0091_pos_terminals` applied once | PASS |
| `0092_pos_permission_grants` applied once | PASS |
| `0093_pos_sale_idempotency` applied once | PASS |
| `0094` not applied | PASS (hash count 0) |
| Local file `drizzle/0094_commercial_limit_occupancy_locks.sql` | PASS |
| Local SHA-256 | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| SQL integrity (CREATE TABLE only; no DML/DROP/ALTER; no POS lock; no `commercial_limit_values`; no occupancy counter) | PASS |
| `commercial_limit_occupancy_locks` absent | PASS |
| Occupancy-like / POS lock tables | none |

## Certified predecessor hashes (unchanged)

| Tag | SHA-256 | Production count |
|-----|---------|-----------------:|
| `0091_pos_terminals` | `05872dc0400bf5857760ef35dea1d7b5e7a9200ad5b375861f8b2138b9f01c21` | 1 |
| `0092_pos_permission_grants` | `e7bf4f7392e66eeae9c8b3aa953e3db12dc483f5e667f3702ec94cb3e3efcd5e` | 1 |
| `0093_pos_sale_idempotency` | `778caa62a7bb57ad8dd461abab7f34b82633e0608cb289b22c35d8998859236b` | 1 |

Pending journal migration to apply: **only** `0094_commercial_limit_occupancy_locks`.
