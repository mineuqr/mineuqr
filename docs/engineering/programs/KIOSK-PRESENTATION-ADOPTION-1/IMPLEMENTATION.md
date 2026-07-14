# KIOSK-PRESENTATION-ADOPTION-1 — Implementation
## Engineering / Certification Report

**Program:** KIOSK-PRESENTATION-ADOPTION-1  
**Type:** Presentation Adoption (UI + Business Identity Presentation)  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED**

---

## 1. Root Cause

- Special Offers were present in browse runtime but not rendered by `KioskBrowseStage`.
- Business Identity sequences were business-day-only; table and kiosk shared one counter and `NNN` display form.
- Kiosk station binding could surface technical `dev_*` identifiers to customers.

---

## 2. Architecture Validation

See `ARCHITECTURE.md`. Ordering Platform / Runtime / Projection ownership unchanged. Business Identity remains the sole owner of display identity generation. Operational cards continue to consume `presentation.identity.displayReference`.

---

## 3. Files Modified

### Special Offers (presentation)

| File | Change |
|------|--------|
| `client/src/pages/kiosk/KioskBrowseStage.tsx` | Wire `browse.offers` + shared offer UI |
| `client/src/components/menu/OffersTabPanel.tsx` | Optional `canAddToCart` for kiosk |

### Device / kiosk labels (presentation)

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/kiosk/kioskPresentationLabels.ts` | `طلب ذاتي` / Self-Order; station scope `kiosk` |
| `client/src/lib/ordering-client/kiosk/kioskStationIdentity.ts` | Customer-facing fulfilment label |
| `client/src/components/operational-screen/roles/KioskRolePresentation.tsx` | Station scope ≠ deviceId |
| `client/src/pages/kiosk/KioskCheckoutStage.tsx` | Render customer-facing label |

### Business Identity (scope + format)

| File | Change |
|------|--------|
| `resolveBusinessIdentityScope.ts` | TABLE / KIOSK from fulfilment stamps |
| `DisplayReferenceFormatter.ts` | `T #001` / `K #001` |
| `OrderDisplayIdentityResolver.ts` | Pass-through scope |
| `DrizzleBusinessIdentityAllocator.ts` | Sequences keyed by day + scope |
| `DrizzleOrderRepository.ts` | Pass fulfilment into allocate |
| Read mappers / stores / materializer | Persist & resolve `identityScope` |
| `drizzle/0066_order_business_identity_scope.sql` | Schema + sequence rebuild |
| `drizzle/schema.ts` + journal | Model + lineage |

### Operational presentation hygiene

| File | Change |
|------|--------|
| `orderDisplayIdentity.ts` | Render resolver string as-is; no local `T`/`K` assembly |
| Architecture / unit tests | Expect scoped display references |

---

## 4. Business Identity Changes

- Sequence table PK: `(restaurant_id, business_day, identity_scope)`.
- Orders / read projections store `identityScope`.
- Backfill existing assigned rows → `TABLE`.
- Unique display constraint includes scope.
- Hot path and historic `ensureAssigned` both scope-aware.

Migration: `0066_order_business_identity_scope` (journalized; apply on target DB via governed migrate).

---

## 5. Presentation Changes

- Kiosk Special Offers use QR shared components.
- No user-facing kiosk UI renders `dev_*`; shows **طلب ذاتي** where appropriate.
- Staff headings render Business Identity `displayReference` (`T #…` / `K #…`) without prefix rewriting.

---

## 6. Regression Analysis

| Area | Impact |
|------|--------|
| Order Aggregate | None |
| Ordering Runtime materializer ownership | None (identity ensure + projection pass-through only) |
| Projection architecture | Additive `identityScope` column |
| Read Model ownership | Unchanged; fields mapped through |
| Operational DTO ownership | Additive `identityScope`; cards still use `displayReference` |
| Session Platform | None |
| QR table path | Continues on TABLE scope (`T #…`) |

---

## 7. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Special Offers on Self Ordering Kiosk | **PASS** (shared path adopted) |
| No user-facing `dev_*` | **PASS** |
| Kiosk shows طلب ذاتي | **PASS** |
| Channel-scoped Business Identity | **PASS** |
| Table → `T #001` | **PASS** (formatter + resolver) |
| Kiosk → `K #001` | **PASS** (formatter + resolver + allocate scope) |
| Sequences restart per Business Day per scope | **PASS** (allocator + schema) |
| Kiosk screen identity ≠ order identity | **PASS** |
| Ops cards use `presentation.identity.displayReference` | **PASS** (guards retained) |
| No parallel numbering system | **PASS** |
| No Runtime / Projection / Read ownership regression | **PASS** |

---

## 8. Test / Build Gate

| Gate | Result |
|------|--------|
| Business Identity + presentation scoped vitest | **56/56 PASS** (pre-migrate) / **55/55 PASS** (post-migrate guards) |
| Kiosk / kitchen / print related vitest | **18/18 PASS** |
| `pnpm db:governance-check` | **OK** (tail `0066_order_business_identity_scope`, 67 entries) |
| `pnpm db:migrate` → `0066` | **APPLIED** |
| `pnpm db:preflight` (post) | **PASS** — all journal hashes in DB |
| `pnpm db:verify-schema` | **PASS** |
| Data integrity (267 orders) | **PASS** — 0 missing scope; display numbers preserved |
| `vite build` | **PASS** |

Migration details: `MIGRATION-CERTIFICATION.md`.

---

## 9. Certification

**CERTIFIED** — Presentation layer adopts existing Business Identity architecture with channel scope (`TABLE` / `KIOSK`). No parallel identity logic in presentation. Special Offers and kiosk device labels adopted without Ordering Platform redesign.

**Migration CERTIFIED** — `0066_order_business_identity_scope` applied via official `pnpm db:migrate`, journaled, schema-verified, and data-validated. See `MIGRATION-CERTIFICATION.md`.
