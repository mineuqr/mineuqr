# OBSERVABILITY

Existing tRPC middleware:

- `INTERNAL_SERVER_ERROR` → `trpc_runtime_failure` (error severity)  
- `FORBIDDEN` → logged only if `OPS_TRPC_DEBUG=1`

After this program, occupancy unavailable is **visible as unexpected runtime failure**; limit exceeded remains an expected business `FORBIDDEN`.

Client messages stay non-sensitive. `cause` remains server-side.
