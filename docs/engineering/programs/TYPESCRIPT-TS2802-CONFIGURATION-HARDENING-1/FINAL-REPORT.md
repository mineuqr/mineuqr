# FINAL REPORT

**PROGRAM:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1  
**STATUS:** PASS — CERTIFIED (uncommitted; review-only gate complete)

| Field | Value |
|-------|--------|
| START SHA | `2a585effecab116365261258104b4c62ca6bf2f3` |
| CURRENT SHA | `2a585effecab116365261258104b4c62ca6bf2f3` |
| BASELINE TOTAL | **148** |
| CURRENT TOTAL | **28** |
| TS2802 BEFORE | **118** |
| TS2802 AFTER | **0** |
| OTHER REMOVED | **3** (all TS7006; not 2) |
| NEW | **1** classified C (exposed by A); not a product regression |
| CHANGED | **0** |
| MOVED_ONLY | **0** |
| UNCLASSIFIED | **0** |
| UNCHANGED (non-TS2802) | **27** |

Accounting: `148 − 118 − 3 + 1 = 28`.

Full forensic record: `FORENSIC-RECONCILIATION.md`.

## Root cause

`pnpm check` is `tsc --noEmit`. Implicit **ES5** target + `lib: esnext` + Map/Set `for-of` / `[...map.values()]`. Vite/esbuild already emit modern JS. TS2802 was a check-contract mismatch, not a runtime bug.

## Selected solution

**A.** `"target": "ES2020"` only.  
Not `downlevelIteration`. Not ESNext. Not multi-tsconfig. Not source rewrites of 118 iteration sites.

## Config change

```diff
+ "target": "ES2020",
```

`strict` unchanged. No excludes. No suppressions. Vite/esbuild unchanged.

## Line 1048 (NEW)

`CatalogManagementPanels.tsx:1048:31:TS2345` — `setCurrency(r.currency)` vs `useState<"USD">`.

- Call site dates to `570e23cbe` (2026-07-29). File not modified by this program.
- Sibling diagnostics at **426** and **1102** (same message) were already in the 148 baseline.
- Absent from ES5 `--incremental false`; present under ES2020 `--incremental false` → **not cache**.
- Cause of *emission*: ES2020 types `RegionalPolicyService.list()` (`[...regions.values()]`, previously TS2802 + `any` on tRPC `listRegions`).
- Classification: **C** (existing FIX_LATER UI defect at a previously silent call site), exposed by **A**. Not D. Not remediated in this program.

## Verification

| Gate | Result |
|------|--------|
| `tsc --noEmit --incremental false` | 28 / TS2802 **0** |
| `pnpm check` | 28 / TS2802 **0** |
| `pnpm build` | PASS; chunk `index-ClvYB_bf.js` 4,532.33 kB unchanged |
| App.tsx | 0 |
| Occupancy / financial source | not modified |
| Database / Production / deploy | none |

## Git

| Field | Value |
|-------|--------|
| Modified | `tsconfig.json` |
| Added | `docs/engineering/programs/TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1/` |
| Commit / push / deploy | not performed |

**CERTIFICATION: PASS**

Do not start `POS-READ-APIS-IMPLEMENTATION-1` from this program.
