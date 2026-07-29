# Entitlement Model — Deliverable 4

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Definition

**Entitlement** is the commercial enablement of a **Feature** for a **Tenant** (Canonical Identity) at a point in time.

Entitlement determines:

- Feature availability  
- Plan-derived access  
- Commercial enablement (including trials, add-ons, overrides under policy)  

Entitlement **never**:

- Grants RBAC permissions  
- Grants or changes Identity ownership / lineage  
- Implements domain business rules  

---

## 2. Evaluation independence

```
entitled(tenantId, featureKey) → true | false | { false, reason }
```

Evaluated **independently** from:

| Plane | Not confused with entitlement |
|-------|-------------------------------|
| RBAC | `authorize(permission, …)` |
| Identity | who / owns |
| Billing payment success | May *signal* lifecycle; Platform still evaluates |
| UI flags | Presentation only |

**Target allow formula:**

```
ALLOW ⇔ entitled(feature) AND limitOK (if applicable) AND authorized(permission, scope)
```

---

## 3. Effective entitlement sources (priority sketch)

Higher wins under Platform policy (exact precedence is policy-configurable; architecture requires a **single** evaluator):

1. Emergency platform disable (deny)  
2. Explicit platform deny override  
3. Tenant allow override (if policy permits)  
4. Beta / early-access grant  
5. Add-on entitlements  
6. Base plan feature set  
7. Trial feature set  
8. Default deny  

---

## 4. Laws

| Rule ID | Statement |
|---------|-----------|
| **ENT-01** | Entitlement is server authoritative. |
| **ENT-02** | Domains call Subscription entitlement API (`hasFeature` / `checkEntitlement`) — they never evaluate plans (**SP-19**). |
| **ENT-03** | Entitlement false ⇒ product may prompt upgrade; must not fall through as allow. |
| **ENT-04** | Entitlement true does not imply any user may act — RBAC still required. |
| **ENT-05** | Suspended/Expired subscription yields not entitled (except read-only grace policy features if explicitly catalogued). |
| **ENT-06** | Legacy `plan: ADMIN` commercial bypass must not be equated with Platform Owner RBAC (RBAC SUB-03). |
| **ENT-07** | Domains evaluate **Feature Keys only** — Plans Are Presentation; Features Are Contracts. |
| **ENT-08** | Long-running operations may take an **entitlement snapshot** at start (**SP-18**); mid-flight subscription changes must not alter that execution. |

---

## 5. Entitlement Snapshot (**SP-18**)

When historical correctness is required, capture at execution start:

```
snapshot = {
  tenantId,
  featureKeysEntitled[],
  limitBindingsRelevant[],
  planKeyAtStart?,      // audit metadata only — not for domain branching
  capturedAt,
  correlationId / jobId
}
```

| Applies to (examples) | Does not require snapshot |
|-----------------------|---------------------------|
| Excel export, large reports, background jobs, AI jobs, bulk ops | Typical short interactive requests (live check) |

**Recovery:** Retry/resume uses the original snapshot unless the job type explicitly documents a re-check policy.

---

## 6. Decision API shape (conceptual — not implemented)

```
checkEntitlement({
  tenantId,          // Canonical Tenant ID (Identity)
  featureKey,        // e.g. feature.realtime — immutable contract (SP-17)
}) → { entitled: boolean, source, planKey?, reasonCode, auditId }

hasFeature(tenantId, featureKey) → boolean   // domain-facing alias

beginEntitlementSnapshot({ tenantId, jobId, featureKeys[] })
  → snapshotId   // for long-running ops (SP-18)

checkLimit({
  tenantId,
  limitKey,
  proposedDelta?
}) → { allowed: boolean, remaining?, policy: unlimited|soft|hard|grace, … }
```

`planKey` may appear in audit/diagnostic payloads only — **never** as a domain control-flow input (**SP-19**).

---

## 7. Messaging guidance (product — not architecture authority)

| Outcome | Typical UX |
|---------|------------|
| Not entitled | Upgrade / contact sales |
| Entitled but not authorized | Forbidden / contact admin |
| Limit exceeded | Upgrade / wait for reset / grace notice |
