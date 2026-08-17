# REMEDIATION DECISIONS

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1  
Success is **not** 28 → 0.

## Applied (FIX_NOW)

**TDA-013** — `useOperationalDeviceOrderActions.ts`

| Criterion | Evidence |
|-----------|----------|
| local | One hook; no identity schema change |
| minimal | Swap `useRuntimeIdentity()` → `useRuntimeBusiness()`; `restaurantId = business.tenantId` |
| type-safe | `tenantId: number` on `RuntimeInstanceBusiness` |
| behavior | Restores intended restaurant scope (`RuntimeContextFactory` already sets `tenantId: status.device.restaurantId`). Previously `identity.restaurantId` was `undefined` at runtime. |
| tests | `architectureGuards` + `runtimePublicApiConsolidation` + `RuntimeContextFactory` — 63/63 |
| architecture | Does **not** add `restaurantId` to `RuntimeInstanceIdentity`. Uses the public business slice. |

Forbidden techniques not used: no `any`, no `@ts-ignore`, no file exclude.

## Explicitly not remediated

| IDs | Why not in this program |
|-----|-------------------------|
| TDA-001…003 | Catalog `SetStateAction<"USD">` — FIX_LATER UI; not POS; not occupancy |
| TDA-008, 014 | structuralSharing generics — local but P2 client helper; changing RQ adapter is unrelated to POS DTO work |
| TDA-015 | Making capability arrays `readonly` is a screen-runtime type tweak; not required before POS reads |
| TDA-016…018 | PDF tooling; optional `@types` / Blob cast needs a typed helper, not POS |
| TDA-023…025 | LAST_INSERT_ID typing needs a **shared drizzle/mysql2 execute helper** after confirming the runtime row shape. `as unknown as` is disallowed. Do not invent financial semantics. |
| TDA-020 | Tax form readonly — do not widen tax policy to silence UI |
| TDA-021 | Kiosk `tracking` stage — guest shell, separate from App.tsx Route fix |
| TDA-026…027 | UAT scripts vs KPI id union — harness |
| TDA-028 | Legacy reporting predicate — reporting adoption owner |

No files excluded. No tests deleted. No Occupancy edits.

## Count

```
BEFORE = 28
AFTER  = 27
NEW    = 0
REMOVED = 1  (TDA-013)
CHANGED = 0
UNCLASSIFIED = 0
```

`28 − 1 + 0 = 27`.
