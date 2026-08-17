# FORENSIC RECONCILIATION — FINAL REVIEW

**PROGRAM:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1  
**STATUS:** AUTHORIZED — REVIEW ONLY (no source remediation, no commit)

HEAD: `2a585effecab116365261258104b4c62ca6bf2f3`  
Working tree: `tsconfig.json` (`target` only) + this program docs directory.

---

## 1. Certified measurements (cache-independent)

Legitimate mechanism: `tsconfig.json` sets `"incremental": true` and `"tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo"`. `pnpm check` is `tsc --noEmit` and therefore *can* reuse that file.

**Clean verification (does not read or write `tsBuildInfoFile`):**

```
pnpm exec tsc --noEmit --incremental false --pretty false
```

This is a TypeScript CLI override of the repo’s declared incremental option. It is not an ad-hoc file deletion.

| Run | Command | TOTAL | TS2802 | OTHER | 1048 present |
|-----|---------|------:|-------:|------:|:------------:|
| BEFORE equivalent | `tsc --noEmit --incremental false --target ES5` (CLI override, **no file edit**) | 148 | 118 | 30 | **no** |
| AFTER | `tsc --noEmit --incremental false` (tsconfig `target: ES2020`) | 28 | 0 | 28 | **yes** |
| AFTER `pnpm check` | `tsc --noEmit` (incremental, current cache) | 28 | 0 | 28 | **yes** |

`pnpm check` after the incremental-false run matches it: **TS2802 = 0**, total **28**. The result does not depend on stale-cleared-cache ambiguity.

App.tsx: **0 → 0**.

---

## 2. Arithmetic (must reconcile)

```
BEFORE              148
TS2802 REMOVED     −118
OTHER REMOVED        −3
NEW                  +1
CHANGED               0
MOVED_ONLY            0
UNCLASSIFIED          0
────────────────────────
AFTER                28
```

Check: `148 − 118 − 3 + 1 = 28`.  
Check: `148 − 121 + 1 = 28`.  
Check: `UNCHANGED 27 + NEW 1 = 28`.

The earlier statement “OTHER 30 → 28 therefore two OTHER removed” is **false**. Net OTHER is `30 − 3 + 1 = 28`. **Three** non-TS2802 diagnostics were removed; **one** was added.

---

## 3. Classification of every non-TS2802 diagnostic

Fingerprint key = `file:line:column:code`.

### UNCHANGED (27)

All 27 identities below exist at the same file/line/column/code/message in BEFORE 148 and AFTER 28.

| # | Key | Code |
|--:|-----|------|
| 1 | `CatalogManagementPanels.tsx:426:44:TS2345` | TS2345 |
| 2 | `CatalogManagementPanels.tsx:1102:27:TS2345` | TS2345 |
| 3 | `CapabilityFilterPicker.tsx:132:11:TS2322` | TS2322 |
| 4 | `PlatformOpsReservedSection.tsx:19:7:TS2739` | TS2739 |
| 5 | `PlatformOpsSubscriptionComposition.tsx:63:9:TS2322` | TS2322 |
| 6 | `restaurantDashStyles.ts:189:3:TS2322` | TS2322 |
| 7 | `OrdersWorkspacePanel.tsx:106:5:TS2769` | TS2769 |
| 8 | `SemanticBadge.tsx:57:6:TS2322` | TS2322 |
| 9 | `semantic-card/tokens/domain.ts:85:5:TS2322` | TS2322 |
| 10 | `tableSurface.ts:18:31:TS1355` | TS1355 |
| 11 | `currencyLocale.ts:109:11:TS2769` | TS2769 |
| 12 | `useOperationalDeviceOrderActions.ts:30:33:TS2339` | TS2339 |
| 13 | `useKitchenRuntimeStream.ts:79:7:TS2769` | TS2769 |
| 14 | `runtimeInstanceContext.ts:126:3:TS2322` | TS2322 |
| 15 | `arabicPdfText.ts:6:25:TS7016` | TS7016 |
| 16 | `buildReportingExportPdf.ts:32:50:TS2694` | TS2694 |
| 17 | `buildReportingExportPdf.ts:495:20:TS2322` | TS2322 |
| 18 | `Dashboard.tsx:2325:33:TS2339` | TS2339 |
| 19 | `Dashboard.tsx:3234:17:TS2322` | TS2322 |
| 20 | `KioskShell.tsx:235:9:TS2322` | TS2322 |
| 21 | `MenuView.tsx:253:11:TS2322` | TS2322 |
| 22 | `DrizzleCrmpRepository.ts:472:25:TS2352` | TS2352 |
| 23 | `refundDocumentNumberRepository.ts:51:34:TS2352` | TS2352 |
| 24 | `DrizzleBusinessIdentityAllocator.ts:72:40:TS2352` | TS2352 |
| 25 | `reportingUxRationalization.liveUat.ts:118:9:TS2367` | TS2367 |
| 26 | `reportingUxRationalization.liveUatData.ts:136:9:TS2367` | TS2367 |
| 27 | `legacyReportingSurfaces.ts:150:15:TS2677` | TS2677 |

