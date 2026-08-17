# API INVENTORY

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Also satisfies program §3 `POS-READ-API-INVENTORY.md`.

Every proposed API has a reason to exist. Existing canonical reads are reused, not duplicated.

## Decision legend

| Decision | Meaning |
|----------|---------|
| IMPLEMENT | New POS façade; delegates to an existing owner |
| REUSE | Existing procedure already serves the consumer; do not wrap |
| DO NOT IMPLEMENT | Would duplicate SSOT, invent a query, or steal a channel |

---

## Implemented (POS façade)

### `pos.read.orders.listActive`

| Field | Value |
|-------|--------|
| PURPOSE | Active operational orders for a POS terminal (Q-01) |
| CONSUMER | Future POS cashier UI (Phase E deferred — no POS client yet) |
| AUTHORIZATION | `verifiedProcedure` → `assertRestaurantPosScope` → `resolvePosTerminalAccess` (`POS_ACCESS` + active terminal) |
| TENANT SCOPE | `decision.context.restaurantId` after terminal belongs to restaurant |
| SOURCE OF TRUTH | Order Read Platform P-02 (`order_read_orders` + line items) |
| READ MODEL | `OrderReadWorkspaceService.listActive` |
| DTO | `ActiveOrderListResult` (canonical; not a POS copy) |
| FILTERS | `status` pending/preparing/ready/all-active; applied in Order Read store |
| PAGINATION | `limit` 1…100 (canonical clamp); `cursor` accepted and forwarded; **store currently ignores cursor** (inherited Q-01 limitation) |
| CACHE | No POS cache. Future client should reuse Orders Workspace invalidation keys only after a POS consumer exists |
| REALTIME | Not this API. Canonical: Realtime Platform `orders` channel → invalidate Order Read queries |
| ERRORS | UNAUTHORIZED / FORBIDDEN (`pos_permission_denied`, `terminal_*`, restaurant scope) / BAD_REQUEST |
| TESTS | `posRead.orders.test.ts` |

**Why it exists:** cashiers with `POS_ACCESS` cannot call `order.read.listActive`. Same projection, different auth.

### `pos.read.orders.getDetail`

| Field | Value |
|-------|--------|
| PURPOSE | Single-order operational detail + timeline (Q-03) |
| CONSUMER | Future POS cashier UI |
| AUTHORIZATION | Same POS read context |
| TENANT SCOPE | `restaurantId` + `orderId` both applied in `DrizzleOrderOperationalReadStore.getOrderDetail` |
| SOURCE OF TRUTH | P-03 / P-04 via Order Read |
| READ MODEL | `OrderReadWorkspaceService.getDetail` |
| DTO | Canonical detail (`order` + `timeline` + read meta) |
| FILTERS | identity only |
| PAGINATION | n/a |
| CACHE | none (POS) |
| REALTIME | none (POS) |
| ERRORS | plus NOT_FOUND when projection missing (POS maps null → `not_found`; owner `order.read.getDetail` currently returns null) |
| TESTS | missing resource |

### `pos.read.orders.getTimeline`

| Field | Value |
|-------|--------|
| PURPOSE | Order timeline events (Q-04) |
| SOURCE OF TRUTH | `order_read_order_timeline` |
| READ MODEL | `OrderReadWorkspaceService.getTimeline` |
| DTO | `OrderTimelineResult` |
| ERRORS | NOT_FOUND when missing |

### `pos.read.orderSettlement.listByOrder`

| Field | Value |
|-------|--------|
| PURPOSE | Per-order settlement projection for POS (not Revenue) |
| CONSUMER | Future POS cashier UI needing settlement *state*, not KPI math |
| AUTHORIZATION | Same POS read context |
| TENANT SCOPE | `OrderSettlementReadService.listByOrder({ restaurantId, orderId })` |
| SOURCE OF TRUTH | Order Settlement Projection (ADR-ARCH-022). Check remains financial aggregate root |
| READ MODEL | `OrderSettlementReadService` |
| DTO | `OrderSettlementDto` (canonical amounts as strings) |
| FILTERS | orderId after restaurant list (inherited store behavior) |
| PAGINATION | none (per-order; small) |
| CACHE | none |
| REALTIME | none — settlement events remain Check/Settlement owned |
| ERRORS | POS auth errors; projection unavailable bubbles from canonical mapper |
| TESTS | delegation + auth |

