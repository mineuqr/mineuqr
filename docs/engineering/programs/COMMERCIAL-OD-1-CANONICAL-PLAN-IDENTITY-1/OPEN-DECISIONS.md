# OPEN-DECISIONS

| ID | Status | Notes |
|----|--------|-------|
| **OD-1** Canonical plan identity | **RESOLVED — APPROVED** | UUID = canonical internal ID; code = business key |
| OD-2 ALTER `user_subscriptions.planId` | Open | Implementation / data-safety |
| OD-3 Public `planId: number` → UUID | Open | Breaking first-party API |
| OD-4 Retire `PLAN_ID_TO_CATALOG_PLAN` with the bridge | Open | After integer callers are gone |
| OD-5 Production re-read of planId values | Open | Required before any DML |

Optional later: register I-OD1-01…09 into ADR-034 (see ADR-IMPACT). Not a blocker of this decision.

Not opened: SAFE DELETE, Payment Provider, Tax, FX, Refund, POS, Checkout price policy, MRR policy.