MOVED_ONLY: **none**.  
CHANGED: **none**.  
UNCLASSIFIED: **none**.

### REMOVED — other than TS2802 (3)  ← these are the “OTHER” removals

Not two. **Three.** All `TS7006` (implicit `any` on a callback parameter).

| # | Key | Message | Why it disappeared under ES2020 |
|--:|-----|---------|----------------------------------|
| 1 | `CatalogManagementPanels.tsx:633:51:TS7006` | Parameter `f` implicitly has an `any` type | `(b.features ?? []).filter((f) => f.included)`. `listFeatures()` is inferred from `[...this.store.bundleFeatures.values()]` (`server/services/commercial-catalog/index.ts:443`, TS2802 under ES5). ES5: that spread is not a typed array → `features` is `any` → `.filter` callback has no contextual type. ES2020: `CommercialBundleFeature[]` → `f` is typed. |
| 2 | `CatalogManagementPanels.tsx:748:20:TS7006` | Parameter `v` implicitly has an `any` type | Same pattern: `(p.values ?? []).map((v) => …)` from `listValues()` / `[...this.store.limitValues.values()]` at `index.ts:540`. |
| 3 | `server/crmp/InMemoryCrmpStore.ts:164:12:TS7006` | Parameter `a` implicitly has an `any` type | Direct ES2020 effect: `for (const s of shifts.values())` is TS2802 under ES5 (`InMemoryCrmpStore.ts:161`). Loop value / `s.attributions` loses typing → `find((a) => …)` is implicit `any`. ES2020 types the Map iteration. |

### REMOVED — TS2802 (118)

Every TS2802 identity in `DIAGNOSTIC-FINGERPRINT.json` is gone. After-state TS2802 count is **0**. None moved, none changed code, none remain under a different line.

Causal: omitted `target` → TypeScript 5.9 default **ES5**. Map/Set `for-of` and `[...map.values()]` require `target >= ES2015` or `downlevelIteration`. Setting `target` to ES2020 removes the false ES5 emit contract. tsc is `noEmit`; Vite/esbuild emit was already modern.

### NEW (1)

| Key | Code | Message |
|-----|------|---------|
| `CatalogManagementPanels.tsx:1048:31:TS2345` | TS2345 | Argument of type `string` is not assignable to parameter of type `SetStateAction<"USD">` |

---

## 4. Line 1048 — required A–E determination

Related UNCHANGED diagnostics (same file, same message, **already in the 148 baseline**):

| Line | Component | Call | Present under ES5? | Present under ES2020? |
|-----:|-----------|------|:------------------:|:---------------------:|
| 426 | `PricingManagementPanel` | `setCurrency(e.target.value.toUpperCase())` | yes | yes |
| 1102 | `RegionsManagementPanel` | `setCurrency(nextCurrency)` from `CatalogCountrySelect` (`currency: string`) | yes | yes |
| **1048** | `RegionsManagementPanel` | `setCurrency(r.currency)` from region row | **no** | **yes** |

Source of 1048: `setCurrency(r.currency)` at that line is **not** from this program. `git blame` → `570e23cbe` (2026-07-29). `git diff HEAD -- CatalogManagementPanels.tsx` is empty. This program did not rewrite the file.

Root type of the setter (both 1048 and 1102):

```ts
useState(COMMERCIAL_CANONICAL_CURRENCY)
// COMMERCIAL_CANONICAL_CURRENCY = "USD" as const  →  useState<"USD">
```

`CommercialRegion.currency` is `string` (`shared/commercial-catalog/types/index.ts`). `r.currency: string` is not assignable to `SetStateAction<"USD">`. That is a **FIX_LATER catalog UI** defect, the same class as 426 and 1102.

Why 1048 was silent under ES5 (cache-independent):

```ts
// RegionalPolicyService.list — inferred return, no annotation
list() {
  return [...this.store.regions.values()];
}
```

Under ES5 this exact expression is TS2802 at `server/services/commercial-catalog/index.ts:714`. tRPC `listRegions` returns that inferred type. Client `regionsQuery.data` / `filterByQuery` rows become `any`. `setCurrency(any)` is legal. No TS2345 at 1048.

