# OPERABILITY AUDIT

## Distinguishable failures (code level)

| Condition | Type | Code |
|-----------|------|------|
| Cap exceeded / not entitled / unsupported key | Business | `CommercialLimitExceededError` (`COMMERCIAL_LIMIT_EXCEEDED` + `reasonCode`) |
| No DB handle | Infra | `CommercialOccupancyUnavailableError` |
| Deadlock / lock wait after retries | Infra | raw MySQL error |
| Domain insert failure | Domain | original error |

## What operators see over tRPC

**Restaurants/categories/items:** exceed → `FORBIDDEN` with Arabic quota text (business). Unavailable → `FORBIDDEN` **“غير مصرح بالوصول”** (same as auth). Deadlock → likely **500**.

**POS:** `PosEntitlementDeniedError` (including `limit_exceeded` and `occupancy_unavailable`) → `FORBIDDEN` **“غير مصرح بالوصول”**. Business limit and auth and occupancy-unavailable are **indistinguishable** in the client message.

## Gap

Operators cannot reliably tell BUSINESS LIMIT REJECTION from AUTHORIZATION from INFRASTRUCTURE without logs/`cause`. **B. REQUIRED FOUNDATION** for error mapping — not an occupancy math bug.

No occupancy-specific metrics/traces. **D** until after deploy, unless incident response needs it sooner (**B** for structured `reasonCode` in API).
