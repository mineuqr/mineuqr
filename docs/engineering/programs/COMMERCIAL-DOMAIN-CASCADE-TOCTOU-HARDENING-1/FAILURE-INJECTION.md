# FAILURE INJECTION

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

All listed injections are **inside one RC transaction**. TiDB rolls back the whole txn. No orphan may remain.

## Proven on stagIn

After parent lock **and** category INSERT, throw `toctou_injected_failure_after_insert`.

Final SQL: restaurant=1, categories=**0**.

## Same-transaction rollback (architecture, not a second TiDB race each)

| Inject after | Expected |
|--------------|----------|
| Parent lock, before INSERT | No child row |
| Parent validation (`RestaurantGoneError`) | Occupancy txn aborts; no INSERT |
| Commercial mutex / COUNT / decide | Existing G-08 occupancy rollback; no extra child |
| Child INSERT then throw | Proven: child absent |
| Related child INSERT then throw | Same txn rollback |
| Outbox/event write | Category/item/POS provision paths audited here have no in-txn outbox |
| Delete children then throw before parent DELETE | RC txn rollback; parent and remaining children restored |
| Delete parent then throw before COMMIT | Rollback; parent still present |

Cascade audit log lines (`emitCascadeAuditEvent`) are **outside** SQL commit. They must not be treated as durability of domain rows.

## Occupancy compatibility

G-08 already proved insert-throw and related-insert-throw leave COUNT=0. This program does not change that helper.
