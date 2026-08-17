# FINAL REPORT

**PROGRAM:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1  
**STATUS:** PASS — classified; one controlled FIX_NOW; uncommitted

| Field | Value |
|-------|--------|
| HEAD (start) | `61ab1dbfe51c1f89e7ae563f0cd650d69fffeb4b` |
| BEFORE | **28** (measured; `pnpm check` = incremental-false) |
| AFTER | **27** |
| NEW | 0 |
| REMOVED | 1 (TDA-013) |
| CHANGED | 0 |
| UNCLASSIFIED | 0 |
| TS2802 | 0 |
| App.tsx | 0 |
| Occupancy | untouched |
| POS blockers | **none** |

## Decision

**A.**

28 FULLY CLASSIFIED  
NO POS BLOCKERS  
READY FOR POS-READ-APIS  

Do **not** start `POS-READ-APIS-IMPLEMENTATION-1` from this program.

## What was done

- Independently measured 28 (cache-independent and `pnpm check` agreed).
- Fingerprinted and classified every diagnostic (A–H; no I).
- Remediated **TDA-013** only: device order actions now use `useRuntimeBusiness().tenantId` instead of nonexistent `identity.restaurantId`.
- Left 27 with explicit dispositions. Did not chase zero.

## All 28 diagnostics

