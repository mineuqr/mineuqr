# CASHIER AUTHORIZATION FORENSICS

## Actual model

```
users.role ∈ { user, admin }
restaurants.userId = owner
assertRestaurantAccess(ctx, restaurantId)
  → owner or platform admin
```

Evidence: `drizzle/schema.ts` (`users.role`), `server/restaurantAccess.ts`.

There is **no** `permissions` table, **no** role-assignment table, **no** staff-membership table, **no** permission catalog in runtime code.
`docs/engineering/programs/RBAC-PLATFORM-ARCHITECTURE-1/` is architecture-only. Suggested ADR-ARCH-034 for RBAC was **not** published; ADR-ARCH-034 in the Registry is Commercial Catalog Authority.

## What this can support today

| Future POS permission | Today |
|-----------------------|--------|
| SALE_CREATE | Owner/admin restaurant access only |
| SALE_VOID / REFUND_* | Check/Refund services + restaurant/admin; not permission keys |
| SHIFT_OPEN / CLOSE / REGISTER_ADJUST | CRMP operations + restaurant access |
| Fine-grained cashier vs manager | **Not implemented** |

Cashier User = `users` row acting in a restaurant. Terminal ≠ user. No code currently assigns a user to a POS Terminal.

## Conclusion

**EXTEND** (not a new authorization platform, not full RBAC replacement).

Phase 1 should:

- Reuse `assertRestaurantAccess` + subscription/FROZEN + POS entitlement + terminal state
- Define a **POS permission catalog** (constants / contract) for later RBAC adoption (AP-15/AP-16)
- **Not** implement SALE_VOID etc.
- **Not** create a competing RBAC schema unless a dedicated RBAC foundation program ships

Owner grant / FULL_PLATFORM remains the existing commercial hub — do not add `if owner` inside POS procedures.