**Why it exists:** `orderSettlement.listByOrder` is owner/admin only. POS must not compute settlement from Order rows.

**Not wrapped:** `listByCheck`, `listByRestaurant`, `getSummaryByCheck` — restaurant-wide dumps belong on the owner settlement API, not POS.

### `pos.read.catalog.listItems`

| Field | Value |
|-------|--------|
| PURPOSE | Tenant-gated sale catalog for POS (names, decimal price, availability) |
| CONSUMER | Future POS sale UI |
| AUTHORIZATION | Same POS read context |
| TENANT SCOPE | `getMenuItemsByRestaurant(context.restaurantId)` plus defensive `row.restaurantId` filter |
| SOURCE OF TRUTH | Restaurant Menu (`menu_items`) via existing `getMenuItemsByRestaurant` |
| READ MODEL | `PosCatalogReadService` (adapter only; Menu remains owner) |
| DTO | `PosCatalogItemDto` — no `imageUrl`, no descriptions |
| FILTERS | optional `availableOnly` |
| PAGINATION | hard cap `POS_CATALOG_MAX_ITEMS = 500` (no cursor; menu lists are bounded by commercial item limits) |
| CACHE | none |
| REALTIME | none |
| ERRORS | POS auth + BAD_REQUEST |
| TESTS | DTO shape, cross-restaurant row drop, availableOnly, empty |

**Why it exists:** public `menuItem.listByRestaurant` is unauthenticated. POS needs terminal + grant. This is a mapping, not a second menu schema.

---

## Reused (do not wrap)

| API | Owner | Why not a POS duplicate |
|-----|--------|-------------------------|
| `order.read.listActive\|getDetail\|getTimeline` | Order Read | Owner/admin Orders Workspace already consumes these |
| `orderSettlement.*` | Order Settlement read | Owner/admin financial ops |
| `reporting.*` | Reporting Platform | Revenue / tax / payment analytics / average check |
| `pos.entitlement.get` | POS Terminal | Already exists; owner/admin |
| `pos.terminal.list` | POS Terminal | Already exists |
| `pos.access.*` | POS Access | Grant management, not operational reads |
| `pos.registerShift.context` | POS façade over CRMP | Already POS-authorized register/shift *context* |
| `operationalDevice.runtime.getKitchenQueue` | Kitchen Read + Device | Kitchen/Expo screens; device token, not cashier POS |
| waiter/kiosk/table workspace reads | Waiter / Kiosk / Table | Channel-owned; flattening would drop channel identity |
| `menuItem.listByRestaurant` | Menu (public) | Guest/kiosk browse; not POS auth |

---

## Intentionally not implemented

| Candidate | Reason |
|-----------|--------|
| `pos.read.orders.listHistory` (Q-02) | Query catalog type-only; no canonical tRPC yet. Inventing it here would create a POS-owned history API |
| `pos.read.kpis` / Q-05 | Operational KPIs are Order Read catalog, not POS. No tRPC today |
| `pos.read.revenue` / tax / payment-method analytics | Reporting owns `SUM(Paid Check grandTotal)`. Duplicating would violate financial SSOT |
| `pos.read.check.*` | Check remains financial aggregate; POS already has write intake. No certified POS Check *read* requirement that is not settlement projection |
| `pos.read.paymentMethods` as selectable UI | Stored monetary methods ≠ selectable UI set. Do not invent UI semantics |
| `pos.read.taxPolicy` | Historical tax lives on Check snapshot. Current restaurant settings are not historical truth |
| `pos.read.registerShift` alias | Use existing `pos.registerShift.context` |
| Kitchen / Expo / Pickup / Customer / Print Monitor reads | Device Management + screen runtime |
| Waiter floor / table workspace / kiosk cart | Channel platforms |
| Q-06/Q-07 analytics | Reporting / Order analytics — not POS |

No schema change. No migration.
