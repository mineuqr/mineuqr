# FINAL REPORT — COMMERCIAL-LIVE-PLAN-COMPREHENSIVE-AUDIT-1

## STATUS

**AUDIT COMPLETE** (read-only).

`commercial_plans` **is** the single canonical **Live Plan identity and composition root** for MineuQR’s current commercial catalog family.

It is **not** a single table that owns price values, Charged Terms, tax, payments, or MRR. Leftover `subscription_plans` has **no runtime commercial authority**. Several **compatibility** and **incorrect** secondary sources remain (webhook integer READ, `planFeatureMatrix` for users with no subscription).

No application, schema, or Production data was modified. OD-4 / SAFE DELETE / POS / Tax / FX / Refund were **not** started.

---

## CURRENT LIVE PLAN MODEL

```
commercial_plans (UUID id + unique code + composition pointers)
    ├ commercial_prices          → Offer List Price
    ├ feature bundle / limits    → Entitlement catalog inputs
    └ trial policy               → trial duration

Public catalog     = projection of non-hidden plans
Checkout           = UUID → Offer List Price
Subscription       = lifecycle row storing plan UUID
Charged Terms      = binding snapshot (if present)
MRR                = Charged Terms monthly equivalent
Entitlements       = Live Plan composition via Subscription Runtime
                      (except no-subscription → planFeatureMatrix)
```

Platform-global catalog. Tenants reference it; they do not own it.

---

## CANONICAL IDENTITY

- Internal: `commercial_plans.id` UUID (`randomUUID()`, immutable in app).
- Business key: `commercial_plans.code` unique and immutable in app.
- Production: `basic` / `professional` / `enterprise` — no duplicates, none hidden.
- `user_subscriptions.planId` = those UUIDs (6/6). Orphans: 0.

Identity ≠ price ≠ entitlement values ≠ subscription lifecycle ≠ Charged Terms ≠ provider/invoice/payment ids.

---

## FIELD OWNERSHIP

See `01-LIVE-PLAN-SCHEMA-FORENSICS.md`. Price, tax, FX, charged amounts, provider ids, and tenant ids **do not** belong on the plan row and are not stored there. Composition pointers (`featureBundleId`, `limitProfileId`, `trialPolicyId`) belong as **live refs**; mutating them changes entitlements immediately for bound/unbound UUID subscribers.

---

## DEPENDENCY GRAPH

| Consumer | Input | Output | Authority | Fallback | Legacy | Risk |
|----------|-------|--------|-----------|----------|--------|------|
| Public Pricing | catalog | PublicCatalogOffering | Live Plan projection | none | `legacyPlanId` DTO | Display ≠ charge (FX) |
| Checkout PayPal | UUID | USD offer | `commercial_prices` global | fail closed | none | Yearly cycle not in custom_id |
| Checkout Tap | UUID | amount + SAR | same offer number | fail closed | none | **USD number as SAR** |
| Subscription | UUID FK | lifecycle | catalog identity | — | — | 4/6 unbound |
| Trial | catalog professional | UUID row | Live Plan trial policy | — | — | Enterprise has no trial pointer |
| Admin editor | RBAC | live save | catalog | create not durable | — | Memory-only create |
| CS / admin sub | UUID | UUID persist | dual-read helper | integer latent | dual-read | Internal integer branch |
| Entitlements (sub) | UUID / binding | features/limits | Live Plan | fail closed | — | Live capability edits apply immediately |
| Entitlements (no sub) | context | matrix flags | **`planFeatureMatrix`** | NONE | legacy_bridge | **Second catalog** |
| CommercialContext | UUID | tier enum | `catalogPlanKeyFromCode` | fail closed integers | — | — |
| Reporting / stats | planCode | snapshots | CRS + Live Plan name | — | leftover script S5 | Audit script stale |
| MRR | bindings | monthly eq | Charged Terms | 0 if incomplete | none | Coverage 2/6 |
| Charged Terms | bind event | snapshot | catalog-at-bind | monthly default | `legacyPlanId` column | Yearly mis-snapshot |
| Bindings | UUID | terms | catalog | — | historical non-null | — |
| PayPal/Tap webhooks | UUID or integer | UUID persist | dual-read | fail closed | **integer READ** | Retirement BLOCKED |
| Invoices PDF | binding | amount | Charged Terms | — | name via display helper | Unbound = no amount |
| Notifications | plan ref | name | display helper | integer-capable | dual-read | — |
| Audit | UUID / bind | events | ops + audit_events | — | — | — |
| Tests / seeds / scripts | mixed | — | mixed | integer fixtures | leftover table | 5 failing tests (pre-existing) |

