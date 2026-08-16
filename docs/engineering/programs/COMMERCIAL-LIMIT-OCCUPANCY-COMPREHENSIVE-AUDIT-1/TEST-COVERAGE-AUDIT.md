# TEST COVERAGE AUDIT

Do not treat “a unit test exists” as invariant proof.

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Below / at cap (unlocked) | **PROVEN** | `commercialLimitOccupancy.test.ts` |
| Architecture: no POS lock, no counter, no `commercial_limit_values` lock | **PROVEN** (static) | `commercialLimitOccupancy.guards.test.ts` |
| Same-tenant concurrent create | **PROVEN** (MySQL 8 helper) | concurrency suite |
| Cross-tenant concurrent | **PROVEN** (MySQL 8 helper) | concurrency suite |
| Rollback | **PROVEN** (MySQL 8) | concurrency suite |
| Lock row acquisition | **PROVEN** (MySQL 8) | concurrency suite |
| Domain `resolveExisting` | **PROVEN** (MySQL 8 + unlocked) | concurrency + unit |
| `not_entitled` fail closed | **PROVEN** (MySQL 8) | concurrency suite |
| TiDB pessimistic lock | **NOT PROVEN** | — |
| Restaurant table race | **NOT PROVEN** | helper only |
| Category/item table race | **NOT PROVEN** | helper only |
| Admin category/item cannot exceed | **NOT PROVEN** — path **allows** exceed | routers |
| POS provisioned replace concurrent | **NOT PROVEN** — path unlocked | `PosTerminalService.replace` |
| Onboarding vs restaurants cap 0 | **NOT PROVEN** | no test |
| Lifecycle: inactive restaurant still occupies | **NOT PROVEN** | implied by COUNT * |
| POS deactivate releases slot | **PARTIALLY PROVEN** | domain tests (in-memory) |
| Plan downgrade freeze | **NOT PROVEN** | policy absent |
| Privileged admin restaurant respects cap | **PARTIALLY PROVEN** | same helper; no admin-specific race test |
| Transaction `create(tx)` uses tx | **PROVEN** (inspection) | code review; no dedicated integration test on mysql restaurants |
| Repository tx on Drizzle POS | **PROVEN** (inspection + store tests for tx optional) | |

Regression suite from implementation: 56 files / 377 tests including occupancy. That proves **non-regression**, not full platform occupancy.
