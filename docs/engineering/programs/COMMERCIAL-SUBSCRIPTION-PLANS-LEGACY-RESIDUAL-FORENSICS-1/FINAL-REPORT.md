# FINAL REPORT — COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-FORENSICS-1

## A. STATUS

LEGACY RESIDUAL FORENSICS — **COMPLETE**

Investigation only. No implementation. No cleanup. No DROP. No API change. No trial/webhook change. No OD-3. No OD-4. No deploy. No commit. No push.

HEAD at investigation start: `9f825ce1`. Working tree was clean. This program added uncommitted documentation only.

## B. subscription_plans

| Class | Finding |
|-------|---------|
| Runtime reads | **NONE** in production commercial paths |
| Runtime writes | **NONE** in production app. Ops seed `server/seed-plans.mjs` can write (deprecated emergency) |
| ORM only | `drizzle/schema.ts` table + types; `server/db.ts` `getSubscriptionPlans` / `getSubscriptionPlanById` / `createSubscriptionPlan` (unreachable) |
| Seeds | `server/seed-plans.mjs` DELETE+INSERT leftover catalog |
| Scripts | Reset KEEP/inventory; stale audit S5 JOIN; historical probes |
| Tests | Guards forbid leftover reads; many files still **mock** leftover helpers |
| Historical | Migrations 0000–0006 created/altered the table; later migrations do not touch it |
| Dead | ORM helpers have zero production callers |

Production leftover rows: **3** unused catalog ids (`30001`–`30003`). Not customer contracts.

## C. LEGACY IDENTITY

| Artifact | Classification |
|----------|----------------|
| `legacyPlanId` | Required compatibility (bindings column + bind input + public DTO). Not canonical. |
| `LEGACY_PLAN_BRIDGE` | Runtime-required compatibility / temporary bridge. Not dead. |
| `PLAN_ID_TO_CATALOG_PLAN` | Compatibility duplicate map for CommercialContext / unbound fallback. |
| integer public `planId` | Public/admin/checkout/webhook contract. Resolved to UUID before persist. |

## D. CURRENT CANONICAL IDENTITY

`commercial_plans.id` = UUID

**PASS**

Business key remains `commercial_plans.code`. Confirmed in schema, writers, Production join (7/7 subscriptions match a Live Plan code).

## E. user_subscriptions

| Field | Value |
|-------|-------|
| `planId` type | `varchar(36) NOT NULL` |
| Canonical UUID | **YES** — Production 7/7 UUID, 0 integer, 0 NULL |
| Legacy integer runtime **storage** dependency | **NONE** |
| Legacy integer **ingress** | YES — `z.number()` then `resolveCanonicalLivePlanId` |

## F. BINDINGS

| Field | Value |
|-------|-------|
| `planId` | Live Plan UUID (2/2 Production) |
| `legacyPlanId` | Populated compatibility (30001 ×1, 30003 ×1) |
| Remaining necessity | Required for current bind API and resolver fallback. Removable only after OD-3 + OD-4 + schema migration. |
| Disagreement vs subscription UUID | 0 |

## G. CHECKOUT

| Question | Answer |
|----------|--------|
| Integer handle | YES — `createCheckoutSession` / `createTapCheckout` `planId: z.number()`; Pricing uses `offering.legacyPlanId` |
| Internal identity | Live Plan UUID via `resolveCheckoutOfferFromLivePlan` → Offer List Price |
| Actual leftover-table dependency | **NO** |
| OD-3 dependency | YES — public integer cannot be removed without OD-3 |

## H. WEBHOOKS

| Question | Answer |
|----------|--------|
| Integer metadata | PayPal `custom_id.planId`; Tap `metadata.plan_id` |
| Purpose | MineuQR compatibility handle, not provider plan identity, not transaction id |
| Persist | UUID via `resolveCanonicalLivePlanId` |
| Bind | integer `legacyPlanId` |
| Future removal prerequisite | OD-3 dual-read, then stop sending integer |

## I. TRIAL

| Question | Answer |
|----------|--------|
| Integer dependency | Fallback handle `30002` only; **not persisted** |
| Persisted identity | Live Plan UUID (`resolveTrialPlanId`) |
| Bind | reverse-bridge `legacyPlanId` |
| Future UUID path | Trial policy → Live Plan UUID → `user_subscriptions.planId` (already the persist path) |
| Required program | OD-3/OD-4 to drop fallback handle and bind integer |

## J. MRR / FINANCIAL

| Dependency | Status |
|------------|--------|
| `subscription_plans` price | **NONE** at runtime. `monthlyEquivalentPlanPrice` deleted; guards forbid reintroduction |
| Charged Terms | **YES** — invoice historical amount and MRR |
| MRR | Charged Terms monthly equivalent only |
| Checkout price | Live Plan Offer List Price (not leftover table) |

Do not move historical contract values into Live Plans.

## K. ENTITLEMENTS

