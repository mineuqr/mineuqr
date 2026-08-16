# TRPC / API MAPPING

MineuQR maps unexpected infrastructure failures to tRPC `INTERNAL_SERVER_ERROR` (`server/_core/trpc.ts` runtime diagnostics). Occupancy unavailable uses that convention.

| Condition | tRPC `data.code` | HTTP (tRPC) | Message class |
|-----------|------------------|-------------|---------------|
| Limit exceeded | `FORBIDDEN` | 403 | Quota Arabic (`خطتك الحالية…`) |
| Occupancy unavailable | `INTERNAL_SERVER_ERROR` | 500 | Capacity-unavailable Arabic, **not** `غير مصرح بالوصول` |
| Auth / tenant deny | `FORBIDDEN` | 403 | `غير مصرح بالوصول` |
| Unauthenticated | `UNAUTHORIZED` | 401 | existing |
| Validation | `BAD_REQUEST` | 400 | existing |
| Duplicate | `CONFLICT` | 409 | existing |

**G-04 register (Express, not tRPC):** unchanged — 403 + JSON `code: limit_exceeded` vs 403 + `code: commercial_capacity_unavailable`. Distinct from generic 500 onboarding failure. Do not regress.
