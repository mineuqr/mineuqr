# CASHIER / TERMINAL ATTRIBUTION

## Cashier

Derived from `ctx.user.id` via `PosAccessContext.userId`.

Not persisted as `posCashierId`. `orders` has no cashier column; adding one would be an Order redesign and was rejected.

Attribution uses existing `opsLog` (`pos_sale_created.actorId`) plus the authenticated user on the command.

Client `cashierId` / `userId` are ignored.

## Terminal

Canonical POS Terminal UUID from `PosAccessContext.terminalId`.

Stamped on the Order through existing fulfilment fields:

- `fulfilmentAnchor.stationId` = terminal id
- `fulfilmentLabel` = terminal id

Not a device id, screen id, browser id, or client-generated terminal id.

Historical retry returns the original terminal id. No rewrite API.
