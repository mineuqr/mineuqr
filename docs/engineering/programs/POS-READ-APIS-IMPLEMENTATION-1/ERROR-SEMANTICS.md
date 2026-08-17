# ERROR SEMANTICS

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Reuse existing tRPC codes. Do not collapse errors. Do not expose SQL.

## Mapping (`mapPosReadError`)

| Condition | tRPC code | Message / notes |
|-----------|-----------|-----------------|
| not authenticated | UNAUTHORIZED | `protectedProcedure` / `verifiedProcedure` |
| Zod input (`restaurantId`, uuid `terminalId`, …) | BAD_REQUEST | tRPC validation |
| restaurant missing / wrong tenant / no POS scope | FORBIDDEN | `assertRestaurantPosScope` (`غير مصرح بالوصول`) |
| `pos_permission_denied` | FORBIDDEN | no `POS_ACCESS` (owner/admin included) |
| `terminal_not_found` / `terminal_foreign` / `terminal_inactive` | FORBIDDEN | same Arabic message (no terminal internals) |
| `entitlement_unavailable` | FORBIDDEN | capacity **read** failed closed; not G-06 occupancy mutation |
| order/timeline missing | NOT_FOUND | POS maps canonical `null` |
| other `PosReadError` | BAD_REQUEST | unexpected read-domain code |
| projection store failure | bubbled | `OrderSettlementProjectionUnavailableError` via existing settlement mapper if thrown from the read service |

G-06 occupancy **mutations** remain:

- limit exceeded → FORBIDDEN / `limit_exceeded`
- occupancy unavailable → INTERNAL_SERVER_ERROR / `commercial_capacity_unavailable`

POS **reads** do not perform occupancy mutations and must not invent a second occupancy error vocabulary.

## What is not returned

Database errors, grant table dumps, device secrets, passwords, recovery tokens.

## Distinction vs `order.read.*`

| | `order.read.*` | `pos.read.orders.*` |
|--|----------------|---------------------|
| Authz failure | owner/admin `assertRestaurantAccess` | POS scope + terminal + grant |
| Missing detail | `null` | NOT_FOUND |
