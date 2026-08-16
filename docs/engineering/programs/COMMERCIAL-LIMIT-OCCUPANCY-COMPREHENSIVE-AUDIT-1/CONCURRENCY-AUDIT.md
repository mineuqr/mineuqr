# CONCURRENCY AUDIT

## Expected primitive

tenant lock row → `FOR UPDATE` → `checkLimit` → COUNT → domain create → COMMIT

## Evidence classes

| Evidence | What it proves | Engine |
|----------|----------------|--------|
| `commercialLimitOccupancy.concurrency.test.ts` (10 tests) | same-tenant one-slot-left; at-cap both fail; cross-tenant both succeed; rollback; lock row; retry; `resolveExisting`; `not_entitled` | **Isolated Docker MySQL 8.0** (`127.0.0.1:3307`) |
| `commercialLimitOccupancy.test.ts` | below/at cap; throw; resolveExisting | Unlocked in-memory (**not** concurrency) |
| Restaurant/category/item/POS domain tests | API/cap wiring | mocks / unlocked |

## Classification

| Invariant | Status |
|-----------|--------|
| Same-tenant concurrent create (helper) | **PROVEN** (MySQL 8, synthetic table) |
| Same-tenant at-cap concurrent | **PROVEN** (MySQL 8) |
| Cross-tenant concurrent | **PROVEN** (MySQL 8) |
| Rollback on create throw | **PROVEN** (MySQL 8) |
| Restaurant/category/item tables under the helper | **PARTIALLY PROVEN** (same helper; not raced on those tables) |
| POS slot-consuming register | **PARTIALLY PROVEN** (helper + domain unit tests; no POS-table MySQL race) |
| POS provisioned replace | **NOT PROVEN** — path **bypasses** helper |
| Admin category/item concurrent | **NOT PROVEN** — **no lock**; can exceed |
| Production TiDB `FOR UPDATE` | **NOT PROVEN** |

Do **not** claim TiDB concurrency correctness. Production apply certified schema only.

## Deadlock / retry

Helper retries errno 1213 / 1205 up to 3 times. Limit-exceeded is not retried. Not the Order BI retry module.

## Production today

Deployed app still check-then-act. Concurrent owner creates **can still exceed** on Production until occupancy code is deployed against 0094.
