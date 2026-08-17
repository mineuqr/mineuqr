# DIAGNOSTIC INVENTORY

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1  
**Population:** the independently measured **28** (before controlled FIX_NOW).

Production vs tooling: `*.test.ts` is excluded from `pnpm check`. `__scripts__` UAT files **are** included.

None of the 28 reference Commercial Occupancy (`checkLimit`, `commercialLimitOccupancy`, 0094, G-07…G-11).

---

### TDA-001

| Field | Value |
|-------|-------|
| file | `client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx` |
| line / col | 426 / 44 |
| TS | TS2345 |
| message | Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"USD">' |
| domain | Commercial catalog admin UI |
| owner | COMMERCIAL-CATALOG-MANAGEMENT-UI |
| production | yes (admin) |
| POS read | no |
| disposition | FIX_LATER |
| risk | P2 |
| notes | `useState(COMMERCIAL_CANONICAL_CURRENCY)` infers `"USD"`. Pricing panel `setCurrency` from input. |

### TDA-002

Same file **1048 / 31**, same TS2345 / same setter in `RegionsManagementPanel` (`r.currency: string`). Unmasked by ES2020. FIX_LATER. P2. Not POS.

### TDA-003

Same file **1102 / 27**, same TS2345 from `CatalogCountrySelect` `currency: string`. FIX_LATER. P2. Not POS.

### TDA-004

`CapabilityFilterPicker.tsx:132` TS2322 — `tone="healthy"` not in PlatformOps metric tone union. Catalog admin presentation. FIX_LATER. P3.

### TDA-005

`PlatformOpsReservedSection.tsx:19` TS2739 — `FUTURE_OWNERSHIP` Record missing `subscription` / `commercialCatalog` keys after section-id expansion. Admin IA. FIX_LATER. P3.

### TDA-006

`PlatformOpsSubscriptionComposition.tsx:63` TS2322 — `columns={3}` vs `PlatformOpsHeroColumns`. Admin UI token. FIX_LATER. P3.

### TDA-007

`restaurantDashStyles.ts:189` TS2322 — `SemanticTone` (`"danger"`) not assignable to `RestaurantKpiTone`. Dashboard presentation adapter. FIX_LATER. P3.

### TDA-008

`OrdersWorkspacePanel.tsx:106` TS2769 — `order.read.listActive.useQuery` options: `structuralSharing` generic `<T extends ActiveOrderListLike>` is not `(unknown, unknown) => unknown`. **Consumes** the existing order read API; the diagnostic is the **client React Query helper**, not `ActiveOrderListResult`. `z.coerce.number()` on the router is valid at runtime; tRPC infers `restaurantId: unknown` from coerce (not a separate diagnostic). FIX_LATER. P2. **Not a POS-READ-APIS blocker.**

### TDA-009

`SemanticBadge.tsx:57` TS2322 — `asChild`/`interactive` union: `ref` is `HTMLSpanElement` vs `HTMLButtonElement`. Design system. FIX_LATER. P3.

### TDA-010

`semantic-card/tokens/domain.ts:85` TS2322 — `String.prototype.replace` widens literal shell class to `string`. Design system. FIX_LATER. P3.

### TDA-011

`semantic-table/tokens/tableSurface.ts:18` TS1355 — `Object.freeze({...}) as const` is illegal (freeze is not a literal). Design-system token. FIX_LATER. P3.

### TDA-012

`currencyLocale.ts:109` TS2769 — `withWesternDigitsIntlOptions({ style: "currency", ... })` generic `T extends object` widens `style` to `string`. Presentation. FIX_LATER. P3.

### TDA-013 — FIXED this program

`useOperationalDeviceOrderActions.ts:30` TS2339 — `identity.restaurantId` does not exist on `RuntimeInstanceIdentity`. Runtime value was `undefined`. Restaurant scope is `business.tenantId` (`RuntimeContextFactory` copies `status.device.restaurantId` there). **FIX_NOW applied:** `useRuntimeBusiness().tenantId`. P1 before fix. Device **write** path (execute order action + lifecycle broadcast), not a read DTO.

### TDA-014

`useKitchenRuntimeStream.ts:79` TS2769 — same `structuralSharing` generic vs React Query `unknown`. Kitchen queue **client cache merge**. Router input is already a typed status union. FIX_LATER. P2. Not a POS-READ-APIS blocker.

### TDA-015

`runtimeInstanceContext.ts:126` TS2322 — `Object.freeze` on capability arrays makes `readonly string[]` vs mutable `string[]` on `RuntimeInstanceCapabilities`. Screen runtime freeze helper. FIX_LATER. P2.

### TDA-016

`arabicPdfText.ts:6` TS7016 — `bidi-js` has no types. PDF export tooling. TOOLING / CONFIGURATION. P3.

### TDA-017

`buildReportingExportPdf.ts:32` TS2694 — `typeof import("pdfkit").default`. PDF tooling. TOOLING / CONFIGURATION. P3.

### TDA-018

`buildReportingExportPdf.ts:495` TS2322 — `Uint8Array<ArrayBufferLike>` vs `BlobPart`. TS 5.9 / DOM lib. TOOLING / CONFIGURATION. P3.

### TDA-019

`Dashboard.tsx:2325` TS2339 — `dash.emptyPanel` missing from restaurant dash style object. Offers empty state. FIX_LATER. P3.

### TDA-020

`Dashboard.tsx:3234` TS2322 — readonly tax-policy document vs mutable form prop. Restaurant admin tax UI. Do **not** invent tax/financial contracts to silence it. FIX_LATER. P2.

### TDA-021

`KioskShell.tsx:235` TS2322 — `stage` includes `"tracking"` from `OrderingClientStage`; `KioskOrderingSurface` omits it. Guest kiosk shell. FIX_LATER. P2.

### TDA-022

`MenuView.tsx:253` TS2322 — `restaurant.tableLabel` is `string` vs `"tables" \| "rooms"`. Guest QR menu. FIX_LATER. P3.

### TDA-023

`DrizzleCrmpRepository.ts:472` TS2352 — `db.execute(SELECT LAST_INSERT_ID())` typed as `ResultSetHeader`, cast to `{ n: number }[]`. CRMP **shift number write**. Same mysql2/drizzle family as TDA-024/025. FIX_LATER. P2. Not a read model.

### TDA-024

`refundDocumentNumberRepository.ts:51` TS2352 — identical LAST_INSERT_ID typing on refund document **sequence write**. Financial-adjacent persistence typing, not refund semantics. Do not invent a refund contract. FIX_LATER. P2.

### TDA-025

`DrizzleBusinessIdentityAllocator.ts:72` TS2352 — identical LAST_INSERT_ID typing on daily display number **write**. FIX_LATER. P2.

### TDA-026

`reportingUxRationalization.liveUat.ts:118` TS2367 — `ExecutiveSummaryCardId` has no `"refundRate"`. Live UAT script under `server/reporting-platform/__scripts__/`. TEST_HARNESS. P3.

### TDA-027

`reportingUxRationalization.liveUatData.ts:136` TS2367 — same comparison. TEST_HARNESS. P3.

### TDA-028

`legacyReportingSurfaces.ts:150` TS2677 — type predicate `gapProgram: string` not assignable to the const-union of legacy surfaces. Reporting sunset registry. FIX_LATER (owner: ADMIN-REPORTING-PLATFORM-ADOPTION). P2. Not POS read.
