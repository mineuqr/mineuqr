# REGISTER-CATALOG-MANAGEMENT-1 — Final Certification

| Field | Value |
|---|---|
| **Program** | REGISTER-CATALOG-MANAGEMENT-1 |
| **Date** | 2026-07-24 |
| **Status** | **CERTIFIED** (implementation + tests). Production migration `0080` authored; production apply is a separate deploy program. |

---

## 1. Executive Summary

Register Catalog Platform is implemented. Registers are provisioned with restaurant-scoped code, display name, type, and catalog lifecycle (`provisioned | active | inactive`), independent of Duty (`closed | open | suspended`). Manager UI and thin `crmp.catalog.*` APIs expose catalog commands/queries. Register Operations empty-state “إنشاء صندوق” navigates to Catalog creation. No Financial Shift, Settlement, Check, or Reporting ownership changes.

## 2. Gap Analysis

See [GAP-ANALYSIS.md](./GAP-ANALYSIS.md). Gaps closed: code, type, rename/update/changeType/archive, catalog events, catalog API, Manager Catalog UI, Ops empty-state integration.

## 3. Catalog Lifecycle

| Transition | Rule |
|---|---|
| → provisioned | Create / provision |
| provisioned → active | Activate |
| active → inactive | Deactivate (Duty closed; no active Shift) |
| inactive → active | Reactivate |
| * → archivedAt | Soft archive (status → inactive + `archivedAt`; no new catalog enum) |
| Destructive delete | Forbidden |

Duty requires catalog `active`. Planes remain independent.

## 4. Aggregate Changes

`CashRegister` additive fields: `code`, `registerType`, `archivedAt`. Identity: deterministic `reg_{restaurantId}_{codeLower}` (override allowed). Unique code per restaurant (case-insensitive in domain; unique index in DB).

Migration: `drizzle/0080_crmp_register_catalog.sql` (additive). Governance production terminus remains `0079` until a production-migration program applies `0080`.

## 5. API Inventory

| Surface | Purpose |
|---|---|
| `crmp.catalog.create` | Provision |
| `crmp.catalog.update` | Code / name / type |
| `crmp.catalog.activate` | Catalog activate |
| `crmp.catalog.deactivate` | Catalog deactivate |
| `crmp.catalog.rename` | Rename |
| `crmp.catalog.changeType` | Type change |
| `crmp.catalog.archive` | Soft archive |
| `crmp.catalog.get` / `list` / `listByRestaurant` / `search` | Queries |
| `crmp.register.*` | Unchanged Duty / operator / device |

Auth: `verifiedProcedure` + `assertRestaurantAccess`. No domain rules in router.

## 6. UI Inventory

| Surface | Notes |
|---|---|
| Dashboard tab `register-catalog` | Create / edit / activate / deactivate / archive / search / filter |
| Navigate to Register Ops | Presentation link only |
| Register Ops empty CTA | Enabled → Catalog `?create=1`; disabled + explanation if `canManageCatalog=false` |
| No Duty controls on Catalog page | Enforced |

## 7. Event Matrix

| Event | When |
|---|---|
| `RegisterProvisioned` | Create |
| `RegisterActivated` | Activate |
| `RegisterDeactivated` | Deactivate |
| `RegisterRenamed` | Rename |
| `RegisterTypeChanged` | changeType |
| `RegisterArchived` | Archive |

Idempotency via `claimKey = registerId:eventType:v{version}`. Collected facts only (no bus).

## 8. Regression Results

| Area | Result |
|---|---|
| CRMP Duty / Ops API | Pass |
| Financial Shift | Pass |
| Settlement Context | Pass |
| Settlement Attribution | Pass |
| Architecture guards | Pass (0080 additive) |
| Register Ops presentation | Pass (Catalog handoff) |

No ownership or financial behavior changes.

## 9. Test Results

Targeted suites (catalog + CRMP regression): **all green** including:

- `shared/crmp/__tests__/registerCatalogLifecycle.test.ts`
- `server/crmp/api/__tests__/crmpCatalogApi.test.ts`
- Register / Shift / Settlement Context / Ops / Catalog presentation guards

## 10. Production Readiness

| Item | Status |
|---|---|
| Domain + service | Ready |
| Thin API | Ready |
| Manager UI | Ready |
| Migration authored | `0080_crmp_register_catalog` |
| Production migrate | **Not applied by this program** (same pattern as 0079 implementation) |
| Governance terminus | Remains `0079_crmp_register_duty` until production migrate cert |

## 11. Final Certification

**REGISTER-CATALOG-MANAGEMENT-1 is CERTIFIED** for implementation.

Catalog Lifecycle remains independent from Duty Lifecycle. Register creation is available through Manager UI. Register Operations consumes provisioned Registers. APIs remain thin; UI remains presentation-only. No Settlement / Reporting / Financial Shift redesign.

STOP conditions: none triggered.
