# IMPLEMENTATION

## Principle

AUDIT → STABILIZE → HARDEN → IMPLEMENT. No full rewrite. Reuse certified MineuQR authorities.

## What was implemented

1. **Live Plan limit key** `posTerminals` — optional recognized key. Required keys remain `restaurants`, `categories`, `items`.
2. **`readLimitValue` / `checkLimit`** — missing `posTerminals` fail-closes to `0`. ADMIN / `isAdmin` is unlimited unless the key is explicit.
3. **Ordering channel** `cashier_pos` — registered, `reportingVisible: false`, staff-assisted.
4. **POS Terminal domain** — logical identity, lifecycle, restaurant ownership, optional device association.
5. **Effective POS Entitlement resolver** — `PosEntitlementService.resolve` over `checkLimit`.
6. **Provisioning** — server-side `assertProvisioningAllowed` before register / reactivate / replace-of-unprovisioned.
7. **Cashier permission catalog** — namespace only. Owner role is not a cashier grant.
8. **POS router** — entitlement, terminal lifecycle, access.authorize. No financial APIs.
9. **Migration `0091_pos_terminals`** — local journal only. Not applied.

## Reused authorities

| Capability | Owner |
|------------|--------|
| Quantity | `commercial_limit_values` → `checkLimit` |
| Restaurant access | `assertRestaurantAccess` |
| Audit | `opsLog` |
| Channel registry | `orderingChannelRegistry` |
| Order / Check / Settlement / Register / Reporting | unchanged |

## Deviations from investigation wording

| Investigation note | Implementation |
|--------------------|----------------|
| Prefer adding `posTerminals` to `LIVE_PLAN_LIMIT_KEYS` | Kept required keys unchanged; `posTerminals` is optional via `isRecognizedLivePlanLimitKey` so the existing required-key test remains valid |
| Production seed of quantity | Deferred to `POS-DOMAIN-PRODUCTION-APPLY-1` |
| Check header OCC | Not required for Phase 1; documented follow-up |

## Runtime persistence

Phase 1 services use an in-memory terminal store. `pos_terminals` is the owned schema. Durable persist is authorized only after `0091` is applied by a separate Production Apply program.
