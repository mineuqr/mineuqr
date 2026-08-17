# DTO CONTRACTS

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
No `any`. No database rows on the wire. Monetary values stay decimal strings.

## `pos.read.orders.*`

Reuse Order Read DTOs. POS does not define a second order DTO.

### `ActiveOrderListResult`

From `server/order/read/domain/contracts/queryContracts.ts`.

Includes `generatedAt`, projection versions, `items: ActiveOrderItemDto[]`, `pageInfo`.

`ActiveOrderItemDto` notable fields:

| Field | Type | Notes |
|-------|------|--------|
| `orderId` | number | persistence id (operational, not guest display) |
| `orderNumber` / `displayOrderNumber` / `displayReference` | string | identity as projected |
| `businessDay` | string \| null | restaurant business day, not UTC date prefix |
| `status` / `lifecycle` | string | operational lifecycle |
| `notes` | string \| null | order-level notes |
| `lineItems[].itemNotes` | string \| null | line notes |
| `lineItems[].modifiers` | readonly string[] | projected labels |
| `totalAmount` | string | operational order total **string**; not Reporting Revenue |

### Detail / timeline

Detail = read meta + `order` + `timeline`.  
Timeline = read meta + `orderId` + `events[]`.

POS `getDetail` / `getTimeline` throw NOT_FOUND instead of returning null so cashiers do not treat missing as empty success.

## `pos.read.orderSettlement.listByOrder`

`OrderSettlementDto` from `orderSettlementApiDtos.ts`.

Amounts: `allocatedAmount`, `settledAmount`, `outstandingAmount`, `orderTotalSnapshot` as **strings**.  
Flags: `isSettled`, `isComplimentary`, `isVoided`, `isRefunded`, `isCancelled`, `isPartiallySettled`.  
These are projected settlement facts, not selectable payment-method UI options.

## `pos.read.catalog.listItems`

`PosCatalogItemDto` (`server/pos/read/posCatalogDto.ts`):

| Field | Type | Nullable |
|-------|------|----------|
| `menuItemId` | number | no |
| `categoryId` | number | no |
| `nameAr` | string | no |
| `nameEn` | string \| null | yes |
| `price` | string | no |
| `isAvailable` | boolean | no |
| `sortOrder` | number | no |

Omitted: `imageUrl`, descriptions, calories, timestamps.

Price: if the menu row is already a decimal string, keep it. If a number appears, `String(price)` with **no** `toFixed` and no arithmetic.

## Input contracts

POS uses `z.number().int().positive()` (not `z.coerce`) for `restaurantId` / `orderId`, and `z.string().uuid()` for `terminalId`, per TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1 guidance (TDA-008 coerce → `unknown` inference).
