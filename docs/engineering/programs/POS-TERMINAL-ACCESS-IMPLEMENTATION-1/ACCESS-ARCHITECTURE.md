# ACCESS ARCHITECTURE

```
verifiedProcedure (existing auth)
  → assertRestaurantPosScope (POS-owned; does not replace assertRestaurantAccess)
  → resolvePosTerminalAccess
       → terminal exists
       → terminal.restaurantId === restaurant scope
       → lifecycle === active
       → Effective POS Entitlement.available
       → explicit required POS permission
       → PosAccessContext
```

Terminal **management** (register / activate / deactivate / replace / grant / revoke) still uses `assertRestaurantAccess` (owner/admin).

Terminal **use** uses `assertRestaurantPosScope` + `resolvePosTerminalAccess`.

Provisioning (`checkLimit` for a new slot) remains separate from access (`entitlement.available` for an existing active terminal).
