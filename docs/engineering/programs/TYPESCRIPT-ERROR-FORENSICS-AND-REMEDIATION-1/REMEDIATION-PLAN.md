# REMEDIATION PLAN

**Program:** TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1  
**Rule:** only FIX_NOW may be modified in this program.

## Decision totals (forensic 188)

| Decision | Count | Action in this program |
|----------|------:|------------------------|
| FIX_NOW | 4 | apply smallest correct type fix |
| FIX_LATER | 28 | do not modify |
| CONFIGURATION | 118 | do not change tsconfig / check command |
| ARCHITECTURE_PROGRAM_REQUIRED | 30 | do not guess; later program |
| LEGACY_ACCEPTED | 6 | leave |
| TEST_HARNESS | 2 | leave |
| TOOLING | 0 | — |
| UNKNOWN | 0 | — |

## FIX_NOW (justified)

### TSF-029 — checkoutSubmission.ts:72 TS2339

**Category:** B — real type safety defect  
**Priority:** P2  
**Root cause:** `validateCheckoutNotes` built a local array annotated as `CheckoutDraftSnapshot["items"]` (readonly). `.push` is illegal on that type. Runtime value is a fresh `[]`.  
**Smallest fix:** annotate as `Array<CheckoutDraftSnapshot["items"][number]>`. Return type still satisfies the snapshot.  
**Not:** `as any`, mutating the snapshot type, checkout architecture change.  
**Focused test:** `client/src/lib/ordering-client/__tests__/orderingClientCheckout.test.ts`

### TSF-168 / TSF-169 — fx.ts:137–138 TS7053

**Category:** B — real type safety defect  
**Priority:** P2  
**Root cause:** `{ USD: 1, ...rates }` inferred as `{ USD: number }` so `table[from]` / `table[to]` are implicit any. Declared `FxRateTable` is `Record<string, number>`.  
**Smallest fix:** `const table: FxRateTable = { USD: 1, ...rates }`.  
**Not:** occupancy, checkLimit, or catalog persistence. Presentation FX only.  
**Focused test:** `shared/commercial-catalog/localization/__tests__/commercialCatalogLocalization.guards.test.ts`

### TSF-037 — StatisticsPanel.tsx:330 TS2345

**Category:** B — real type safety defect  
**Priority:** P2  
**Root cause:** `subscriptionStatus` is `string | null`; `mapCommercialStatusToBadgeTone` requires `string` (union already includes `"inactive" \| string`).  
**Smallest fix:** `entry.commercial.subscriptionStatus ?? "inactive"` — same presentation default as `ownerCommercialDisplay`.  
**Not:** Commercial Occupancy, G-10/G-11, or subscription state machine.

## Explicitly not FIX_NOW

| IDs | Why |
|-----|-----|
| TSF-001…006 App.tsx KioskShell | Phase 5: type contract, not proven runtime bug; adapter belongs later |
| TSF-040 KioskShell stage union | `tracking` vs ordering surface; contract, not suppression |
| TSF-017 MarkPaid `"other"` vs card\|cash | financial tender contract — ARCHITECTURE_PROGRAM_REQUIRED |
| TSF-016 / TSF-019 Order identity | Order/Check identity — ARCHITECTURE_PROGRAM_REQUIRED |
| TSF-052 Screen credential recovery | P1 contract; do not invent token fields |
| All TS2802 (118) | compiler policy (`target` / `downlevelIteration` absent). Changing tsconfig is CONFIGURATION, not this program |
| Check / Settlement / Order paths | Core Domain / financial aggregates — ARCHITECTURE_PROGRAM_REQUIRED |
| Commercial catalog persistence | FIX_LATER; not occupancy |

## Forbidden remediation (not used)

- `@ts-ignore` / `@ts-expect-error`
- `any` / `unknown` casts as the fix
- weakening `strict` or excluding app directories
- changing `pnpm check`
- deleting tests or code to reduce the count
- Commercial Occupancy / 0094 / checkLimit / G-07…G-11
- schema or Production changes

## Architecture / Commercial

No architecture decision was required for the four FIX_NOW items.  
Commercial Occupancy remains UNCHANGED / CERTIFIED.
