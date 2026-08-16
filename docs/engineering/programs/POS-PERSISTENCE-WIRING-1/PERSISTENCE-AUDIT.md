# PERSISTENCE AUDIT

Read-only forensic audit completed before implementation. Schema is compatible. No 0094 required.

## Verified surfaces

| Surface | Finding |
|---------|---------|
| `PosTerminalStore` | Interface already exists: list/get/insert/updateLifecycle |
| `PosPermissionGrantStore` | Interface already exists: list/has/upsert/remove |
| `PosSaleIdempotencyStore` | Interface already exists: get/put/runExclusive |
| InMemory implementations | Present and used by unit tests via constructor injection |
| `posComposition.ts` | **Production defect:** defaulted to InMemory for all three stores |
| POS services | Depend on store interfaces â€” no generic repository needed |
| POS router | Uses `getPos*Service()` from composition |
| Access / entitlement / sale | Unchanged contracts; restaurant scope is server-derived |
| Drizzle schema | `posTerminals`, `posPermissionGrants`, `posSaleIdempotency` match domain fields |
| Migrations 0091 / 0092 / 0093 | Already applied to Production |
| `getDb()` | Canonical MineuQR access; null when `DATABASE_URL` absent |
| Transactions | No POS-specific transaction helper exists; Order create is a separate domain call |
| OCC | Terminal `version` already on table; grant `version` unused by contract |
| Idempotency uniqueness | Unique `(restaurantId, terminalId, userId, idempotencyKey)` |
| Tenant patterns | Restaurant-scoped queries; services compare `terminal.restaurantId` |

## Schema compatibility

- Terminal: PK `id`, unique `(restaurantId, code)`, lifecycle enum, replacement, optional device, version, timestamps
- Grants: PK `id` (store-internal), unique `(restaurantId, userId, permission)`
- Sale idempotency: PK `id`, unique key as above, fingerprint + Order echo fields, `orderId` NOT NULL

No schema defect. Do not create 0094.

## Composition defect (closed by this program)

Production boot used `new InMemoryPosTerminalStore()` / Grant / Sale idempotency. A POS workspace must not depend on process memory.

## Intentionally unchanged

- Check intake idempotency store â€” no SQL table (prior program)
- Settlement initiate idempotency store â€” no SQL table (prior program)
- Order / Check / Settlement / CRMP / Commercial / Device tables
