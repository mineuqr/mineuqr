# API DESIGN

Router: `pos` on `appRouter`.

```
verifiedProcedure
  → assertRestaurantAccess
  → POS service
  → commercial / restaurant authorities
```

## Procedures

| Path | Purpose |
|------|---------|
| `pos.entitlement.get` | Effective POS Entitlement |
| `pos.terminal.list` | Restaurant terminals |
| `pos.terminal.register` | Create / idempotent same-code return |
| `pos.terminal.activate` | `registered`/`deactivated` → `active` |
| `pos.terminal.deactivate` | → `deactivated` |
| `pos.terminal.replace` | Preserve historical id; new replacement |
| `pos.access.authorize` | Restaurant + terminal + user + permission |

## Not exposed

POS payment, settlement, refund, direct-sale, Register, Shift, ZATCA, offline sync.

Client cannot send entitlement quantity or override restaurant ownership. `restaurantId` is re-validated server-side.
