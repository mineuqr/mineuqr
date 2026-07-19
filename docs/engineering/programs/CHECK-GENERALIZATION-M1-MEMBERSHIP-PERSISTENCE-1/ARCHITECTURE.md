# CHECK-GENERALIZATION-M1 — Architecture (Persistence Foundation)

**Constitutional refs:** ADR-ARCH-020 · CHECK-GENERALIZATION-IMPLEMENTATION-DESIGN-1  

## Boundary (M1 only)

```
Session Order attach / Check ensure
        │
        ▼ (dual-write, best-effort)
Check-owned check_order_membership
        │
        ✗ NOT used for money in M1

Session order scan (getOrdersBySessionId)
        │
        ▼
Check.loadOrdersSubtotal → computeCheckMoney
        │
        ▼
SettlementTransaction (unchanged)
```

## Ownership

| Concept | Owner |
|---------|-------|
| Membership rows | Check aggregate boundary (persistence child) |
| Monetary SSOT | Check (via Session discovery until cutover) |
| Settlement | Check → SettlementTransaction |

Membership is **not** an aggregate root. Order and Session do not own it.

## Flags

| Flag | Default | Effect |
|------|---------|--------|
| `CHECK_MEMBERSHIP_DUAL_WRITE` | ON (unless `"false"`) | Gate membership writes |

No cutover / membership-read flag in M1.
