# REPLACEMENT SEQUENCE

## Domain sequence (unchanged)

1. Load previous terminal; must belong to `restaurantId`.  
2. If `replaced` → `already_replaced`.  
3. Insert a **new** terminal `lifecycle=registered` with a new code.  
4. Set previous `lifecycle=replaced`, `replacedByTerminalId=replacement.id`.

Net occupancy for a **provisioned** previous: −1 (previous leaves provisioned) +1 (replacement registered) = **0**.

Unprovisioned previous (`deactivated`): replacement consumes a slot (`occupancyDelta: 1`). Unchanged product rule.

## Temporary occupancy inside the transaction

Insert happens before mark-replaced. Inside one occupancy transaction, other tenants/requests waiting on `FOR UPDATE` do not observe the temporary N+1.

## Concurrent same terminal

Winner completes insert+mark. Loser re-reads previous as `replaced` → `already_replaced`. Occupancy stays N.

## Classification

**A. True replacement with net occupancy unchanged** for provisioned previous.

Not redesigned as create-before-retire with `occupancyDelta: 1`.
