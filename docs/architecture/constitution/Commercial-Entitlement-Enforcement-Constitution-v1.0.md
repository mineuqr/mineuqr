# Commercial Entitlement Enforcement Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Commercial Entitlement Enforcement Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Commercial Entitlement |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 |
| **Prior certified programs** | COMMERCIAL-ENTITLEMENT-ENFORCEMENT-FORENSICS-1 · COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1 |

> **Related:** [Commercial Entitlement Invariants](./Commercial-Entitlement-Invariants.md) · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Checklist](../../engineering/governance/COMMERCIAL-ENTITLEMENT-ENFORCEMENT-CHECKLIST.md)

---

## Constitutional status

This constitution is the permanent **Commercial Entitlement** governance layer.

A commercial capability appearing in Pricing, Plan Editor, Discovery, or UI is **not** implemented until entitlement is enforced at the operation boundary.

Implementations that violate these rules are **Architecture Violations** and **MUST NOT** be Production Certified.

This constitution does **not** redesign Live Plans, Owner Access, Checkout, Billing, Orders, POS, Kitchen, or Reporting.

---

## Authoritative principle

**Commercial entitlement is a server-side authorization boundary.**

A capability is implemented only when all of the following are accounted for:

1. Capability definition  
2. Live Plan composition  
3. Entitlement resolution  
4. Server enforcement  
5. UI enforcement  
6. Negative tests  
7. Regression tests  

---

## CE-01 — Canonical identity

Every commercial capability MUST have one canonical key, a stable identity, presentation names (AR/EN), owning domain, required entitlement, and affected operations.

Example: `devices` / `cap.device.management`.

Do not invent parallel identities (`screenManagement`, `deviceManagement`) unless an Architecture Decision establishes a distinct capability.

## CE-02 — Live Plan is the commercial source of truth

Capability composition MUST come from the current Live Plan.

Forbidden: plan-specific, feature-specific, owner-specific, or endpoint-specific commercial matrices.

## CE-03 — One entitlement authority

Canonical authority: `getCommercialEntitlements` and its established owner/customer resolution paths.

No second resolver. No reconstructing entitlements from plan IDs, plan names, legacy matrices, UI state, or hardcoded lists unless Architecture Authority authorizes it.

## CE-04 — Server-side enforcement is mandatory

Required order:

Authentication → Tenant / Restaurant Access → Commercial Entitlement → Required Capability → Operation Authorization → Persistence

UI hiding is not authorization.

## CE-05 — RBAC does not replace commercial entitlement

Admin, restaurant owner, manager, or staff does **not** imply commercial entitlement.

Example: Admin + Basic + `devices=false` MUST NOT create a device.

## CE-06 — Mutations require explicit enforcement analysis

Every new mutation MUST declare: Operation, Required Capability, Authorization Owner, Server Enforcement, UI Gate, Negative Test.

Unknown boundary → program cannot be certified.

## CE-07 — Read operations are classified separately

Do not blindly apply the same restriction to every GET/list.

Classify: list, get, view, create, update, delete, provision, runtime, export.

## CE-08 — UI is presentation, not authorization

UI SHOULD use `hasFeature(...)` or the canonical entitlement result.

The API MUST independently enforce the same boundary.

## CE-09 — No plan-name authorization

Forbidden for capability authorization:

`if plan === "basic" | "professional" | "enterprise"`  
`if subscription.planId === ...`

Use `requireFeature(userId, "<canonical-key>")` or the approved equivalent.

## CE-10 — No duplicate capability matrices

Forbidden: ScreenPlanMatrix, KitchenPlanMatrix, OrderPlanMatrix, POSPlanMatrix, OwnerPlanMatrix, FeaturePlanMatrix, or equivalents.

If a second mapping appears necessary: STOP and request an Architecture Decision.

## CE-11 — FULL_PLATFORM is a formal owner entitlement mode

Do not implement `if (isOwner) return true` outside the canonical owner entitlement path.

## CE-12 — SIMULATED_PLAN uses current Live Plan

PLATFORM_OWNER → SIMULATED_PLAN → current Live Plan → current capabilities.

No snapshots, versioned entitlement freeze, copied matrices, or owner-specific plan composition.

