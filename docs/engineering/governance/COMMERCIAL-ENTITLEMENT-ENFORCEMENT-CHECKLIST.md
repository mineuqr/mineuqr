# Commercial Entitlement Enforcement Checklist

| Field | Value |
|-------|-------|
| **Audience** | Developers · AI coding agents · Reviewers · Architecture Authority |
| **Normative** | [Commercial Entitlement Enforcement Constitution v1.0](../../architecture/constitution/Commercial-Entitlement-Enforcement-Constitution-v1.0.md) |
| **Invariants** | [I-CE-01…18](../../architecture/constitution/Commercial-Entitlement-Invariants.md) |
| **Program** | COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 |

Use this checklist on every program that introduces, modifies, exposes, or operationalizes a commercial capability.

A capability in Pricing or the Plan Editor is **not** implemented until server enforcement and negative tests exist.

---

## Commercial Capability Impact (required declaration)

```
Commercial Capability Impact: YES / NO

Required Capability: <canonical key>
Affected Operations: <list>
Affected Plans: <list>
Expired Behavior: <description>
Owner Simulation: <description>
Server Enforcement: <location>
UI Enforcement: <location>
Tests: <list>
```

If Impact is NO, Architecture Authority may still reject the program if commercial surfaces were touched without the declaration.

---

## Mandatory answers

- [ ] Does this introduce/change a Commercial Capability?
- [ ] What is the canonical capability key?
- [ ] What Live Plans include it?
- [ ] What operations require it? (create / update / delete / provision / configure / list / get / runtime / export)
- [ ] Where is server enforcement? (`requireFeature` / approved equivalent **before** persist)
- [ ] Where is UI enforcement? (`hasFeature` / canonical entitlement — presentation only)
- [ ] Does direct API access fail correctly?
- [ ] What happens for Basic / non-entitled users?
- [ ] What happens for expired users?
- [ ] What happens during Trial?
- [ ] What happens when Trial expires? (14 days → FROZEN)
- [ ] What happens in FROZEN state?
- [ ] What happens for Platform Owner FULL_PLATFORM?
- [ ] What happens for Platform Owner SIMULATED_PLAN?
- [ ] Is cache affected?
- [ ] Is Legacy Bridge affected?
- [ ] Are subscriptions affected?
- [ ] Is billing affected?
- [ ] Are QR / public runtime surfaces affected?
- [ ] Are negative tests present?
- [ ] Are regression tests present?
- [ ] Is a migration required?
- [ ] Has Architecture Authority reviewed the boundary?

---

## Automatic reject (CE-29)

Reject if any of the following is true:

- Capability identity is unclear
- Entitlement source is unclear
- Server enforcement is missing
- Only UI enforcement exists
- Plan-name conditionals authorize access
- A duplicate capability matrix is introduced
- Negative tests are missing
- Expired / Trial / Frozen / Owner behavior is undefined where relevant

---

## Forbidden

- `if (plan === "basic"|"professional"|"enterprise")` for authorization
- `if (isOwner) return true` outside the owner entitlement hub
- `if (role === "admin")` as a commercial entitlement grant
- ScreenPlanMatrix / KitchenPlanMatrix / OwnerPlanMatrix / equivalents
- Reconstructing entitlements from plan IDs, UI state, or `planFeatureMatrix`
- Silent changes to expiry, trial, freeze, owner simulation, or public QR behavior
- Data deletion or QR regeneration on expiry

---

## Required order of checks

1. Authentication  
2. Tenant / Restaurant Access / RBAC  
3. Commercial entitlement (`getCommercialEntitlements`)  
4. Required capability (`requireFeature(userId, "<key>")`)  
5. Operation-specific authorization  
6. Persistence  

Fail closed if entitlement resolution fails.

---

## Definition of Done (CE-26 / CE-27)

Canonical identity · Projection mapping · Live Plan composition · Entitlement resolution · Server enforcement · UI presentation · Negative tests · Positive tests · Expired/Frozen analysis · Regression · Documentation
