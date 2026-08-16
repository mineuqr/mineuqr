# TEST PLAN

| # | Invariant | Proof |
|---|-----------|--------|
| 1 | Trial/onboarding cap ≥ 1 → first restaurant permitted | Pure decide + catalog bootstrap Professional cap 5 + register transactional opens tx |
| 2 | Cap = 0 → fail closed | Pure decide + catalog `saveLive` Professional 0 + register does not open tx |
| 3 | Missing/unavailable cap → no restaurant | Missing key `limit_unavailable`; unresolved plan `CommercialOccupancyUnavailableError` |
| 4 | Tenant isolation | Trial plan id must match; Basic cap 0 does not affect Professional onboarding |
| 5 | Existing occupancy respected | `proposedTotal: 2` with cap 1 denied (onboarding itself is new owner 0→1) |
| 6 | Occupancy-helper rollback | N/A — helper not used; fail before tx (no restaurant created) |
| 7 | Concurrent duplicate register | Unique email/openId (existing); cannot create two owners for one email |
| 8 | Supported plans still onboard | Bootstrap Professional cap 5 allows |
| 9 | Commercial regression | Occupancy + live-plan limits + entitlement + POS suite |

Architecture guards: assert before `tx.insert(restaurants)`; no occupancy helper on register; no `?? 1`; HTTP capacity distinct from 401 / “غير مصرح بالوصول”.
