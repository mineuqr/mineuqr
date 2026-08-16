# COMMERCIAL INVARIANT

For every tenant:

```
restaurant occupancy ≤ effective Commercial restaurants cap
```

Unlimited cap (`null` with the `restaurants` key present) permits any occupancy.

## First-restaurant onboarding

New owner occupancy is 0. Creating the first restaurant requires proposedTotal **1** to be allowed:

| Effective cap | Result |
|---------------|--------|
| integer ≥ 1 | allow |
| `null` (key present = unlimited) | allow |
| `0` | fail closed (`limit_exceeded`) |
| missing key | fail closed (`limit_unavailable`) |
| invalid (negative, non-integer, NaN) | fail closed (`limit_unavailable`) |
| trial plan unresolved / unreadable | fail closed (`CommercialOccupancyUnavailableError`) |

Do **not** treat a missing key as unlimited. Do **not** default missing to `1` (the adoption display fallback `?? 1` is not this path).

## Answers recorded before implementation

1. First restaurant **is** a Commercial resource create.  
2. It **is** counted toward `restaurants`.  
3. Skipping occupancy was **intentional bootstrap**.  
4. It **is** a bootstrap exception (0→1 with trial bind).  
5. It was **only safe** while Trial/Professional cap ≥ 1.  
6. That assumption lived in **seed + audit docs**, not runtime.  
7. **Yes** — `saveLive` can set Professional `restaurants` to 0.  
8. **Yes** — Live Plan validation allows non-negative integers including 0.  
9. **Yes** — an existing subscription can resolve to cap 0 after a catalog change (over-cap existing tenants are G-11, not this program).  
10. Unavailable capacity now **fails closed**; no restaurant is created.