| ID | FILE | TS CODE | DESCRIPTION | DOMAIN | RISK | CLASSIFICATION | POS READ API IMPACT | ACTION | OWNER / FUTURE PROGRAM | STATUS |
|----|------|---------|-------------|--------|------|----------------|---------------------|--------|------------------------|--------|
| TDA-001 | CatalogManagementPanels.tsx:426 | TS2345 | `setCurrency` vs `useState<"USD">` (pricing) | Commercial catalog UI | P2 | FIX_LATER | none | leave | COMMERCIAL-CATALOG-MANAGEMENT-UI | OPEN |
| TDA-002 | CatalogManagementPanels.tsx:1048 | TS2345 | `setCurrency(r.currency)` | Commercial catalog UI | P2 | FIX_LATER | none | leave | COMMERCIAL-CATALOG-MANAGEMENT-UI | OPEN |
| TDA-003 | CatalogManagementPanels.tsx:1102 | TS2345 | `setCurrency(nextCurrency)` | Commercial catalog UI | P2 | FIX_LATER | none | leave | COMMERCIAL-CATALOG-MANAGEMENT-UI | OPEN |
| TDA-004 | CapabilityFilterPicker.tsx:132 | TS2322 | `tone="healthy"` not in union | Catalog / Platform Ops UI | P3 | FIX_LATER | none | leave | Platform Ops UI tokens | OPEN |
| TDA-005 | PlatformOpsReservedSection.tsx:19 | TS2739 | FUTURE_OWNERSHIP missing section keys | Admin IA | P3 | FIX_LATER | none | leave | OPERATIONS-INFORMATION-ARCHITECTURE | OPEN |
| TDA-006 | PlatformOpsSubscriptionComposition.tsx:63 | TS2322 | `columns={3}` vs hero columns token | Admin UI | P3 | FIX_LATER | none | leave | Platform Ops UI tokens | OPEN |
| TDA-007 | restaurantDashStyles.ts:189 | TS2322 | `SemanticTone` vs `RestaurantKpiTone` | Dashboard UI | P3 | FIX_LATER | none | leave | Dashboard presentation | OPEN |
| TDA-008 | OrdersWorkspacePanel.tsx:106 | TS2769 | RQ `structuralSharing` generic vs `unknown` | Order workspace **client** | P2 | FIX_LATER | consumes listActive; diagnostic is helper not DTO | leave | read-freshness / queryRuntime | OPEN |
| TDA-009 | SemanticBadge.tsx:57 | TS2322 | span vs button `ref` | Design system | P3 | FIX_LATER | none | leave | semantic-badge | OPEN |
| TDA-010 | semantic-card/tokens/domain.ts:85 | TS2322 | `replace()` widens shell literal | Design system | P3 | FIX_LATER | none | leave | semantic-card | OPEN |
| TDA-011 | semantic-table/tokens/tableSurface.ts:18 | TS1355 | `Object.freeze` + `as const` | Design system | P3 | FIX_LATER | none | leave | semantic-table | OPEN |
| TDA-012 | currencyLocale.ts:109 | TS2769 | Intl `style` widened to `string` | Presentation | P3 | FIX_LATER | none | leave | GLOBAL-NUMERIC-PRESENTATION | OPEN |
| TDA-013 | useOperationalDeviceOrderActions.ts:30 | TS2339 | `identity.restaurantId` missing | Device order **write** | P1 | FIX_NOW | none (not a read DTO) | use `business.tenantId` | RUNTIME-INSTANCE-CONTEXT | **FIXED** |
| TDA-014 | useKitchenRuntimeStream.ts:79 | TS2769 | RQ `structuralSharing` generic vs `unknown` | Kitchen **client** cache | P2 | FIX_LATER | queue types already exist | leave | read-freshness | OPEN |
| TDA-015 | runtimeInstanceContext.ts:126 | TS2322 | frozen arrays vs mutable `string[]` | Screen runtime | P2 | FIX_LATER | snapshot helper, not POS DTO | leave | RUNTIME-INSTANCE-CONTEXT | OPEN |
| TDA-016 | arabicPdfText.ts:6 | TS7016 | `bidi-js` has no types | PDF export | P3 | TOOLING / CONFIGURATION | none | optional decls | reporting-exports | OPEN |
| TDA-017 | buildReportingExportPdf.ts:32 | TS2694 | pdfkit `default` namespace | PDF export | P3 | TOOLING / CONFIGURATION | none | pdfkit import typing | reporting-exports | OPEN |
| TDA-018 | buildReportingExportPdf.ts:495 | TS2322 | `Uint8Array` vs `BlobPart` | PDF export | P3 | TOOLING / CONFIGURATION | none | Blob constructor typing | reporting-exports | OPEN |
| TDA-019 | Dashboard.tsx:2325 | TS2339 | `dash.emptyPanel` missing | Restaurant admin UI | P3 | FIX_LATER | none | add style token | Dashboard | OPEN |
| TDA-020 | Dashboard.tsx:3234 | TS2322 | readonly tax policy vs mutable prop | Restaurant tax UI | P2 | FIX_LATER | none — do not invent tax contract | leave | business tax policy UI | OPEN |
| TDA-021 | KioskShell.tsx:235 | TS2322 | `"tracking"` not in surface stage | Guest kiosk | P2 | FIX_LATER | none | align KioskShellStage | kiosk ordering client | OPEN |
| TDA-022 | MenuView.tsx:253 | TS2322 | `tableLabel` string vs `"tables"\|"rooms"` | Guest QR menu | P3 | FIX_LATER | none | leave | MenuView | OPEN |
| TDA-023 | DrizzleCrmpRepository.ts:472 | TS2352 | LAST_INSERT_ID as `ResultSetHeader` | CRMP shift **write** | P2 | FIX_LATER | none | shared execute helper later | drizzle/mysql2 typing | OPEN |
| TDA-024 | refundDocumentNumberRepository.ts:51 | TS2352 | same LAST_INSERT_ID typing | Refund sequence **write** | P2 | FIX_LATER | none — not refund semantics | shared execute helper later | drizzle/mysql2 typing | OPEN |
| TDA-025 | DrizzleBusinessIdentityAllocator.ts:72 | TS2352 | same LAST_INSERT_ID typing | Order identity **write** | P2 | FIX_LATER | none | shared execute helper later | drizzle/mysql2 typing | OPEN |
| TDA-026 | reportingUxRationalization.liveUat.ts:118 | TS2367 | `refundRate` vs `ExecutiveSummaryCardId` | Reporting UAT script | P3 | TEST_HARNESS | none | align KPI ids in script | reporting-platform __scripts__ | OPEN |
| TDA-027 | reportingUxRationalization.liveUatData.ts:136 | TS2367 | same comparison | Reporting UAT script | P3 | TEST_HARNESS | none | align KPI ids in script | reporting-platform __scripts__ | OPEN |
| TDA-028 | legacyReportingSurfaces.ts:150 | TS2677 | type predicate vs const-union | Legacy reporting registry | P2 | FIX_LATER | none | reporting adoption | ADMIN-REPORTING-PLATFORM-ADOPTION | OPEN |

## Verification

| Gate | Result |
|------|--------|
| `pnpm check` | 27 / TS2802 0 |
| `tsc --incremental false` | 27 / TS2802 0 |
| `pnpm build` | PASS |
| Focused tests | 63/63 |
| Occupancy | unchanged |
| DB / Production / deploy | 0 |

## Git

| Field | Value |
|-------|--------|
| Modified source | `client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts` |
| Added | `docs/engineering/programs/TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1/` |
| Commit / push / deploy | **not performed** |

Working tree left for review.
