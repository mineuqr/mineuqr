# 05 — SUBSCRIPTION DEPENDENCY

## Storage

`user_subscriptions.planId` varchar(36) NOT NULL = `commercial_plans.id`.

Production: 6 rows, **all UUID**, 0 orphans, join:

| code | n |
|------|---|
| professional | 3 |
| enterprise | 2 |
| basic | 1 |

Status: active 5, expired 1.

## Who owns plan identity

- **Subscription** owns the **reference** (which Live Plan this lifecycle row points at) plus status/period/provider ids.
- **Catalog** owns what that UUID **means** (name, composition, current offer).
- Subscription does **not** snapshot Offer List Price onto `user_subscriptions`.

## Resolution places

| Path | Resolver |
|------|----------|
| Checkout write | UUID already |
| Trial | `resolveTrialPolicyFromCatalog` → professional UUID |
| Admin create/update | `livePlanUuidInput` then `resolveCanonicalLivePlanId` (UUID branch in practice) |
| Webhook | dual-read → persist UUID |
| Entitlements bound | `loadBoundLivePlan` → `bindings.planId` |
| Entitlements unbound | `resolveLivePlanCapabilitiesByPlanId(user_subscriptions.planId)` if UUID |
| Display / invoice name | `resolveLivePlanDisplayByPlanRef` |
| CRS / MRR planCode | Live Plan code via entitlements / join |

## Plan edits vs existing subscriptions

- Name/capabilities/limits: **live** — next entitlement resolve sees new composition.
- Offer List Price edit: does **not** rewrite Charged Terms unless a **re-bind** event runs (`bindSubscriptionToLivePlan` overwrites from current catalog).
- Hide: existing UUID still resolves for entitlements; new checkout/public catalog excludes.

## Historical contract protection

Charged Terms are **not** on the subscription row. Protection exists only if a binding row is complete. Production: **2 bindings / 6 subscriptions** — four rows have **no** Charged Terms snapshot.

## Classification

Subscription → Live Plan reference: **Canonical**.  
Unbound majority in Production: **Operational gap** (Charged Terms / MRR coverage), not identity corruption.
