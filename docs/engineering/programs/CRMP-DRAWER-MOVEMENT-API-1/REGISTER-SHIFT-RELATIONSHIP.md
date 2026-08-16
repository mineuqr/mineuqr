# REGISTER / SHIFT RELATIONSHIP

Canonical relationship (already certified):

```
Restaurant
  └── CashRegister (Duty / catalog — no cash)
        └── at most one active Financial Shift
              └── Drawer (1:1, drawerId unique)
                    ├── movements (opening_float + paid_in/out/safe_drop/adjustment)
                    └── counts (interim / final)
```

- Open Register is resolved by `resolveActiveRegister` / explicit `registerId` in restaurant scope.
- Active Financial Shift is `findActiveByRegister` for statuses `open | suspended | closing | handover_pending`.
- **Cash belongs to the Financial Shift**, not the Register.
- Operator on shift: `operatorUserId` at open. Movement actor: `actorUserId` per movement. These may diverge.
- OCC: `FinancialShift.version`.
- Closing uses `recordCount(final)` then domain close. Expected cash is computed from movements + attributions + float.
- Multiple historical shifts per Register; at most one active.
- Concurrent operators: one assigned Duty operator; movements still require shift `status === "open"`.
- Cross-register blocked because `findById(restaurantId, id)` is tenant-keyed and shift `registerId` is compared to the resolved Register.

## Drawer movement prerequisite (derived, not invented)

Domain already requires `shiftIsMutable` → **status === "open"**.

Therefore a public movement requires:

1. Register exists in the restaurant.
2. Active Financial Shift on that Register.
3. That Shift is `open` (not suspended/closing/closed).

Client `financialShiftId` is a hint. Server resolves the active shift. Mismatch fails closed.
