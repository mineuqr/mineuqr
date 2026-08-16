# COMPOSITION ARCHITECTURE

## Production / development (`NODE_ENV !== "test"`)

```
selectPosTerminalStore â†’ DrizzlePosTerminalStore
selectPosPermissionGrantStore â†’ DrizzlePosPermissionGrantStore
selectPosSaleIdempotencyStore â†’ DrizzlePosSaleIdempotencyStore
```

`pnpm dev` uses `NODE_ENV=development` and therefore Drizzle. Missing `DATABASE_URL` fails closed (`database_unavailable`). There is no InMemory fallback on that path.

## Test (`NODE_ENV === "test"`)

The same selectors return InMemory implementations so Vitest and router-level tests do not require MySQL.

Existing service tests continue to `new InMemoryPos*Store()` in constructors. `setPos*ForTests` overrides remain.

## Always InMemory (no SQL table)

- `InMemoryPosCheckIntakeIdempotencyStore`
- `InMemoryPosSettlementInitiateIdempotencyStore`

Do not invent POS Check / Settlement idempotency tables in this program.

## Centralization

Routers still call `getPos*Service()`. Store construction is not scattered.

Proof: `posStoreSelection.ts` + architecture guards + `selectPos*(env)` unit tests.
