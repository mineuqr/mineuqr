# COMMERCIAL AUDIT

Read-only inspection of the actual MineuQR implementation. No code was modified.

## Ownership chain (actual)

```
Commercial Catalog / Live Plan composition
        ↓
commercial_limit_values (limitKey = posTerminals)
        ↓
Subscription Runtime (resolveOwnerEntitlements)
        ↓
Live Plan entitlements + commercial lifecycle
        ↓
readLimitValue("posTerminals") → checkLimit()
        ↓
PosEntitlementService (derive Effective POS Entitlement)
        ↓
POS Terminal provisioning  |  PosAccessService operational gate
```

POS does **not** own catalog, projection, subscription, billing, or a second entitlement resolver.

## Traced surfaces

| # | Surface | Actual owner | POS consumption |
|---|---------|--------------|-----------------|
| 1 | Commercial Catalog | `server/services/commercial-catalog`, Live Plan composition | Limit values only |
| 2 | Capability registry | `shared/commercial-capability/registry.ts` | `posTerminals` is a **limit filter key**, not a projection feature |
| 3 | Limit registry | `LIVE_PLAN_LIMIT_KEYS` + optional `POS_TERMINALS_LIMIT_KEY` | Quantity |
| 4 | Live Plan | Bound snapshot / unbound live plan loader | `resolveOwnerEntitlements` |
| 5 | Plan identity | Catalog plan code + live plan UUID | Not re-resolved in POS |
| 6 | Subscription runtime | `server/subscription-runtime` | `checkLimit` / lifecycle |
| 7 | Entitlement resolver | `entitlementResolver.ts` | `readLimitValue("posTerminals")` |
| 8 | Capability matrix | `capabilityMatrix.ts` | `cap.limit.posTerminals` kind **limit** |
| 9 | `checkLimit` | `enforcement.ts` | Sole quantity authority |
| 10 | `requireFeature` | `enforcement.ts` | **Not** used by POS (no POS feature key) |
| 11 | Commercial projection | Projection IDs in `FEATURE_KEYS` | No `pos` / `cashier` projection ID |
| 12 | Expiration | `lifecycleEnablesEntitlements` | Disables features **and** zeros limits |
| 13 | Plan change | Current Live Plan (ADR-ARCH-034) | Quantity follows current plan |
| 14 | Feature gating | Canonical `requireFeature` | POS uses limit availability, not a feature flag |
| 15 | Limit gating | `checkLimit` | POS quantity + provisioning |
| 16 | POS Entitlement Service | `PosEntitlementService` | Derives `available` / `provisioningAllowed` |
| 17 | POS Terminal Service | `PosTerminalService` | `assertProvisioningAllowed` on consume-slot mutations |
| 18 | POS Access Service | `PosAccessService.evaluate` | `entitlement.available` before grants |
| 19 | PosAccessContext | `@shared/pos` | Authz context after commercial + permission |
| 20 | POS Router | `posRouter.ts` | Thin; gates live in services |
| 21–25 | Sale / Check / Settlement / Register-Shift / Drawer | Command services | `assertRestaurantPosScope` → `resolvePosTerminalAccess` |

## Audit question results

| Q | Topic | Result |
|---|--------|--------|
| 1 | POS commercial capability | **PASS / DOCUMENTED** — POS is a **limit** (`posTerminals`), not a `FEATURE_KEYS` capability. Intentional. |
| 2 | Terminal quantity | **PASS** — Live Plan → `checkLimit("posTerminals")`. No POS limit tables. |
| 3 | Terminal provisioning | **PASS** with **COMMERCIAL LIMIT CONCURRENCY GAP** (documented). |
| 4 | Mutation commercial boundary | **PASS** — operational commands share `PosAccessService`; provisioning uses `assertProvisioningAllowed`. |
| 5 | Subscription expiration | **PASS / EXISTING SEMANTICS** — lifecycle disables entitlements → cap 0 → `available=false`. |
| 6 | Plan change / downgrade | **EXISTING SEMANTICS DOCUMENTED** — block new provisioning; do not auto-delete; excess freeze not defined. |
| 7 | Fail-closed | **PASS** — missing/zero/unreadable → deny. No “missing means unlimited” for non-admin. |
| 8 | PLATFORM_OWNER | **PASS** — FULL_PLATFORM via owner hub; not a cashier shortcut. Tenant POS uses restaurant owner `userId`. |
| 9 | Owner / Admin / Cashier | **PASS** — owner/admin ≠ cashier. Explicit POS grants required. |
| 10 | Devices vs terminals | **PASS** — `devices` unsupported for POS quantity. |
| 11 | Persistence | **PASS** — production Drizzle stores; commercial still `checkLimit`. |
| 12 | Transactional safety | **PASS** — commercial gate is before Order persist; no POS outer transaction. |
| 13 | Financial boundary | **PASS** — no Order/Check/Settlement/CRMP financial mutation. |
| 14 | No billing | **PASS** — not implemented. SAFE TO DEFER. |
| 15 | No UI | **PASS** — documentation only. |

## What was not found

- POS subscription / billing / plan / entitlement tables
- POS-specific `requireFeature("pos")`
- `if (plan === "basic")` in POS
- `if (isOwner) return true` as a commercial grant
- `devices` used as POS quantity
- A second commercial resolver inside POS
