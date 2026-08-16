# API / ERROR SEMANTICS AUDIT

## Owner restaurant/category/item (occupancy helper)

| Event | HTTP/tRPC | Message |
|-------|-----------|---------|
| Limit exceeded | FORBIDDEN | Arabic plan quota (`خطتك الحالية…`) |
| Occupancy unavailable | FORBIDDEN | `غير مصرح بالوصول` (auth-shaped) |
| Missing restaurant on category/item | FORBIDDEN | `غير مصرح بالوصول` |

Business limit is **not** a 500. It **is** the same tRPC code as authorization (`FORBIDDEN`).

## POS

Limit exceeded and occupancy unavailable both collapse to `FORBIDDEN` / `غير مصرح بالوصول`. `reasonCode` exists on the Error `cause` only.

## Fail closed

Missing DB → deny create. Missing `posTerminals` on non-admin plan → cap 0. `plan === "NONE"` → not_entitled. Missing unknown limit key → deny. **PASS** for fail-closed math.

## Authorization interaction

Occupancy runs **after** restaurant access. Limit deny is not used as a tenant-hop. Mapping occupancy-unavailable to the **same string** as tenant deny is an operability/API issue, not a tenant leak.

## Recommendation (do not implement here)

Preserve FORBIDDEN for true auth. Use a distinct client-visible code for `limit_exceeded` vs `occupancy_unavailable` vs `not_entitled`.