---

## PRICING MODEL

Offer List Price = `commercial_prices` (not the plan row). Checkout uses the **global** USD row. Regional SAR rows exist in Production and are **unused at charge time**. Tax is not included in plan price. Promotions unused. FX is presentation-only.

---

## SUBSCRIPTION MODEL

Subscription stores Live Plan UUID and lifecycle. It does not snapshot price. Existing Charged Terms are **not** reconstructed from current Live Plan price on read. Hide does not detach existing UUID references.

---

## CHARGED TERMS BOUNDARY

Independent storage on bindings. Read path does not fall back to live list price. Re-bind overwrites from **current catalog**. Webhooks omit billing cycle → monthly snapshot. Provider capture is not stored. Production: 2 complete USD monthly bindings; 4 subscriptions have no terms.

---

## ENTITLEMENT MODEL

Canonical for customers **with** a UUID subscription: Live Plan → hub → `requireFeature`. `subscription_plans` does not participate. Platform owner: FULL_PLATFORM / SIMULATED_PLAN. No-subscription users: **static matrix** (`legacy_bridge`).

---

## LIFECYCLE

Create (durable only via `saveLive`), update, hide (`isHidden`). **No** delete, **no** publish workflow, **no** unhide UX, **no** archival timestamp. Referenced-plan protection is application discipline only (no FKs). Proposed safe model is in `14-ARCHITECTURAL-GAPS.md` — **not implemented**.

---

## PUBLIC API

OD-3: `planId` UUID. Projection of Live Plan. `legacyPlanId` is compatibility only.

---

## ADMIN

Plan Editor mutates the canonical catalog (RBAC). Price/capability edits change **current** offer and **live** entitlements, not historical Charged Terms unless a bind event re-snapshots.

---

## LEGACY RESIDUALS

| Artifact | Class | Why it remains | Blocker to remove |
|----------|-------|----------------|-------------------|
| `subscription_plans` | Historical / dead runtime | Leftover table | SAFE DELETE (not this program) |
| `LEGACY_PLAN_BRIDGE` | Compatibility | Webhook integer READ | Webhook retirement BLOCKED |
| `bindings.legacyPlanId` | Compatibility column | Historical 2 rows | OD-4 DDL gate |
| `PLAN_ID_TO_CATALOG_PLAN` | Client compat | Grid helper | Cosmetic |
| `parseWebhookPlanRef` integer | Compatibility | In-flight UNKNOWN | COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1 |
| `planFeatureMatrix` | Incorrect second source | No-subscription path | Entitlement-hub cutover for empty subs |

Webhook dual-read is an **external compatibility boundary**. Do not retire here.

---

## PRODUCTION PROOF

SELECT `2026-08-15T14:43:59.042Z`, mutation NONE. Three Live Plans; UUID subscriptions consistent; leftover table present without FKs. Details: `13-PRODUCTION-PROOF.md`.

**Production is consistent with canonical UUID identity.** It is **not** fully consistent with “every subscription has Charged Terms” or “regional/tax catalog affects checkout.”

---

## TEST RESULTS

Scoped forensic suites (after investigation):

| Run | Result |
|-----|--------|
| Catalog + identity + checkout + webhook + entitlements + MRR guards + shared catalog | **28 files passed, 2 failed** — **185 passed / 5 failed / 190** |
| `subscription.test.ts` + `chargedTermsMrr.test.ts` | **21 passed** |

Failures (**pre-existing**, not caused by this read-only program):

