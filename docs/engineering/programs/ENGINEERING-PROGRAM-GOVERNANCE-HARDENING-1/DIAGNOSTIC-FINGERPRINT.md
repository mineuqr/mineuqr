# DIAGNOSTIC FINGERPRINT

**Program:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1  
**Total:** 188  
**Files:** 82  
**Codes:** 19  

Each diagnostic identity is:

`file:line:column:TSxxxx` plus a whitespace-normalized message.

Machine-readable list: `DIAGNOSTIC-FINGERPRINT.json`.  
Parser: `_fingerprint-check.mjs`.

## By error code

| Code | Count |
|------|------:|
| TS2802 | 118 |
| TS2322 | 21 |
| TS2345 | 8 |
| TS2339 | 7 |
| TS2459 | 7 |
| TS2724 | 5 |
| TS2352 | 3 |
| TS2769 | 3 |
| TS7006 | 3 |
| TS2305 | 2 |
| TS2367 | 2 |
| TS7053 | 2 |
| TS1355 | 1 |
| TS18049 | 1 |
| TS2353 | 1 |
| TS2677 | 1 |
| TS2694 | 1 |
| TS2739 | 1 |
| TS7016 | 1 |
| **Total** | **188** |

These 19 codes match the families named in the program charter. None are classified harmless. None were fixed in this program.

## Highest-count files

| File | Count |
|------|------:|
| `server/services/commercial-catalog/livePlanPersistence.ts` | 29 |
| `server/services/commercial-catalog/index.ts` | 26 |
| `server/crmp/InMemoryCrmpStore.ts` | 7 |
| `client/src/App.tsx` | 6 |
| `server/services/commercial-catalog/adoptionService.ts` | 6 |

Remaining files have 1–5 diagnostics each. Full map is in the JSON.

## App.tsx (editor subset)

All six editor diagnostics are in this fingerprint:

| Key | Route |
|-----|--------|
| `client/src/App.tsx:105:46:TS2322` | `/kiosk/:slug/confirmed` |
| `client/src/App.tsx:106:45:TS2322` | `/kiosk/:slug/checkout` |
| `client/src/App.tsx:107:41:TS2322` | `/kiosk/:slug/cart` |
| `client/src/App.tsx:108:41:TS2322` | `/kiosk/:slug/menu` |
| `client/src/App.tsx:109:45:TS2322` | `/kiosk/:slug/language` |
| `client/src/App.tsx:110:36:TS2322` | `/kiosk/:slug` |

They are `KioskShell` `component={...}` prop incompatibility with wouter `RouteComponentProps`. They are **part of the 188**, not a separate baseline.

This program did not repair them. Forensic comparison did not prove they were introduced by this program (this program changed no application source).
