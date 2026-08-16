# OCCUPANCY INVARIANT

```
provisioned COUNT ≤ checkLimit(posTerminals).cap
```

Provisioned = `registered` ∪ `active`.

## occupancyDelta decision

| Previous lifecycle | Delta | Reason |
|--------------------|------:|--------|
| registered / active | **0** | Net occupancy unchanged |
| deactivated | **1** | Replacement becomes provisioned; previous did not count |
| replaced | n/a | rejected before helper |

If lifecycle changes between the pre-lock read and the locked re-read (e.g. deactivate), replace throws `lifecycle_conflict` (fail closed). Client may retry. Does not apply the wrong delta.

## Invariant proven (isolated MySQL 8)

Cap 1, occupancy 1, concurrent replace of the same row → one winner, occupancy **1**.  
Cap 2, two concurrent replaces of two provisioned rows → occupancy **2**.
