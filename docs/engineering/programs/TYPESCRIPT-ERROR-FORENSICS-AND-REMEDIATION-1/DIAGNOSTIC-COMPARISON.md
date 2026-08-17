# DIAGNOSTIC COMPARISON

**Program:** TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1  
**Certified fingerprint:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1 / DIAGNOSTIC-FINGERPRINT.json  
**Current forensic fingerprint:** this package / DIAGNOSTIC-FINGERPRINT.json  
**Comparison unit:** `file:line:column:TScode` plus normalized message identity

## Forensic result (before remediation)

| Class | Count |
|-------|------:|
| UNCHANGED | **188** |
| MOVED_ONLY | 0 |
| CHANGED | 0 |
| NEW | 0 |
| REMOVED | 0 |
| UNCLASSIFIED | 0 |

| Field | Value |
|-------|--------|
| Certified total | 188 |
| Current forensic total | 188 |
| Numerical delta | 0 |
| Exact fingerprint match | YES |

Every current diagnostic is the same logical diagnostic at the same relevant source location as the certified fingerprint. None are labeled “pre-existing” merely because the count was 188 historically. They are UNCHANGED because the stored fingerprint keys match.

## Definitions applied

| Class | Meaning |
|-------|---------|
| UNCHANGED | same logical diagnostic and same relevant source location |
| MOVED_ONLY | same diagnostic; line/column changed because of source movement |
| CHANGED | same area; code/message/meaning materially changed |
| NEW | not present in the certified fingerprint |
| REMOVED | present in the certified fingerprint; absent now |
| UNCLASSIFIED | cannot be proven |

## App.tsx / KioskShell (Phase 5)

Six UNCHANGED `TS2322` diagnostics:

| ID | Location | Route |
|----|----------|-------|
| TSF-001 | App.tsx:105 | `/kiosk/:slug/confirmed` |
| TSF-002 | App.tsx:106 | `/kiosk/:slug/checkout` |
| TSF-003 | App.tsx:107 | `/kiosk/:slug/cart` |
| TSF-004 | App.tsx:108 | `/kiosk/:slug/menu` |
| TSF-005 | App.tsx:109 | `/kiosk/:slug/language` |
| TSF-006 | App.tsx:110 | `/kiosk/:slug` |

**Contract:** `KioskShellProps` is `{ activation?: KioskShellActivation }` for Screen Runtime hosting at `/screen`. Wouter `Route` expects `ComponentType<RouteComponentProps<StringRouteParams<...>>>`.

**Runtime:** `KioskShell` reads the path with `useRoute("/kiosk/:slug...")`. Extra Route props are unused. This is a type-contract mismatch, not a proven runtime failure.

**Decision:** FIX_LATER. Do not use `as any`, `as unknown as`, `@ts-ignore`, or `@ts-expect-error`. Correct fix is a route adapter or dual contract (App.tsx vs KioskShell), not suppression.

Related internal contract (not App.tsx): `KioskShell.tsx:235` TS2322 — hosted `KioskShellStage` includes `tracking` (`OrderingClientStage`); `KioskOrderingSurface` accepts only `browse|cart|checkout|confirmation`. Also FIX_LATER.

## Post-remediation comparison

Fingerprint: `DIAGNOSTIC-FINGERPRINT-AFTER.json`  
Raw: `pnpm-check.after.raw.txt`

| Class | Count |
|-------|------:|
| UNCHANGED | 184 |
| MOVED_ONLY | 0 |
| CHANGED | 0 |
| NEW | **0** |
| REMOVED | **4** |
| UNCLASSIFIED | 0 |

| Field | Value |
|-------|--------|
| BEFORE | 188 |
| AFTER | 184 |
| DELTA | −4 |

REMOVED keys (exactly the four FIX_NOW items; all explained):

1. `client/src/lib/ordering-client/checkout/checkoutSubmission.ts:72:11:TS2339` (TSF-029)
2. `client/src/pages/admin/StatisticsPanel.tsx:330:62:TS2345` (TSF-037)
3. `shared/commercial-catalog/localization/fx.ts:137:22:TS7053` (TSF-168)
4. `shared/commercial-catalog/localization/fx.ts:138:20:TS7053` (TSF-169)

NEW: none. CHANGED: none. MOVED_ONLY: none.

The forensic `DIAGNOSTIC-FINGERPRINT.json` remains the 188 snapshot and was not rewritten to appear better.
