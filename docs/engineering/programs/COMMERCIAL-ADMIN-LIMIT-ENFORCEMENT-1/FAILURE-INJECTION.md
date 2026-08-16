# FAILURE INJECTION

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

Admin creates share the occupancy transaction. A thrown error after INSERT rolls back; COUNT is unchanged.

## Proven

Insert category then throw `g09_injected_failure_after_insert`: occupancy **0**, restaurant remains.

## Same-txn inject points (RC occupancy txn)

| After | Result |
|-------|--------|
| Occupancy mutex | no child |
| Parent lock | no child |
| checkLimit deny | no child (CommercialLimitExceededError) |
| Domain insert + throw | proven occupancy 0 |
| Related insert + throw | same rollback |
| Outbox | none on this path |

No slot is consumed by a failed admin create.
