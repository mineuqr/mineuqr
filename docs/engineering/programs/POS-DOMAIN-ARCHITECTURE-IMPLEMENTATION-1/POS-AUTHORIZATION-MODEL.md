# POS AUTHORIZATION MODEL

## Rules

- Authenticated user ≠ authorized cashier
- Restaurant owner ≠ cashier permission
- `order.settlePaid` (public tracking token) ≠ POS authorization
- Restaurant access ≠ `POS_ACCESS`

## Phase 1 contract

```
restaurant (assertRestaurantAccess)
  + terminal (owned, lifecycle active)
  + user
  + explicit POS permission grant
```

The context is server-authoritative (`PosAccessService.authorize`).

## Permission namespace

`POS_ACCESS`, `SALE_CREATE`, `SALE_VOID`, `CHECK_DISCOUNT`, `REFUND_CREATE`, `REFUND_APPROVE`, `SHIFT_OPEN`, `SHIFT_CLOSE`, `REGISTER_ADJUST`, `TERMINAL_MANAGE`

Phase 1 does not implement the financial operations. It establishes the catalog and deny-by-default grant list.

## Tenant gate vs cashier grant

POS management APIs still call `assertRestaurantAccess` (owner or `users.role` admin). That is restaurant tenancy, not cashier authorization. Owner/admin can manage terminals; they still need an explicit grant to be treated as a cashier.

Staff cashiers who are not owners are a follow-up for `POS-TERMINAL-ACCESS-IMPLEMENTATION-1`.
