# FORENSIC AUDIT

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1 (G-09)  

## Administrative creation paths

| Path | Caller | Authz | Tenant | Resource | Limit key | Before G-09 | Occupancy helper | Parent lock | Persist |
|------|--------|-------|--------|----------|-----------|-------------|-----------------|-------------|--------|
| `restaurant.create` | owner or admin | verified + admin owner resolve | target `ownerUserId` | restaurants | `restaurants` | **enforced** | yes | n/a (parent) | occupancy txn |
| `category.create` owner | owner | `assertRestaurantAccess` + `menuManagement` | restaurant | categories | `categories` | enforced | yes | yes (COUNT) | occupancy txn |
| `category.create` admin | `role=admin` | same + admin tenant bypass in access | restaurant | categories | `categories` | **bypassed** `createCategory` | **no** | yes (db.ts RC txn only) | separate txn |
| `menuItem.create` owner | owner | access + `menuManagement` + category same restaurant | restaurant | items | `items` | enforced | yes | yes | occupancy txn |
| `menuItem.create` admin | `role=admin` | same | restaurant | items | `items` | **bypassed** `createMenuItem` | **no** | yes (db.ts) | separate txn |
| POS `terminal.register` / activate / replace | any caller with restaurant POS access | `assertRestaurantAccess` + POS service | restaurant | posTerminals | `posTerminals` | **enforced** (no role skip) | yes | yes | occupancy txn |
| Onboarding `registerOwnerTransactional` | new owner | register | new user | restaurants | `restaurants` | bootstrap, no helper | **no** | n/a | register txn |
| `db.createCategory` / `createMenuItem` | residual | none | caller-supplied | categories/items | those keys | unlocked fallback / tests | only via helper `create(null)` | yes if called directly | own RC txn |
| Bulk category/item | — | — | — | — | — | **none found** | — | — | — |
| Import/clone/jobs | — | — | — | — | — | **none found** | — | — | — |

Admin restaurant create already used the **target owner’s** `checkLimit`. Admin category/item did not. That inconsistency is the G-09 gap.

## Error mapping (before)

Owner path: `mapOccupancyError` → G-06 FORBIDDEN / INTERNAL_SERVER_ERROR / NOT_FOUND (gone).  
Admin path: only `RestaurantGoneError` → NOT_FOUND. At-cap admin inserts succeeded.

## Idempotency / outbox

Category/item creates have no catalog idempotency key (G-12 deferred). No in-txn outbox.

## After G-09

Admin category/item persist **only** through the shared occupancy helpers. Router no longer branches on `role !== "admin"` for quantity.
