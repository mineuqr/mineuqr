# TEST MATRIX

**Program:** POS-READ-APIS-IMPLEMENTATION-1

## Files

| File | Role |
|------|------|
| `server/pos/__tests__/posRead.orders.test.ts` | service + router auth/validation |
| `server/pos/__tests__/posRead.architecture.guards.test.ts` | architecture (not trivia) |
| `server/pos/__tests__/pos.architecture.guards.test.ts` | existing POS ownership still holds |

## Coverage vs program §35

| # | Requirement | Evidence |
|---|-------------|----------|
| 1 | authenticated success | listActive delegates; catalog DTO; settlement list |
| 2 | unauthenticated | router `UNAUTHORIZED` |
| 3 | unauthorized | owner/admin without grant; router missing grant `FORBIDDEN` |
| 4 | wrong tenant | staff A cannot read restaurant B |
| 5 | wrong restaurant | same as tenant (restaurant-scoped grants) |
| 6 | wrong device/screen | POS uses terminals: `terminal_foreign` / `terminal_inactive` (not operational device ids) |
| 7 | missing resource | `getDetail` → `PosReadError` `not_found` |
| 8 | invalid input | non-uuid terminal, `restaurantId: 0` → `BAD_REQUEST` |
| 9 | empty result | catalog `[]`; listActive empty items |
| 10 | pagination | `limit` + `cursor` forwarded to Order Read |
| 11 | filtering | `status` forwarded; `availableOnly` on catalog |
| 12 | ordering | inherited `createdAt` ASC in store (not reimplemented; guard + delegation) |
| 13 | DTO shape | catalog fields; no `imageUrl` |
| 14 | financial correctness | settlement pass-through; no POS money math; guards forbid `SUM(grandTotal)` |
| 15 | timezone / business day | no POS date-range API; `businessDay` remains projection field |

Concurrency: deactivated terminal after seed → `terminal_inactive` (mutable operational state vs read). Projection races remain owned by Order Read / Settlement programs.

Router happy-path is not integration-tested against Drizzle (no Production; no new test DB). Success is proven at the service boundary with injected canonical services.

## Architecture tests

- `pos.read` procedures are `.query` only
- no IdentityPlaceOrder / CheckService / settle / occupancy / reporting KPI / `db.execute` in POS read files
- delegates to `OrderReadWorkspaceService` / `OrderSettlementReadService` / `getMenuItemsByRestaurant`
- auth is Pos scope + terminal, not `assertRestaurantAccess` on the read router
- catalog DTO has no `imageUrl` / `toFixed`
