# COMMERCIAL ENTITLEMENT FORENSICS

## Authoritative path (actual)

```
user_subscriptions.planId
  → commercial_plans (Live Plan UUID)
  → featureBundleId → commercial_bundle_features (included=true)
  → limitProfileId → commercial_limit_values
  → resolveOwnerEntitlements / getCommercialEntitlements
  → requireFeature | checkLimit
```

Evidence: `server/subscription-runtime/entitlementResolver.ts`, `snapshotLoader.ts`, `enforcement.ts`, `shared/commercial-catalog/contracts/livePlanLimits.ts`.

Plan identity: Live Plan UUID on `user_subscriptions.planId` (OD-2/OD-3). Charged Terms are historical paid commitment — **not** capability/limit authority (ADR-ARCH-034/035).

## Features vs quantities

| Kind | SSOT | Runtime |
|------|------|---------|
| Boolean capability | `commercial_bundle_features` + Projection IDs | `requireFeature` / `hasFeature` |
| Quantity | `LIVE_PLAN_LIMIT_KEYS` = `restaurants`, `categories`, `items` | `checkLimit` → `readLimitValue` |

`CommercialLimits` (`src/lib/commercial/types.ts`) has only those three keys.

`COMMERCIAL_LIMIT_FILTER_KEYS` also lists `ordersPerMonth`, `qrCodes`, `storage`, `images`, `staffAccounts`, `branches`, `devices` — **orphaned** at runtime (`LIMIT-AUDIT.md`). `checkLimit` returns `limit_key_unsupported` / denied for keys not on the DTO (`enforcement.ts`).

## Can Included POS Quantity use this system?

**Yes — by extending the existing limit vocabulary**, not by creating a second entitlement system.

Required later (implementation, not this program):

1. Add a canonical limit key (recommended: `posTerminals`) to `LIVE_PLAN_LIMIT_KEYS` **or** teach `readLimitValue` / `CommercialLimits` to read an optional extra key from `commercial_limit_values`.
2. Seed existing Live Plan bundles with a preservation quantity (same Always-On discipline as capability gating — do **not** invent Basic=1 / Pro=2 packaging here).
3. Fail-closed if the key is missing (`checkLimit` already denies unknown keys).

Capability gating and quantity **must remain separate**. POS availability = included quantity > 0 (or unlimited `null`). Do not overload `devices`.

## Future POS Add-ons

Effective entitlement = Live Plan included quantity + future add-on increments. Add-ons are **not** implemented. The limit-sum model fits `checkLimit(proposedTotal)` without rewrite if add-ons later write additional entitled quantity into the same resolver (follow-up commercial program). Do not put add-on billing in POS.

## Subscription / plan change

Entitlements follow **current** Live Plan (ADR-ARCH-034). Downgrade that lowers `posTerminals` must fail-closed new provisioning; existing terminals need an explicit policy (deactivate excess vs grandfather). **NOT ESTABLISHED** in code today — no POS terminals exist. Document in implementation; do not mutate Charged Terms / MRR.
