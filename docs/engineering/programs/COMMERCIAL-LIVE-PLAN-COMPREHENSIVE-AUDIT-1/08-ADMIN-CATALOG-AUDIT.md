# 08 — ADMIN CATALOG AUDIT

Admin edits the **canonical Live Plan family**, not a parallel commercial representation.

## Surface

Router: `server/api/commercialCatalog/commercialCatalogRouter.ts`  
Auth: `assertAdminAccess` (RBAC `role === "admin"`). **Not** `requireFeature`. Appropriate for platform ops; customer commercial mutations remain entitlement-gated elsewhere.

## Editable

| Field | Create | Update / `saveLivePlan` |
|-------|--------|-------------------------|
| `code` | Yes | **No** (immutable) |
| `name`, `description`, `sortOrder`, `isHidden` | Yes | Yes |
| Prices | Via `saveLivePlan` / `createPrice` | Yes — **current offer**, not historical Charged Terms |
| Capabilities / limits | Wizard + `saveLivePlan` | Yes — **immediate entitlement propagation** |
| Visibility | `isHidden` | Archive UI sets `true` |
| Ordering | `sortOrder` | Yes |
| Trial policy pointer | Yes | Yes |

## Validation

`validatePlanSave` / `planSaveValidator`. Atomic `saveLive` rolls back in-memory on persist failure.

## Audit

`commercialCatalogAudit.ts`: create/update ops events. Bind events emit `audit_events` COMMERCIAL category.

## Gaps (not implemented here)

- `createPlan` writes **in-memory only** — durable write requires `saveLivePlan`. Restart loses unsaved creates.
- No `deletePlan`.
- No dedicated unhide UI (API can set `isHidden: false` via save).
- Version/publish/retirement panels are stubs.

Classification: Admin Plan Editor = **A. Canonical** catalog mutation. `createPlan` durability = **P1 operational**.