## CE-13 — Failed entitlement fails closed

If resolution fails, is missing, invalid, or cannot hydrate, the protected operation MUST NOT execute.

No silent fallback to Full Platform, Basic, Professional, Enterprise, or Legacy matrix unless the approved architecture defines that path.

## CE-14 — Negative tests are mandatory

Entitled-only proof is insufficient.

Required where applicable: Entitled, Not Entitled, Expired, Invalid/unavailable, Direct API bypass, UI bypass.

## CE-15 — Test the operation boundary

Pricing, Plan Editor, and resolver tests are not enough.

Prove: UI → API → Authorization → Mutation → Persistence, with enforcement **before** mutation.

## CE-16 — Expiry enters FROZEN commercial state

Paid subscription expiry and Trial expiry MUST transition the customer to **FROZEN** for commercial service.

Current Trial duration: **14 days**, unless a future Architecture/Product Decision changes it.

## CE-17 — FROZEN does not delete data

Do not delete account, restaurant, menu, items, configuration, QR identity, QR references, operational history, or financial history.

FROZEN is reversible.

## CE-18 — FROZEN disables commercial management access

Dashboard commercial management, menu/product/screen management, commercial settings, and other subscription-gated capabilities are unavailable.

Public/runtime behavior follows the dedicated Frozen/Public Runtime policy.

Authentication is not deleted.

## CE-19 — Frozen customer may authenticate and must be redirected

After authentication: Commercial Account State = FROZEN → redirect to Plans / Subscription.

Manual navigation to Dashboard, menu, screens, settings, or other protected commercial routes MUST NOT bypass this. Server enforcement remains mandatory.

## CE-20 — Persistent QR identity survives freeze

Expiry MUST NOT delete, regenerate, or invalidate the permanent QR identity.

While FROZEN, public QR resolution MUST NOT expose the active commercial menu service if the Frozen policy requires suspension. Resolve to the approved frozen/subscription-required experience.

## CE-21 — Renewal restores the same service identity

FROZEN → ACTIVE recovers the same account, restaurant, menu, items, settings, and QR identity. No rebuild. No new QR printing.

## CE-22 — Trial expiry uses the same freeze model

Trial (14 days) ending without an active commercial subscription → FROZEN. Data retained. Redirect to Plans. Service suspended until subscription/renewal.

## CE-23 — Platform Owner is exempt from customer freeze

FULL_PLATFORM has no commercial expiry, customer subscription requirement, trial expiry, or customer freeze.

Owner Access Mode remains separately governed.

## CE-24 — Commercial account state and entitlement are distinct

Do not collapse Authentication, Commercial Account State, Entitlement, and Operation Authorization into `NONE` or `Unauthorized`.

Example: FROZEN customer — authentication valid; state FROZEN; commercial entitlement unavailable; operation denied.

## CE-25 — No data deletion on expiry

Automatic destructive cleanup on expiry is prohibited. Deletion after expiry requires a separate explicit policy and Architecture Authority decision.

## CE-26 — Capability addition Definition of Done

Not complete until: canonical identity, projection mapping, Live Plan composition, entitlement resolution, server enforcement, UI presentation, negative tests, positive tests, expired/Frozen analysis, regression validation, documentation.

## CE-27 — Capability change Definition of Done

Adding/removing a capability from a Live Plan MUST verify runtime entitlement, UI, server enforcement, positive/negative paths, cache invalidation, existing customers, and owner simulation where applicable.

No rebind is required for current Live Plan capability changes.

## CE-28 — Programs must declare commercial impact

Every future program touching commercial capabilities MUST declare the Commercial Capability Impact block (YES/NO, required capability, operations, plans, expired behavior, owner simulation, server/UI enforcement, tests).

## CE-29 — Program review gate

Architecture Authority MUST reject a program if identity, entitlement source, or server enforcement is unclear; if only UI enforcement exists; if plan-name conditionals or duplicate matrices are introduced; or if negative tests, expired, owner, or Frozen behavior are undefined where relevant.

## CE-30 — No silent commercial behavior

Do not silently change capability access, plan access, expired/trial/frozen behavior, owner simulation, or public QR behavior without documentation and the required Architecture Authority decision.
