# Compatibility — RBAC · Tenant Identity · AI

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Deliverables:** 10 · 11 · 12  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts

---

## 1. RBAC compatibility (Deliverable 10)

Aligned with RBAC-PLATFORM-ARCHITECTURE-1.

| Plane | Answers |
|-------|---------|
| **Subscription** | Feature available? (entitled) |
| **RBAC** | User permitted? (authorized) |

```
ALLOW ⇔ entitled(feature) AND authorized(permission, scope)
```

Neither replaces the other. Both must succeed.

| Rule ID | Statement |
|---------|-----------|
| **SUB-RBAC-01** | Subscription must not grant roles. |
| **SUB-RBAC-02** | Roles must not invent feature entitlement. |
| **SUB-RBAC-03** | `subscription.manage` is an RBAC permission to operate subscription **tools** — not a plan SKU. |
| **SUB-RBAC-04** | Legacy commercial `plan: ADMIN` bypass ≠ Platform Owner RBAC. |
| **SUB-RBAC-05** | Domains check feature entitlement then permission — never `if (plan == …)` (**SP-19**). |
| **SUB-RBAC-06** | Long-running authorized jobs may snapshot entitlement at start (**SP-18**); RBAC still applies to the acting principal. |

**Example**

| Actor | Entitled `feature.excel_export`? | Has `reports.export`? | Result |
|-------|----------------------------------|----------------------|--------|
| Owner on Starter | No | Yes | Deny (upgrade) |
| Cashier on Enterprise | Yes | No | Deny (forbidden) |
| Admin on Enterprise | Yes | Yes | Allow |

---

## 2. Tenant Identity compatibility (Deliverable 11)

| Plane | Defines |
|-------|---------|
| **Tenant Identity** | Who the customer is (Canonical IDs, lineage, ownership) |
| **Subscription** | Commercial contract / entitlement for that customer |

| Rule ID | Statement |
|---------|-----------|
| **SUB-TI-01** | Subscription attaches to Canonical Tenant ID (interim Restaurant ID). |
| **SUB-TI-02** | Subscription never owns identity; Identity never owns entitlement. |
| **SUB-TI-03** | Subscription never mints or reparents Identity. |
| **SUB-TI-04** | Suspended Identity may block use without Subscription owning Identity lifecycle. |
| **SUB-TI-05** | Resolve customers via Canonical ID only — not name/email/ops number. |
| **SUB-TI-06** | Plan packaging changes never change Canonical Identity (**SP-20**). |

---

## 3. AI compatibility (Deliverable 12)

| Rule ID | Statement |
|---------|-----------|
| **SUB-AI-01** | AI consumes subscription entitlements (`feature.ai_assistant`, tool features) — stable keys (**SP-17**). |
| **SUB-AI-02** | AI respects usage limits (`limit.ai_usage`). |
| **SUB-AI-03** | AI respects feature availability — no entitled ⇒ no tool invoke. |
| **SUB-AI-04** | AI never bypasses subscription. |
| **SUB-AI-05** | AI still inherits caller RBAC; dual gate remains. |
| **SUB-AI-06** | AI never modifies plans, entitlements, or catalogs. |
| **SUB-AI-07** | AI never branches on plan/tier names (**SP-19**). |
| **SUB-AI-08** | AI jobs may snapshot entitlement at start (**SP-18**). |

```
Caller
  → entitled(feature.ai_assistant) + limit.ai_usage  [snapshot if long job]
  → authorize(ai.invoke + underlying permissions)
  → tool execution
```

---

## 4. Domain implications (**SP-19**)

Orders · Reporting · Realtime · Kitchen · Waiter · Kiosk · AI · Future Domains:

- Evaluate `hasFeature(feature.xxx)` only  
- Never `if (plan == …)` / `switch(subscription.plan)` / tier-specific commercial logic  

---

## 5. Combined decision stack

```
1. Authenticate                         (Auth)
2. Resolve identity / scope             (Tenant Identity)
3. Entitlement + limits (+ snapshot)    (Subscription)  ← this platform
4. Authorize permission                 (RBAC)
5. Domain / AI business behavior        (Domains)
```
