# 02 — LEGACY IDENTITY MATRIX

Integer leftover identity is **not** canonical. After OD-2 it is a compatibility handle that must resolve to `commercial_plans.id` UUID before persist.

Occurrence kinds: **canonical** | **compatibility** | **temporary migration bridge** | **test fixture** | **documentation** | **dead code**

## 1. Canonical (for contrast)

| Artifact | Kind | Notes |
|----------|------|-------|
| `commercial_plans.id` UUID | canonical | Internal plan identity |
| `commercial_plans.code` | canonical business key | `basic` / `professional` / `enterprise` |
| `user_subscriptions.planId` varchar(36) | canonical storage | UUID after 0088 |
| `commercial_subscription_bindings.planId` varchar(36) | canonical binding | UUID |

## 2. `legacyPlanId`

| Location | Kind | Role | Removable now? |
|----------|------|------|----------------|
| `commercial_subscription_bindings.legacyPlanId` int NULL | compatibility | Stores the integer handle used at bind time | NO — schema + bind writers |
| `ensureLivePlanBoundForSubscription({ legacyPlanId })` | compatibility | Resolves Live Plan UUID via bridge, then writes binding | NO |
| `bindSubscriptionToLivePlan` | compatibility | Persists both UUID `planId` and integer `legacyPlanId` | NO |
| `listLivePlanOfferings` / public catalog DTO | compatibility | Exposes `legacyPlanId` for Pricing / listPlans | NO — OD-3 |
| `listPlansForSelectionLegacyShape` | compatibility | Returns `id: o.legacyPlanId` to public `listPlans` | NO — OD-3 |
| `resolveTrialPolicyFromCatalog` | compatibility | Returns `legacyPlanId` from bridge (professional = 30002) | NO — trial program |
| `resolveLegacyPlanIdFromPlan(uuid)` | compatibility | Reverse map UUID → integer via plan code + bridge | NO |
| `resolveLivePlanDisplayByLegacyId` | compatibility | Display names; `id` field is still the integer | NO — OD-3 |
| `snapshotLoader` / `entitlementResolver` | compatibility | Fallback catalog key if code missing | NO — OD-4 |
| `subscriptionRuntimeService` | compatibility | Passes binding `legacyPlanId` into resolver; unbound uses digit-string parse | NO — OD-4 |
| `platform-owner-access/entitlements.ts` | compatibility | Sets `legacyPlanId: null` on owner mode | keep |
| Client `Pricing.tsx` | compatibility | Checkout mutation uses `offering.legacyPlanId` | NO — OD-3 |
| Client Customer Success | compatibility | `parseInt(subPlanId)` into admin `planId: z.number()` | NO — OD-3 |

**Classification of column `bindings.legacyPlanId`:**

- required compatibility
- internally required for current bind/unbound/display
- not externally required by payment providers as *their* identity
- removable only after another cutover (OD-3 + OD-4, then schema migration)

Not redundant today: `ensureLivePlanBoundForSubscription` still *takes* an integer and writes it.

## 3. `LEGACY_PLAN_BRIDGE`

**File:** `server/services/commercial-catalog/legacyPlanBridge.ts`

| legacyPlanId | catalogPlanCode | catalogPlanKey |
|-------------:|-----------------|----------------|
| 30001 | basic | BASIC |
| 30002 | professional | PROFESSIONAL |
| 30003 | enterprise | ENTERPRISE |

| Consumer | Kind | Why it still runs |
|----------|------|-------------------|
| `resolveCanonicalLivePlanId` | compatibility + runtime | Checkout/admin/trial/webhook integer → UUID |
| `resolvePlanIdFromLegacyPlanId` | compatibility + runtime | Bridge code → `planService.getByCode` → UUID |
| `resolveCheckoutOfferFromLivePlan` | compatibility + runtime | Price from Live Plan; handle is integer |
| `isKnownLegacyPlanId` | compatibility | PayPal webhook reject unknown integers |
| `listPlansForSelectionLegacyShape` | compatibility | Public integer `id` |
| `persistentCatalogBootstrap` | temporary migration bridge / bootstrap | Seeds Live Plans *by bridge codes* (does not read leftover table) |
| `entitlementResolver.catalogPlanFromCode` | compatibility | Fallback `bridgeByLegacyPlanId` |
| `legacyPlanCommercialTerms.ts` | documentation/comment + terms helper | Comments only as bridge alignment |
| `shared/commercial-projection/legacyRetirement.ts` | documentation | Already marked KEEP_TEMPORARILY |
| 0088 safety tests | test fixture / regression | Mapping must stay aligned with 30001–30003 |

**Kind:** compatibility + temporary migration bridge. **Not dead.** **Not canonical.**

Removing it now would break checkout, admin bind, trial fallback, webhook activation bind, public `listPlans` integer ids, and catalog bootstrap alignment.

## 4. `PLAN_ID_TO_CATALOG_PLAN`

**File:** `src/lib/commercial/planIdMapping.ts`

```
30001 → BASIC
30002 → PROFESSIONAL
30003 → ENTERPRISE
```