| Question | Answer |
|----------|--------|
| Legacy leftover-table dependency | **NONE** |
| Live Plan authority | **YES** — `getCommercialEntitlements` → `resolveOwnerEntitlements` → bound Live Plan capabilities/limits |
| Remaining leftover **bridge** | Unbound path uses `PLAN_ID_TO_CATALOG_PLAN` / `LEGACY_PLAN_BRIDGE`, not `subscription_plans` |
| `BASIC_FREE_PLAN_ID` / table-ordering helper | Dead at production (test-only) |

## L. PRODUCTION

Queried 2026-08-15T12:51:39.467Z. Target: tidbcloud_prod / `mineuqr` / TLS / 4000.

| Item | State |
|------|-------|
| `subscription_plans` | exists; 3 leftover catalog rows; no FKs |
| UUID identity | `user_subscriptions.planId` varchar(36); 7/7 UUID; join Live Plan 7/7 |
| Legacy residue | leftover table + `bindings.legacyPlanId` on 2 rows |
| Journal | 0088 terminus `6084102` / hash prefix `0836fac35ca3515d` |
| Mutation performed | **NONE** |

## M. SAFE DELETE MATRIX

| Artifact | Runtime? | Compatibility? | Historical? | Removable Now? | Blocker |
|----------|----------|----------------|-------------|----------------|---------|
| `subscription_plans` | No (app) | No (table unused by APIs) | Yes (3 catalog rows + migrations) | **NO** | Schema/ops/AA; new migration |
| `subscription_plans` ORM | Helpers unreachable | Types still exported | Schema history | **NO** | Drizzle sync + test mocks |
| `subscription_plans` seeds | Ops only | Emergency repair | Yes | **NO** | `seed-plans.mjs` + reset KEEP |
| `subscription_plans` reset scripts | Ops only | KEEP/inventory | Yes | **NO** | clean-db-2, epoch reset, stale S5 |
| `legacyPlanId` (concept) | Yes (bind/display) | Yes | — | **NO** | Public + bind contract |
| `LEGACY_PLAN_BRIDGE` | Yes | Yes | Bootstrap alignment | **NO** | Resolver / checkout / trial / listPlans |
| `PLAN_ID_TO_CATALOG_PLAN` | Unbound fallback | Yes | — | **NO** | CommercialContext |
| `bindings.legacyPlanId` | Written/read | Yes | Populated in Prod | **NO** | Bind writers + schema |
| public integer `planId` | Ingress only | Yes — public contract | — | **NO** | OD-3 |
| trial integer | Fallback handle | Yes | — | **NO** | 30002 fallback + bind |
| webhook integer metadata | Ingress | Yes | In-flight payloads | **NO** | Dual-read then OD-3 |

## N. FUTURE PROGRAMS

Recommended only; **not authorized**:

1. **OD-3 Public/API UUID Cutover** — integer ingress and public DTO
2. **OD-4 Legacy Bridge Retirement** — `LEGACY_PLAN_BRIDGE` + `PLAN_ID_TO_CATALOG_PLAN` + stop writing `legacyPlanId`
3. **SAFE DELETE `subscription_plans`** — gated DROP after the above
4. Optional: ops-script S5 join repair (stale UUID↔int join)
5. Optional: dead-helper cleanup (`getSubscriptionPlans*` / `BASIC_FREE_PLAN_ID`)

Do not automatically start them.

## O. ARCHITECTURE CONCLUSION

1. **Truly dead:** leftover-table ORM helpers (no production callers); `resolveTableOrderingEntitlement` / `BASIC_FREE_PLAN_ID`; `monthlyEquivalentPlanPrice` (already removed from runtime).
2. **Compatibility-only:** public/admin/checkout/webhook/trial integer `planId`; `listPlans.id`; `bindings.legacyPlanId`; `LEGACY_PLAN_BRIDGE`; `PLAN_ID_TO_CATALOG_PLAN`.
3. **Still runtime-required:** Live Plan UUID storage; Charged Terms; MRR from Charged Terms; entitlement hub; **and** the integer→UUID resolver until OD-3/OD-4.
4. **Historical:** leftover table migrations; Production leftover 3-row catalog; prior program docs.
5. **Removable without another migration:** nothing in the leftover *schema*. Dead TypeScript helpers could be deleted without a DB migration, but tests/seeds still couple them — not authorized here.
6. **Requires schema migration:** DROP `subscription_plans`; DROP `bindings.legacyPlanId`.
7. **Requires public API cutover:** integer `planId` on checkout, admin, `listPlans`, Pricing, Customer Success, webhook metadata.
8. **Requires separate Architecture Authority approval:** OD-3, OD-4, SAFE DELETE, and any dead-helper cleanup.

### No third catalog

Cleanup, if later authorized, must not create another plan table, identity, price catalog, or entitlement catalog.

Target remains:

```
ONE commercial catalog:  commercial_plans
ONE canonical identity:  commercial_plans.id UUID
```

Live Plans are the commercial catalog. Everything else is proven as compatibility, historical, migration residue, test/seed infrastructure, or dead code.

## Git (this program)

```
HEAD: 9f825ce1 feat(commercial): migrate subscription plan identity to live plan uuid
```

This program did not `git add`, `git commit`, or `git push`. Documentation in this folder is uncommitted by design.

## FINAL STOP

Architecture Authority will use this report to decide the next program.
