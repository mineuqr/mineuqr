# TENANT ISOLATION

Chain:

```
User â†’ POS Access â†’ Restaurant â†’ Terminal â†’ Persistence
```

Client `restaurantId` is a routing input. Authorization uses `assertRestaurantPosScope` and `PosAccessContext.restaurantId` / `terminalId` / `userId`. Persistence keys for sale idempotency are taken from that context, not from forged cashier or terminal ownership fields.

## Proven isolations

- Terminal list/get-by-code: restaurant predicate
- Terminal `requireOwned`: foreign restaurant â†’ not found
- Grants: restaurant + user; Restaurant B grants do not satisfy Restaurant A
- Sale idempotency: restaurant + terminal + user + key; cross-restaurant/terminal/user lookup returns null

The persistence layer does not grant access. A raw store `getById` is not an API. Routers keep `verifiedProcedure` + restaurant/POS scope.
