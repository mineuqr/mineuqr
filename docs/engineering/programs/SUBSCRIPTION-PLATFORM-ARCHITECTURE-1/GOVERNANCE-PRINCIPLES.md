# Governance Principles — Deliverable 9

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts

---

## 1. Architecture principles (Subscription Constitution)

| ID | Principle | Normative statement |
|----|-----------|---------------------|
| **SP-01** | Subscription Independence | Subscription never owns Identity, RBAC, domain logic, or payment capture. |
| **SP-02** | Commercial SSOT | Subscription Platform is the sole SSOT for commercial entitlement & limit policy evaluation. |
| **SP-03** | Immutable Feature Keys | Feature keys are permanent contracts; deprecate — never silently rename or reuse. *(strengthened by **SP-17**)* |
| **SP-04** | Feature Before Plan | Features exist independently; plans reference features; features outlive plans. *(strengthened by **SP-20**)* |
| **SP-05** | Entitlement Independence | Entitlement never grants permissions or ownership. |
| **SP-06** | Limit Independence | Limits constrain quantity; they are not features, roles, or identity. |
| **SP-07** | Presentation Independence | Plan/feature display names are UX; keys are contracts. |
| **SP-08** | Commercial Policy Centralization | Trials, grace, upgrades, overrides governed centrally — not per domain. |
| **SP-09** | Backward Compatibility | Evolve via deprecation and dual-read; do not break historical keys. |
| **SP-10** | Server Authoritative Entitlements | UI/AI never authoritative for entitlement. |
| **SP-11** | Plan Keys Stable | Plan keys are commercial identifiers; names may change. Plans remain replaceable bundles (**SP-20**). |
| **SP-12** | No Domain Subscription Logic | Domains must not encode plan matrices or SKU switches. *(constitutionalized as **SP-19**)* |
| **SP-13** | Attach to Canonical Identity | Subscriptions attach to Tenant Canonical ID (Identity plane). |
| **SP-14** | Dual Gate with RBAC | Entitled ∧ Authorized required for allow. |
| **SP-15** | Extensible Commerce | Add-ons, usage, marketplace, partners without redesign. |
| **SP-16** | Auditable Commercial Decisions | Entitlement/limit/lifecycle decisions emit audit metadata. |
| **SP-17** | Feature Identity Stability | Feature Keys are immutable commercial contracts; never rename/reuse/change semantics; deprecate instead. |
| **SP-18** | Entitlement Snapshot | Long-running ops may snapshot entitlement at start; mid-flight subscription changes must not alter running work. |
| **SP-19** | Domain Subscription Independence | Domains never evaluate Plans/tiers; they evaluate Feature Entitlements only. |
| **SP-20** | Commercial Evolution | Plans are replaceable bundles; Features are permanent capabilities; evolution never redesigns Features. |

---

## 2. Canonical Architecture Law

### Plans Are Presentation. Features Are Contracts.

| | Plans | Features |
|--|-------|----------|
| Nature | Commercial **packaging** | Permanent commercial **contracts** |
| May change / be replaced / retired | **Yes** | Keys **stable**; deprecate only |
| Domain may depend on identity of… | **Never** | **Only via entitlement** (`hasFeature` / `entitled`) |
| Understood by | Subscription Platform only (bundles, pricing, mapping) | Catalog + entitlement evaluator + domains (as keys) |

**Normative:**

- Commercial packaging may change over time.  
- Feature identity remains stable.  
- No Business Domain may depend on Plan identity.  
- Only Feature Entitlements may be evaluated outside the Subscription Platform.

This law is permanent Subscription Platform Architecture Constitution.

---

## 3. SP-17 — Feature Identity Stability (constitutional detail)

**Definition:** Feature Keys are **immutable commercial contracts**.

| Rule | Statement |
|------|-----------|
| No silent rename | Feature Keys must never be silently renamed. |
| No reuse | Feature Keys must never be reused. |
| No semantic change | Feature Keys must never change semantics. |
| Deprecation allowed | Feature Keys may become deprecated. |
| Historical validity | Deprecated Feature Keys remain valid historical contracts. |
| Replacement | New functionality requires **new** Feature Keys. |

**Implications**

