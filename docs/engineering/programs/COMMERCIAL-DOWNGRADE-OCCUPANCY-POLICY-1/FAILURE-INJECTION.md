# FAILURE INJECTION

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## What changed

Only the occupancy helper’s interpretation of occupancyDelta 0 + hard `limit_exceeded`. Plan bind, catalog save, and domain create/delete are unchanged.

## Cases

| After | Failure | Observed |
|-------|---------|----------|
| Plan / cap change | Subsequent create denied | Existing rows unchanged (TiDB downgrade-then-create) |
| Entitlement deny (`not_entitled`) on occupancyDelta 0 | Replace rejected | Unit: no create callback |
| Commercial lock / decide allow, create throws | Txn rollback | TiDB occupancy 0 after injected `g11_injected_failure` |
| Cache / invalidation | `saveLive` invalidates; default path uncached | No partial binding from this program |
| Related writes | Bind does not write domain rows | No partial restaurant/POS mutation on downgrade |

## Partial state

- No partial plan state introduced (no new plan tables).
- No partial resource mutation on denied create (helper throws before/without committing create; create-throw rolls back).
- Cap UPDATE and occupancy INSERT remain separate transactions (accepted boundary; see `CONCURRENT-PLAN-CHANGE.md`).
