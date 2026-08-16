# API / SERVICE FORENSICS

## Composition pattern (actual)

Routers in `server/routers.ts` mount domain routers: `crmp`, `operationalDevice`, `order`, `session`, `reporting`, commercial catalog.

Pattern: Router → `assertRestaurantAccess` → commercial `requireFeature` / `checkLimit` → domain service → repository. Do not put POS rules in UI.

## Future POS APIs

Should live as a **new** `pos` router + `server/pos/` services, same as CRMP/operational-device. Do not hang POS lifecycle off `operationalDevice` or `crmp`.

| Existing API | Verdict |
|--------------|---------|
| `assertRestaurantAccess` | SAFE TO REUSE |
| `requireFeature` / `checkLimit` / `resolveOwnerEntitlements` | SAFE TO EXTEND (POS quantity) |
| `IdentityPlaceOrderService` | SAFE TO REUSE for future direct sale |
| `CheckService.settle*` | SAFE TO REUSE (initiate only) |
| `StaffCounterPickupSettlementService` | SAFE TO REUSE as collection pattern |
| `order.settlePaid` (public token) | UNSAFE as POS access (wrong auth) |
| `operationalDevice.*` | UNSAFE as POS Terminal API |
| `crmp.*` | SAFE as Register boundary; UNSAFE as terminal CRUD |
| `session.markPaid` / close | Session management (`sessionTableManagement`); not POS Terminal |

Tenant: never trust client restaurantId / terminalId / entitlement quantity — resolve server-side (same as capability gating).

Errors: TRPC `FORBIDDEN` + existing commercial entitlement codes. Do not invent a second error taxonomy.