| Surface | Implication |
|---------|-------------|
| Feature Catalog | Append/deprecate; never in-place semantic rewrite |
| Plan compatibility | Plans re-point to features; retiring a plan does not retire feature keys |
| Backward compatibility | Historical entitlements remain interpretable |
| Commercial governance | Catalog change control forbids reuse |
| Marketplace | Module licenses bind to stable feature keys |
| API compatibility | External commercial APIs expose feature keys as contracts |
| AI compatibility | AI tools bind to stable feature keys — no invented aliases |

---

## 4. SP-18 — Entitlement Snapshot (constitutional detail)

**Definition:** Long-running operations may **snapshot** commercial entitlement at the moment execution begins whenever historical correctness is required.

Subscription changes after execution begins must **not** alter the behavior of an already executing operation.

**Examples:** Excel Export · Large Report Generation · Background Processing · AI Jobs · Bulk Operations  

**Implications**

| Surface | Implication |
|---------|-------------|
| Auditability | Snapshot recorded with job/correlation id (**SP-16**) |
| Historical correctness | Completed artifacts match entitlement at start |
| Commercial consistency | Mid-job downgrade/cancel does not corrupt in-flight work |
| Async processing | Workers consume snapshot, not live plan polling |
| Recovery | Retry/resume uses original snapshot policy (or explicit re-check policy documented per job type) |

**Not required** for every short request — apply when historical correctness matters. Short interactive requests typically evaluate live entitlement.

---

## 5. SP-19 — Domain Subscription Independence (constitutional detail)

**Definition:** Business Domains **never** evaluate Plans or Subscription Tiers. Business Domains evaluate **Feature Entitlements only**.

**Prohibited**

```
if (plan == "...")
switch (subscription.plan) { ... }
tier-specific business logic
```

**Approved**

```
hasFeature(feature.xxx)   // or checkEntitlement({ featureKey })
// then domain business rules; then RBAC authorize as required
```

Only the Subscription Platform understands Plans, commercial bundles, pricing, and commercial mapping.

**Implications:** Orders · Reporting · Realtime · Kitchen · Waiter · Kiosk · AI · Future Domains — none branch on plan identity.

---

## 6. SP-20 — Commercial Evolution (constitutional detail)

**Definition:** Plans are **replaceable** commercial bundles. Features are **permanent** commercial capabilities.

| Plans | Features |
|-------|----------|
| Reference Features | Remain stable (**SP-17**) |
| May evolve / be replaced / retired | Never redesigned for packaging changes |
| Versionable packaging | Commercial evolution must not require Feature redesign |

**Implications:** Plan versioning · Enterprise contracts · Marketplace · Regional offerings · Future pricing models — all rebundle features without renaming feature contracts.

---

## 7. Platform owns vs domains

### Subscription Platform owns

Plan Catalog · Feature Catalog · Limit definitions · Commercial policies · Entitlement & limit evaluation · **Entitlement snapshots for long-running ops** · Trial policy · Subscription lifecycle · Commercial enablement · Plan↔Feature mapping · Subscription audit schema  

### Domains own / must do

Business behavior · Call `hasFeature` / entitlement API only (**SP-19**) · Snapshot long-running jobs when required (**SP-18**)  

### Does not own

Identity graph · RBAC roles/permissions · Payment provider details · Tax/invoicing  

---

## 8. Change control

| Change | Authority |
|--------|-----------|
| New feature key | Subscription governance + Architecture review |
| Feature key semantic change / rename / reuse | **Forbidden** (**SP-17**) — new key + deprecate |
| New / replace / retire plan | Platform commercial governance (**SP-20**) |
| Emergency disable | Platform ops under policy |
| Entitlement evaluator precedence | Architecture Authority |
| Snapshot policy per job class | Subscription + domain Architecture review |

---

## 9. NFR mapping

| NFR | Satisfaction |
|-----|--------------|
| Enterprise ready | Custom plans, overrides, audit, snapshots |
| Multi-tenant | Per-Tenant subscription attachment |
| Commercially scalable | Catalog + evaluator; plan evolution without feature redesign (**SP-20**) |
| Auditable | SP-16 + SP-18 snapshots |
| International | Presentation/currency metadata; feature keys stable (**SP-17**) |
| Cloud native | Stateless checks; snapshot for async |
| Extensible | SP-15 · SP-20 |
| Backward compatible | SP-09 · SP-17 |
| Operationally friendly | Domains see features only (**SP-19**) |