Under ES2020 the spread types as `CommercialRegion[]`. `r.currency` is `string`. TS2345 appears at 1048.

ES5 `--incremental false` **does not** emit 1048. ES2020 `--incremental false` **does**. Therefore this is **not** tsbuildinfo exposure.

| Option | Verdict |
|--------|---------|
| **A. caused by the ES2020 target change** | **Exposure only.** The diagnostic is *emitted* because ES2020 types `[...regions.values()]`. No product source was added. |
| **B. exposed by cache invalidation / tsbuildinfo** | **No.** Both target measurements used `--incremental false`. |
| **C. existing logical defect represented at a new location** | **Yes — primary classification.** Same `SetStateAction<"USD">` vs `string` already reported at 426 and 1102. 1048 is a third call site of the same `setCurrency` in `RegionsManagementPanel` (sibling of 1102). Previously represented as TS2802 + `any` on `RegionalPolicyService.list()`, not as TS2345 at the UI site. |
| **D. a true newly introduced diagnostic** | **No.** Call site predates HEAD by weeks. This program did not edit the file. ES5 clean check does not report it because `r` was `any`, not because the defect was absent. |
| **E. unrelated to the target change** | **No.** It appears if and only if `target >= ES2015` for this program’s check. |

**Not a genuine product regression caused by this program.** Do not STOP. Do not edit `CatalogManagementPanels.tsx` to force `NEW = 0`.

---

## 5. Cache / reproducibility

**Declared cache:** `compilerOptions.tsBuildInfoFile` = `./node_modules/typescript/tsbuildinfo`.

Stale incremental reuse after adding `target` is real: the first `pnpm check` after the config edit still reported 118 TS2802. That capture is **not** certified.

**Correct clean procedure (no arbitrary deletes):**

1. Cache-independent truth: `pnpm exec tsc --noEmit --incremental false --pretty false`
2. Confirm `pnpm check` (incremental, declared `tsBuildInfoFile`) matches step 1
3. If they diverge, the *configured* `tsBuildInfoFile` is stale. Invalidate **that path only** (it is the repo’s declared TypeScript cache, not an arbitrary file), then repeat 1–2

This review: step 1 = 28 / TS2802 0; step 2 `pnpm check` = 28 / TS2802 0. Reproducible.

---

## 6. ES2020 configuration review

`git diff tsconfig.json` is exactly one added line: `"target": "ES2020"`.

| Check | Result |
|-------|--------|
| `target` | `ES2020` |
| `strict` | `true` (unchanged) |
| `downlevelIteration` | not set |
| file exclusions | unchanged |
| diagnostic suppression (`@ts-ignore` / `@ts-expect-error` / skip of this program’s files) | none added |
| source rewrites for TS2802 | none (`CatalogManagementPanels.tsx` untouched) |
| Vite `build.target` | still unset (Vite 7 default) |
| esbuild server | still `--platform=node --format=esm`, no `--target` |
| `noEmit` | `true` — tsc still emits nothing |
| `skipLibCheck` | already `true` before this program |
| Node / browser | Node 20 CI; Vite baseline-widely-available; Map/Set `for-of` native |

This is a **configuration correction** (check target aligned with `lib: esnext`, `module: ESNext`, bundler emit). It is not an error-suppression mechanism. Remaining 28 diagnostics are still reported.

---

## 7. Verification

| Command | Result |
|---------|--------|
| `tsc --noEmit --incremental false` | 28 errors, **TS2802 = 0** |
| `pnpm check` | 28 errors, **TS2802 = 0** |
| `pnpm build` | **PASS**. Client chunk still `index-ClvYB_bf.js` **4,532.33 kB** / gzip **1,108.45 kB** |
| Occupancy / `checkLimit` / 0094 | `git diff` empty |
| Database / Production / deployment | none |
| Commit / push | none |

---

## 8. Certification criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `target` ES2020 proven | PASS |
| 2 | TS2802 = 0 | PASS |
| 3 | Build = PASS | PASS |
| 4 | No unexplained NEW | PASS — NEW=1 classified **C**, exposed by **A**, not B/D/E |
| 5 | No unexplained CHANGED | PASS — CHANGED=0 |
| 6 | No UNCLASSIFIED | PASS |
| 7 | Accounting reconciles | PASS — `148 − 118 − 3 + 1 = 28` |
| 8 | Cache state reproducible | PASS — incremental false ≡ `pnpm check` |
| 9 | No unsafe suppression | PASS |
| 10 | Commercial Occupancy unchanged | PASS |
| 11 | No DB / Production / deployment mutation | PASS |

**CERTIFICATION: PASS**

Do not start `POS-READ-APIS-IMPLEMENTATION-1` from this program.
