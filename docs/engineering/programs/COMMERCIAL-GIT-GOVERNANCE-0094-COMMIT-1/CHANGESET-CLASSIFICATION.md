# CHANGESET CLASSIFICATION

**Program:** COMMERCIAL-GIT-GOVERNANCE-0094-COMMIT-1  
**Branch:** `main` (tracked `origin/main` before push)

No UNKNOWN files. No unrelated files committed.

## A — CERTIFIED COMMERCIAL CHANGE

- `drizzle/0094_commercial_limit_occupancy_locks.sql`
- `drizzle/meta/_journal.json`
- `drizzle/schema.ts`
- `server/db/schema/commercial/tables.ts`
- `server/db/schema/commercial/index.ts`
- `server/subscription-runtime/commercialLimitOccupancy.ts`
- `server/subscription-runtime/commercialOccupancyTrpc.ts`
- `server/subscription-runtime/onboardingRestaurantCapacity.ts`
- `server/subscription-runtime/index.ts`
- `server/subscriptionPlanLimits.ts`
- `server/auth-local.ts`
- `server/auth-local/registerOwner.ts`
- `server/routers.ts`
- `server/db.ts` (residual `createCategory` / `createMenuItem` restaurant-row lock)
- `tsconfig.json` (exclude occupancy TiDB/MySQL harness files from `tsc` so the 188 baseline holds)

## B — CERTIFIED POS CHANGE REQUIRED BY COMMERCIAL

- `server/pos/services/PosTerminalService.ts`
- `server/pos/api/posRouter.ts`
- `server/pos/infrastructure/PosTerminalStore.ts`
- `server/pos/infrastructure/DrizzlePosTerminalStore.ts`
- `server/pos/infrastructure/InMemoryPosTerminalStore.ts`
- `server/db/restaurantRowLock.ts`
- `server/db/cascadeDeletes.ts`
- `server/order/infrastructure/persistence/DrizzleOrderRepository.ts`

## C — CERTIFICATION DOCUMENTATION

All untracked `docs/engineering/programs/` packages for the certified occupancy lineage, including Production Apply / Production Certification evidence (no credentials). This program package.

## D — GOVERNANCE CHANGE

- `scripts/lib/migration-governance-lib.cjs` — terminus `0094` / count `95`
- `scripts/migration-governance-guard.cjs` — messages `0000–0094`
- `scripts/__tests__/migrationGovernance.test.ts` — pin 0094; keep 0093 as predecessor at idx 93

## E — TEST CHANGE

Occupancy / onboarding / G-07…G-11 / TOCTOU / POS entitlement / POS architecture guards / CRMP journal guards / PLATFORM_OWNER hub mock / routers / cascade / catalog repair tests listed in `git status --short`.

## F — UNRELATED CHANGE

None committed. Root `.env`, `dist/`, `node_modules/`, `_forensics-temp/`, and other pre-existing local artifacts were left unstaged.

## G — UNKNOWN

None.
