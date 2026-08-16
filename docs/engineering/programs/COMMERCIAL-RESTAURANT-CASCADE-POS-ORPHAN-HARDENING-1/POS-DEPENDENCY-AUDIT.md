# POS DEPENDENCY AUDIT

| Table | Ownership | FK | Lifecycle | This program |
|-------|-----------|----|-----------|--------------|
| `pos_terminals` | Restaurant (`restaurantId`) | none | operational identity | **Delete** with restaurant |
| `pos_permission_grants` | Restaurant + user (`restaurantId`, `userId`). **Not** terminal-scoped | none | operational POS permission | **Delete** with restaurant (otherwise restaurant orphans) |
| `pos_sale_idempotency` | Restaurant + terminal + user + key | none | **Operational** Sale→Order map, not a ledger | **Delete** with restaurant |
| Check/Settlement initiate idempotency | In-memory stores only | n/a | process-local | No SQL rows |
| `commercial_limit_occupancy_locks` | Commercial mutex `(scopeKind, scopeId, limitKey)` | none | serialization token, **not occupancy** | **Retain**. Not counted. Restaurant IDs are not reused. |

## pos_sale_idempotency decision

**C / restaurant-owned operational state — delete.**

Not a financial audit table. Canonical orders are already hard-deleted by this same cascade. Keeping the map would leave `restaurantId` / `terminalId` / `orderId` pointing at destroyed resources. It is not retained as history.

## Grants

Not made orphan by terminal delete alone (no `terminalId`). Made orphan by **restaurant** delete. Cleanup is required.
