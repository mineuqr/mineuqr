# DOMAIN OWNERSHIP MATRIX

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

Classes:

- **A** — Parent-delete race existed and is fixed in this program.
- **B** — Parent-delete race already prevented (or prevented by the A fix on the same txn).
- **C** — Intentionally independent of restaurant lifecycle.
- **D** — Same primitive applies; separate architecture decision / not expanded here.

| Resource | Authority | Create path | Class | Notes |
|----------|-----------|-------------|-------|-------|
| Restaurant | Restaurant / occupancy (`restaurants` key) | `createRestaurantWithCommercialLimit` | C | Parent row; no parent-delete vs self-create |
| Category (owner) | Restaurant ownership + Commercial capacity | `createCategoryWithCommercialLimit` | **A** | Lock inside occupancy `countOccupancy` |
| Category (admin skip) | Restaurant ownership; occupancy skipped (G-09) | `createCategory` RC txn | **A** | Same parent lock; G-09 policy unchanged |
| Item (owner) | Restaurant ownership + Commercial capacity | `createMenuItemWithCommercialLimit` | **A** | Same as category |
| Item (admin skip) | Restaurant ownership; occupancy skipped (G-09) | `createMenuItem` RC txn | **A** | Same parent lock |
| POS terminal provision | POS + Commercial `posTerminals` | `PosTerminalService.consumeProvisionedSlot` | **A** | Lock then COUNT provisioned |
| POS terminal replace | POS + occupancyDelta 0 | same `consumeProvisionedSlot` | **A** | Lock then replace in occupancy txn |
| Order create | Order persist | `DrizzleOrderRepository.insertTransactional` | **A** | Lock before `tx.insert(orders)` |
| Restaurant delete | Restaurant cascade | `deleteRestaurantCascadeTx` | **A** | Lock first, then existing child order |
| User delete | User cascade | `deleteUserCascade` → per restaurant | **B** | Uses the same `deleteRestaurantCascadeTx` |
| POS permission grants | POS | `DrizzlePosPermissionGrantStore` | **D** | Cascade-deleted; insert not parent-locked |
| POS sale idempotency | POS | `DrizzlePosSaleIdempotencyStore` | **D** | Cascade-deleted; insert not parent-locked |
| Offers | Restaurant catalog | `createOffer` | **D** | Not quantity-governed; not G-08 confirmed case |
| Tables | Restaurant | `createTable` / `createMultipleTables` | **D** | Same |
| Holidays | Restaurant | `createHoliday` | **D** | Same |
| Checks / settlement / CRMP | Order/Check/Settlement | existing authorities | **D** | Do not move into Restaurant lock without a dedicated program |
| Operational devices / screens | Devices entitlement | not restaurant-row children on stagIn | **C/D** | No `operational_devices` table; not occupancy |
| Occupancy mutex row | Commercial | 0094 | **C** | Capacity serialization only |
| Users / subscriptions | Account | user cascade | **C** | Owner-scoped, not restaurant-child create |

## Ownership rule (honored)

| Question | Owner |
|----------|-------|
| Is there capacity? | Commercial (`checkLimit` + COUNT) |
| Does this restaurant still exist? | Restaurant-row lock |
| Is this POS operation valid? | POS |
| Is this order valid? | Order / Check / Settlement |

Commercial occupancy helper contains **no** restaurant lifecycle calls. Cascade contains **no** occupancy helper calls.
