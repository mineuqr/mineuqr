# SCALABILITY AUDIT

## Credible now

Tenant-scoped lock rows + domain COUNT scale with restaurants and POS terminals without a global bottleneck. Cross-tenant independence is the right model for multi-tenant SaaS.

## Contention

Only same `(scope, limitKey)` serializes. Menu category vs item on one restaurant proceed in parallel. Sales/check/settlement paths do **not** take this lock.

## Multiple app instances

Database `FOR UPDATE` is the coordination point. No sticky in-memory lock. Correct for multiple Node instances **once deployed**.

## Connection pools

Lock is held for COUNT + `checkLimit` (other connection) + INSERT. `checkLimit` lengthens lock duration (entitlement resolve). Acceptable at provisioning QPS; not for hot sale path (and it is not on the sale path).

## Must not introduce (still absent)

Global locks · memory locks · distributed locks · Live Plan serialization · occupancy counters as source of truth.

## Future branches / groups

When `branches` becomes a real quantity resource, add a scope + COUNT adapter. Do not overload `posTerminals` or `devices`.

## Premature complexity avoided

No reservation system. No second counter. That remains correct.
