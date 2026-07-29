# Feature Enablement — Deliverable 8

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Purpose

Commercial **feature enablement** controls whether a feature key is commercially available. It is **not** a second business-logic layer and **not** RBAC.

Enablement feeds the **entitlement evaluator** (ENT model). Domains still implement behavior only when entitled **and** authorized.

---

## 2. Control planes

| Control | Who | Effect |
|---------|-----|--------|
| **Platform-controlled** | Platform ops / Owner policy | Global on/off, emergency disable, internal-only |
| **Plan-controlled** | Plan catalog | Base feature membership |
| **Tenant overrides** | Platform policy-gated | Allow/deny exceptions (enterprise) |
| **Beta programs** | Platform | Opt-in cohort entitlements |
| **Early access** | Platform | Time-boxed pre-GA |
| **Internal features** | Platform | `visibility=internal` — staff Tenants / INTERNAL accounts |
| **Feature rollout** | Platform | Percentage/cohort gates (commercial readiness) |
| **Emergency disable** | Platform | Hard deny all Tenants for a feature key |

---

## 3. Precedence (must be single evaluator)

See Entitlement Model source order. **Emergency disable** always wins as deny.

---

## 4. No business logic duplication

| Forbidden | Correct |
|-----------|---------|
| Domain re-implements “Professional gets Realtime” | `hasFeature(feature.realtime)` (**SP-19**) |
| `if (plan === 'enterprise')` | Feature entitlement only (**SP-19**) |
| UI-only hide as security | Server entitlement + RBAC |
| Per-router hardcoded plan lists | Catalog-driven evaluation |
| AI special-casing paid flags in prompts | Server entitlement before tools |
| Mid-export live plan flip changing output rules | Entitlement snapshot at job start (**SP-18**) |

---

## 5. Relationship to “feature flags” products

Engineering feature flags (deploy toggles) may exist operationally but **must not** become a parallel commercial SSOT. Commercial truth remains Subscription Feature Catalog + entitlement evaluator. Deploy flags may gate *code availability*; commercial entitlement gates *customer right to use*.

---

## 6. Laws

| Rule ID | Statement |
|---------|-----------|
| **FE-01** | All commercial enablement resolves to feature keys. |
| **FE-02** | Overrides are audited and time-bounded where possible. |
| **FE-03** | Beta/early access still pass through entitlement API. |
| **FE-04** | Emergency disable does not delete catalog keys. |
| **FE-05** | Enablement never assigns RBAC roles. |
| **FE-06** | Enablement maps to Feature Keys only — packaging changes use Plans (**SP-20**). |
| **FE-07** | Feature Key identity is immutable (**SP-17**). |