| Consumer | Kind | After OD-2 |
|----------|------|------------|
| `buildCommercialContext` (`commercialContext.ts`) | compatibility | Parses `planId` if number or digit-string; UUID rows return `null` here |
| `buildCommercialContextFromDb` | compatibility | First tries integer map; if UUID, uses `planService.get` + `bridgeByCatalogPlanCode` |
| Unbound entitlement path | compatibility | `subscriptionRuntimeService` → `buildCommercialContextFromDb` when no binding |
| `planIdMapping.test.ts` | test fixture | Contract of the map |

**Kind:** compatibility. Duplicate of `LEGACY_PLAN_BRIDGE` keys. Still reached for leftover digit-string `planId` values. Production `user_subscriptions.planId` is 7/7 UUID, so the integer branch is **not** the live Production storage path. It remains the unbound *code* path if a digit-string ever appears, and the shared builder still contains it.

Not removable now (OD-4).

## 5. Integer literals `30001` / `30002` / `30003`

| Location | Kind |
|----------|------|
| `legacyPlanBridge.ts` | compatibility (normative bridge) |
| `planIdMapping.ts` | compatibility (duplicate map) |
| `create-trial-subscription.ts` `resolveCanonicalLivePlanId(30002)` | compatibility fallback handle — **not persisted** |
| `subscriptionEntitlement.ts` `BASIC_FREE_PLAN_ID = 30001` | dead code (no production caller of `resolveTableOrderingEntitlement`) |
| 0088 SQL CASE / validation lib | temporary migration bridge (already applied; file remains history) |
| Tests / fixtures | test fixture |
| Docs / prior programs | documentation |

Trial does **not** persist `30002`. It persists the UUID from catalog policy or from `resolveCanonicalLivePlanId(30002)`.

## 6. `planId: number` / `z.number()` / `plan_id`

| Location | Kind | Public contract? |
|----------|------|------------------|
| `subscription.createCheckoutSession` `planId: z.number()` | compatibility | YES — customer checkout |
| `subscription.createTapCheckout` `planId: z.number()` | compatibility | YES |
| `admin.createUserSubscriptionByAdmin` `planId: z.number()` | compatibility | YES — admin |
| `admin.updateUserSubscriptionByAdmin` `planId: z.number().optional()` | compatibility | YES — admin |
| Deprecated restaurant-scoped admin inputs | compatibility / retired | still in schema; mutations throw retired |
| `listPlans` response `id` = leftover integer | compatibility | YES |
| PayPal `custom_id.planId` | compatibility | provider metadata of **our** handle |
| Tap `metadata.plan_id` | compatibility | provider metadata of **our** handle |
| `Pricing.tsx` `planId: number` | compatibility | client of public contract |
| Customer Success `parseInt` | compatibility | client of admin contract |

Internal persist after these inputs: **UUID**.

## 7. `user_subscriptions.planId` integer assumptions (post OD-2)

| Pattern | Remaining? | Class |
|---------|------------|-------|
| Schema `int` | NO — `varchar(36)` | canonical UUID |
| Production values integer | NO — 7/7 UUID (this program's SELECT) | proven |
| Runtime persist integer | NO — writers call `resolveCanonicalLivePlanId` | compatibility at edge only |
| `z.number()` on public/admin | YES | compatibility (OD-3) |
| Digit-string parse in `buildCommercialContext*` | YES | compatibility fallback |
| `typeof canonical.planId === "number"` in runtime service | YES | defensive leftover; Production type is string |
| Integer join to `subscription_plans` in app | NO | — |
| Stale audit script join | YES | script only, broken |

No runtime path still **assumes** stored `planId` is integer for persist. Display/admin stats may *project* an integer via `resolveLegacyPlanIdFromPlan`.

## 8. `listPlans`

`subscription.listPlans` → `listPlansForSelectionLegacyShape()`:

- Reads Live Plan offerings
- Filters those with `legacyPlanId != null` (from bridge)
- Returns leftover-shaped DTO with `id: legacyPlanId` **and** `catalogPlanId: plan.id` (UUID)

If no offering has a bridge integer, it returns `{ source: "legacy_required" }` and the router returns `[]`.

**Kind:** public compatibility contract. Requires OD-3 to change.

## 9. Webhook integer metadata

| Provider field | What it is | What it is not |
|----------------|------------|----------------|
| PayPal `custom_id` `{ userId, planId }` | MineuQR compatibility handle (integer from checkout input) | Not PayPal's plan identity; not transaction id (`resource.id` is) |
| Tap `metadata.plan_id` | MineuQR compatibility handle | Not Tap charge id (`body.id` / retrieve) |
| Both | Resolved via `resolveCanonicalLivePlanId` then persisted as UUID | Not leftover-table lookup |

**Kind:** compatibility. Removal requires OD-3 (stop sending integers) then a webhook contract program. Do not change payloads in this program.

## 10. Trial integer

| Step | Value |
|------|-------|
| Policy | Live Plan professional UUID from catalog |
| Fallback handle | `resolveCanonicalLivePlanId(30002)` |
| Persisted `user_subscriptions.planId` | UUID |
| Bind `legacyPlanId` | `resolveLegacyPlanIdFromPlan(uuid)` → typically 30002 |

**Kind:** compatibility handle, not stored identity. Future: Trial policy → Live Plan UUID only (separate program; not this one).
