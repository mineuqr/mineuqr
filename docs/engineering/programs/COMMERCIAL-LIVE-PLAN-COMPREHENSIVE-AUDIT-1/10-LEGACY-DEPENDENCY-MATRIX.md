# 10 — LEGACY DEPENDENCY MATRIX

Do not delete anything in this program.

## `subscription_plans`

| Aspect | Finding |
|--------|---------|
| Production | Exists; ids 30001–30003; `isActive` 1; **0 FKs** |
| Runtime commercial authority | **None** — `getSubscriptionPlanById` has no production callers |
| Classification | **C. Historical** table + **G. Dead** ORM helpers |
| Removable? | SAFE DELETE still blocked (separate program). Not required for Live Plan correctness. |
| Blocker | Explicit AA SAFE DELETE gate; leftover scripts/tests/docs |

## `legacyPlanId` (bindings column)

| Aspect | Finding |
|--------|---------|
| Production | 2 rows non-null |
| New writers | `legacyPlanId: null` |
| Runtime | Not used as checkout/entitlement/MRR authority |
| Classification | **D. Compatibility** / historical column |
| Removable? | OD-4 blocked (no verified backup / unauthorized DDL) |

## `LEGACY_PLAN_BRIDGE`

| Consumer | Class | Why it remains | Blocker |
|----------|-------|----------------|---------|
| Webhook integer READ | **D. Compatibility** | In-flight PayPal/Tap integer metadata **UNKNOWN** | COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1 **BLOCKED** |
| Public DTO `legacyPlanId` | **D. Compatibility** | Presentation | Cosmetic; not a retire blocker for catalog SSOT |
| Bootstrap by code | **E. Operational** | Aligns seed codes to leftover integers | Can stay until SAFE DELETE |
| Display-by-legacy | **D. Compatibility** | Email/display | Webhook dual-read |

## `PLAN_ID_TO_CATALOG_PLAN`

Client `isCanonicalCurrentPlan(number)` helper. Pricing page uses **code** path. Classification: **D. Compatibility** (client). Not webhook/checkout/MRR.

## `parseWebhookPlanRef` / `resolveCanonicalLivePlanId`

**D. Compatibility.** External boundary: see `docs/engineering/programs/COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1/`. New writes = UUID. Integer read retained.

## `planFeatureMatrix`

**H. Incorrect architecture** as entitlement catalog for **no-subscription** users. Not `subscription_plans`, but a second capability matrix.

## Explicit verification

**`subscription_plans` has NO production commercial runtime authority.**
