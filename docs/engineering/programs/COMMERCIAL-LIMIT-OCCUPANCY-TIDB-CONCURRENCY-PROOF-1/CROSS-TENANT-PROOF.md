# CROSS-TENANT PROOF

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** PASS (isolation only; does not certify same-tenant serialization)

## P6 / P16

Tenant A scope 970701 and tenant B 970702, each cap 2 occupancy 1. Concurrent create.

Observed: both succeeded. A=2 B=2. `CONNECTION_ID` distinct: 2858418190 and 2858418186. Elapsed 1566ms.

No cross-tenant occupancy mix in fixture COUNT by `scopeId`.

## P7 independent limit keys

Same scope 970703: concurrent `restaurants` and `categories` cap 1.

Observed: both succeeded. Two lock rows (`categories`, `restaurants`). Occupancy 1 each.

Independent `limitKey` values do not share one mutex. This does **not** repair the same-tenant same-key race.
