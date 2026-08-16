# FAIL-CLOSED

Occupancy helper still throws **before** `create` when:

- `decide` denies (limit exceeded)
- database handle missing (unavailable)

Mapper does not create resources. Tests prove `create` is not invoked on limit exceeded.

No unlimited fallback. No conversion of unavailable → `limit_exceeded`.