1. `getCommercialEntitlements.test.ts` (4) — mock missing `isLivePlanUuid` after unbound UUID path (OD-4).
2. `livePlanIdentity.guards.test.ts` GUARD-IDENTITY-03 — expects a retired comment string on `resolveCheckoutOfferFromLivePlan`.

---

## BUILD RESULT

`pnpm build`: **PASS** (vite + esbuild). Unrelated `pnpm check` not treated as this program’s failure.

---

## ARCHITECTURAL GAPS

P0: Tap SAR/USD mismatch; Charged Terms monthly default; `planFeatureMatrix` second catalog; binding coverage 2/6.  
P1–P3: see `14-ARCHITECTURAL-GAPS.md`.

---

## FINAL AUTHORITY MATRIX

See `15-AUTHORITY-MATRIX.md`. Rows hold except: no-subscription entitlements (`planFeatureMatrix`); Tap currency label; invoice Country Compliance unimplemented.

---

## CERTIFICATION

| # | Question | Answer |
|---|----------|--------|
| 1 | Single commercial catalog? | **Yes as identity + composition root** of the Live Plan **family**. Not the only commercial table. `subscription_plans` is leftover. `planFeatureMatrix` is a second **entitlement** source for empty subs. |
| 2 | `id` single canonical plan identity? | **Yes** for storage and public/checkout/trial. Webhook may still **accept** leftover integer then persist UUID. |
| 3 | `code` only a business/catalog key? | **Yes** |
| 4 | Live Plan price single current offer price? | **Yes** (`commercial_prices` global). Regional/promotions unused at charge. |
| 5 | Charged Terms independent? | **Yes on read.** Re-bind can overwrite from catalog. Incomplete if unbound. |
| 6 | Entitlements independent of `subscription_plans`? | **Yes** |
| 7 | Checkout independent of `subscription_plans`? | **Yes** |
| 8 | MRR independent of `subscription_plans`? | **Yes** |
| 9 | `subscription_plans` outside runtime authority? | **Yes** |
| 10–12 | Legacy bridges / blockers | Webhook integer READ; bind column; leftover table; `planFeatureMatrix`; public `legacyPlanId` — see matrix above |
| 13 | Duplicated commercial SSOT? | **Entitlements (no-sub matrix)**; leftover table prices unused; public catalog is projection only |
| 14 | Fields to move off Live Plan? | None incorrectly stored on the plan row. `taxPolicyRef` on **regions** should stay out of tax calculation (already unused). Promotions unused. |
| 15 | Lifecycle safe? | **Incomplete but fail-safe for delete** (no delete API). Hide/create durability/unhide gaps. No FK tombstones. |
| 16 | Production consistent with architecture? | **Identity: yes.** Charged Terms coverage / Tap currency / unused regional tax: **gaps**. |

---

## RECOMMENDED NEXT PROGRAMS

Architecture Authority chooses. **Do not auto-start.**

1. Binding / Charged Terms coverage + pass `billingCycleCode` into webhook bind (financial snapshot correctness).  
2. Tap checkout currency vs Offer List Price (Payment Provider / checkout — separate from catalog identity).  
3. Entitlement no-subscription path: Live Plan or explicit NONE — retire `planFeatureMatrix` as catalog.  
4. Reopen webhook integer READ only with sourced retention evidence.  
5. OD-4 leftover bridge / bind column — still blocked on (4) and DDL gates.  
6. SAFE DELETE of `subscription_plans` — still blocked.  
7. Plan lifecycle (durable create, unhide, referenced-plan delete forbid).  
8. Stale test mocks / identity guard comment.

---

## STOP CONDITIONS

Honored: no migrations, no DML, no runtime edits, no provider calls, no deploy, no commit/push, no follow-on program started.

---

## GIT STATE

Start: clean `5e769ae1` `docs(commercial): record webhook legacy identity retirement block`.

After audit: untracked `docs/engineering/programs/COMMERCIAL-LIVE-PLAN-COMPREHENSIVE-AUDIT-1/` only. **Not committed. Not pushed.**
