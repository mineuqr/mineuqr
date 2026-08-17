# READ OWNERSHIP MATRIX

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
POS is a **consumer façade**. It does not own Order, Check, Settlement, Register, Reporting, Menu, Kitchen, or Device.

| Capability | Canonical owner | Canonical read surface | POS role | POS procedure |
|------------|-----------------|------------------------|----------|---------------|
| Order lifecycle | Order Domain | write commands | none (sale already wraps place-order) | — |
| Active orders / detail / timeline | Order Read Platform | `order.read.*` + `OrderReadWorkspaceService` | terminal-authorized delegate | `pos.read.orders.*` |
| Order history (Q-02) | Order Read (type-only) | none | **not implemented** | — |
| Order notes / modifiers | Order Read line projection | fields on `ActiveOrderLineItemDto` | pass-through | via order detail/list |
| Business day / display number | Order business identity | `businessDay` on P-02 | pass-through | via order DTOs |
| Check (financial aggregate) | Check | Check APIs / `ensureCheckForOrder` | write intake already exists; **no POS Check read** | — |
| Order settlement state | Order Settlement Platform | `orderSettlement.*` + projection store | terminal-authorized `listByOrder` only | `pos.read.orderSettlement.listByOrder` |
| Settlement Record / payment methods stored | Financial Settlement / Check | settlement record reads | **not implemented** | — |
| Revenue / tax totals / average check | Reporting | `reporting.*` KPI registry | **not implemented** | — |
| Menu catalog | Restaurant Menu | `getMenuItemsByRestaurant` | DTO mapping + POS auth | `pos.read.catalog.listItems` |
| Register / shift context | CRMP | `pos.registerShift.context` | **reuse existing** | — |
| Kitchen queue | Kitchen Read | `operationalDevice.runtime.getKitchenQueue` | **not POS** | — |
| Waiter / table / kiosk | Waiter / Table / Kiosk platforms | channel routers + device runtime | **not POS** | — |
| Device / screen identity | Device Management | device session + screen runtime | **not POS** (POS uses `pos_terminals`) | — |
| Commercial occupancy | Commercial Occupancy | `checkLimit` COUNT | **read of entitlement via existing PosAccessService only**; no occupancy mutation | — |

## Field provenance (POS-returned data)

### Order list/detail/timeline

| FIELD | SOURCE | OWNER | TRANSFORMATION |
|-------|--------|-------|----------------|
| `items[]` / `order` | `order_read_orders` + `order_read_order_line_items` | Order Read | `mapActiveOrderItemDto` (existing) |
| `lineItems.itemNotes` / `modifiers` | projected line rows | Order Read | none in POS |
| `businessDay` | projected identity | Order business identity | none in POS |
| `totalAmount` | projection decimal string | Order Read (operational total, **not Revenue**) | none in POS |
| `pageInfo` | `OrderReadWorkspaceService` | Order Read | POS forwards `limit`/`cursor` |
| timeline events | `order_read_order_timeline` | Order Read | none in POS |

POS does not join Session + Check + Order. Clients must not reconstruct Revenue from `totalAmount`.

### Order settlement

| FIELD | SOURCE | OWNER | TRANSFORMATION |
|-------|--------|-------|----------------|
| `settlementStatus`, flags, amount strings | Order Settlement Projection | Settlement platform | `toOrderSettlementDto` (existing) |

POS does not sum amounts or derive Revenue.

### Catalog

| FIELD | SOURCE | OWNER | TRANSFORMATION |
|-------|--------|-------|----------------|
| `menuItemId` | `menu_items.id` | Menu | rename `id` → `menuItemId` |
| `categoryId`, names, `isAvailable`, `sortOrder` | `menu_items` | Menu | copy |
| `price` | `menu_items.price` decimal | Menu | keep decimal **string**; stringify only if a number appears; **no arithmetic** |
| `imageUrl` / descriptions | `menu_items` | Menu | **omitted** (minimization) |
