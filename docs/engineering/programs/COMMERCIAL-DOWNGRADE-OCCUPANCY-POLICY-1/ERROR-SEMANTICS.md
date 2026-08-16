# ERROR SEMANTICS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

G-06 preserved.

| Failure | Type | HTTP / tRPC |
|---------|------|-------------|
| New create / POS provision / POS reactivate exceeds new cap | `CommercialLimitExceededError` (`limit_exceeded`) | `FORBIDDEN` — quota/limit copy |
| Occupancy primitive cannot open a DB | `CommercialOccupancyUnavailableError` | `INTERNAL_SERVER_ERROR` — capacity unavailable |
| Entitlement `NONE` / not entitled | `checkLimit` deny → same exceeded mapper | `FORBIDDEN` (not “unauthorized”) |
| Limit key unsupported | deny | `FORBIDDEN` |
| Unreadable live plan | fail-closed `NONE` | deny, not unlimited |

Do not map limit exceeded to generic authorization (“unauthorized”).  
Do not map occupancy unavailable to `FORBIDDEN` / `limit_exceeded`.

TiDB/unit: exceeded → FORBIDDEN; unavailable → INTERNAL_SERVER_ERROR.
