# LIVE-PLAN-IDENTITY-ASSESSMENT

## Schema (`commercial_plans`)

| Property | Evidence |
|----------|----------|
| Primary key | `id` varchar(36) |
| Stability of PK | Generated at create (`newCommercialId`). Bootstrap is idempotent by **code**, not id. Clean reset → new UUIDs. |
| Unique business key | `code` unique (`basic` / `professional` / `enterprise`) |
| Tenant ownership | Platform catalog (not per-restaurant) |
| Public exposure | `PublicCatalogOffering.planId` is the UUID; `legacyPlanId` is the integer |
| Deletion / archive | `isHidden`; no soft-delete id recycle proven |
| Suitable as subscription FK? | **Conditionally.** Bindings already store this UUID. Suitable for the life of a catalog deployment. **Not** stable across catalog wipe. `code` is more stable. |

## STOP condition 1

“Live Plan canonical identity is not stable enough” is **partially true for UUID**, **false for code**.

Architecture Authority must choose the subscription reference:

- **A.** `commercial_plans.id` (UUID) — matches bindings today
- **B.** `commercial_plans.code` — more stable, not the PK

This program does not invent a third id.
