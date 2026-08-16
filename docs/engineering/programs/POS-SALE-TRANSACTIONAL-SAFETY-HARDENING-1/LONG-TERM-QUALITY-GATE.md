# LONG-TERM QUALITY GATE

## Why this is professional SaaS architecture today

The mapping row and the canonical Order share one InnoDB/TiDB transaction already used for Order + BI + outbox. A race cannot leave a second committed Order for the same POS sale key.

## Scale

| Axis | Behavior |
|------|----------|
| Restaurants | `restaurantId` in the unique key |
| Terminals | `terminalId` in the unique key |
| Concurrent cashiers | Unique insert serializes; loser rolls back |
| Branches | Still restaurant-scoped; branch key not required for this invariant |

## Future integrations

Payment/settlement/ZATCA continue to address the canonical Order id stored in the mapping. The persist hook can be reused for other command mappings that must be atomic with PlaceOrder.

## Technical debt

- Check enrollment remains after Order commit (pre-existing IdentityPlaceOrder)
- Order number allocation remains outside the Order tx (pre-existing PlaceOrder)
- In-process `runExclusive` is still not cross-instance; the unique index + rollback is

## Complexity avoided

POS-owned UnitOfWork, 0094 reservation schema, outbox worker, orphan Order deleter.

## Revisit if

Check+Order must be one transaction, or PlaceOrder must accept an injected session for multiple companions beyond this hook.
