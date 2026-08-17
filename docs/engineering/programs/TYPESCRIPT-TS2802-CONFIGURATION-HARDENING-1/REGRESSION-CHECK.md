# REGRESSION CHECK

**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1

## Certified after-state

Do not use a `pnpm check` that still shows 118 TS2802 after adding `target`. That is stale `tsBuildInfoFile` reuse.

**Clean procedure:** `pnpm exec tsc --noEmit --incremental false --pretty false`  
Then confirm `pnpm check` matches.

| | BEFORE (ES5, incremental false) | AFTER (ES2020, incremental false) | AFTER `pnpm check` |
|--|--------:|------:|------:|
| TOTAL | 148 | **28** | **28** |
| TS2802 | 118 | **0** | **0** |
| OTHER | 30 | 28 | 28 |
| App.tsx | 0 | 0 | 0 |

| Gate | Value |
|------|--------|
| NEW keys | 1 (classified C; exposed by A) |
| REMOVED TS2802 | 118 |
| REMOVED other | **3** × TS7006 (not 2) |
| CHANGED | 0 |
| MOVED_ONLY | 0 |
| UNCLASSIFIED | 0 |
| UNCHANGED | 27 |

`148 − 118 − 3 + 1 = 28`.

## NEW diagnostic

`client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx:1048:31:TS2345`

`setCurrency(r.currency)` vs `useState<"USD">` (`COMMERCIAL_CANONICAL_CURRENCY`).

Same defect class already in the 148 baseline at lines **426** and **1102**. Call site predates this program (`570e23cbe`). Silent under ES5 because `RegionalPolicyService.list()` infers from `[...regions.values()]` (TS2802 → `any` on tRPC data). Not occupancy. Not App.tsx. **Not source-fixed.**

## Build / bundle

`pnpm build` PASS. Client main chunk still `index-ClvYB_bf.js` **4,532.33 kB** / gzip **1,108.45 kB**.

## Source

No application source edited. `tsconfig.json`: one key `"target": "ES2020"`.
