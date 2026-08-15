# ENTITLEMENT-DEPENDENCY.md

**Entitlements are already consolidated.**

Capabilities and limits resolve from Live Plan via `resolveOwnerEntitlements` / `getCommercialEntitlements`. `subscriptionPlanLimits.ts` does not read `subscription_plans.max*`.

`legacyPlanId` is only an in-memory bridge key for catalog plan code.

Server `CanUse` / `requireFeature` remains authoritative. Only `ordering` and `devices` are fully enforced. This program does **not** expand enforcement.

Residual: CRS unbound **display name** may still read the legacy table. Not entitlement authority.
