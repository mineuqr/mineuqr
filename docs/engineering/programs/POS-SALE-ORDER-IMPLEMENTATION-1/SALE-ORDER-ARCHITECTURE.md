# SALE → ORDER ARCHITECTURE

```
Authenticated cashier
  → verifiedProcedure
  → PosSaleService
       → assertRestaurantPosScope
       → resolvePosTerminalAccess(SALE_CREATE)
       → require POS_ACCESS + SALE_CREATE
       → validate sale command
       → optional same-restaurant session check (not attached)
       → idempotency exclusive key
       → IdentityPlaceOrder
            → PlaceOrderService
            → canonical Order (channel cashier_pos)
  → canonical Order result
```

POS Sale is a command, not an aggregate.

POS owns: access context, terminal context, operation authorization, command boundary, sale idempotency map.

Order owns: identity, lines, quantities, modifiers, notes, lifecycle, status, persistence, pricing, business identity sequence.
