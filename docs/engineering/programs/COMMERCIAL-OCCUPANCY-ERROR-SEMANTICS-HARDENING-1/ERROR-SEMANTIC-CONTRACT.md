# ERROR SEMANTIC CONTRACT

| Identity | Meaning | Internal | Client-safe code |
|----------|---------|----------|------------------|
| **A. LIMIT EXCEEDED** | Capacity was evaluated; the request is not permitted | `COMMERCIAL_LIMIT_EXCEEDED` / `limit_exceeded` | `limit_exceeded` |
| **B. OCCUPANCY UNAVAILABLE** | Capacity could not be established safely | `COMMERCIAL_OCCUPANCY_UNAVAILABLE` / `commercial_occupancy_unavailable` | `commercial_capacity_unavailable` (G-04) |

B is **not** A. B is **not** authentication, authorization, validation, or duplicate/conflict.

`not_entitled` remains a **business** denial (`CommercialLimitExceededError` / `FORBIDDEN`), not occupancy unavailable.
