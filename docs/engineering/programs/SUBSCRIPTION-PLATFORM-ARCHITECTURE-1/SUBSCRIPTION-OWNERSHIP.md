# Subscription Ownership — Deliverable 1

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Ownership matrix

| Artifact | Owner | Notes |
|----------|-------|-------|
| **Plan Catalog** | **Platform** (Subscription Platform) | Commercial products |
| **Feature Catalog** | **Platform** | Immutable feature keys |
| **Pricing Models** | **Platform** | Amounts/currency presentation policies — not payment capture |
| **Commercial Policies** | **Platform** | Trials, grace, upgrade/downgrade, fraud, overrides |
| **Limit Catalog / templates** | **Platform** | Limit definitions bound to plans/add-ons |
| **Subscription** (instance) | **Tenant** (customer) | Attached to Canonical Tenant ID (Identity) |
| **Subscription History** | **Tenant** (records) / Platform (audit retention) | Append-oriented commercial history |
| **Entitlements** (effective) | Derived for **Tenant** by Platform evaluation | Not a second ownership graph |
| **Trial state** | **Tenant** subscription instance | Governed by Platform trial policy |

---

## 2. Ownership boundaries

### Platform owns (governs)

- What plans exist and which features/limits they reference  
- Feature key lifecycle (active / deprecated / retired)  
- Global commercial rules (grace length defaults, multi-trial policy)  
- Emergency feature disable / beta gates  
- Catalog versioning  

### Tenant owns (holds)

- Which subscription instance is active for their Tenant  
- Their trial/conversion history under policy  
- Add-on selections within Platform allow-lists  

### Tenant Identity owns (not Subscription)

- Canonical Tenant / Org / Restaurant IDs  
- Lineage and membership  

### RBAC owns (not Subscription)

- Who may call `subscription.manage` tools  
- Who may use an entitled feature  

### Billing plane owns (out of scope)

- Charging cards, invoices, tax, refunds of money  

---

## 3. Attachment law

```
Subscription instance → attaches to → Canonical Tenant ID
                         (interim: Restaurant ID until Tenant entity ships)
```

| Rule ID | Statement |
|---------|-----------|
| **OWN-S-01** | Subscription never mints Identity. |
| **OWN-S-02** | Identity never stores entitlement truth. |
| **OWN-S-03** | One primary subscription per Tenant (add-ons may stack under policy). |
| **OWN-S-04** | Org-level portfolio billing may pay for many Tenants — payer ≠ entitlement home without explicit attachment. |
| **OWN-S-05** | Platform catalog changes do not rewrite Tenant Identity. |
| **OWN-S-06** | Platform owns Plan↔Feature commercial mapping; Domains never interpret Plans (**SP-19**). |
| **OWN-S-07** | Feature Catalog outlives Plan Catalog entries (**SP-20**). |

---

## 4. Forbidden ownership patterns

- Domains embedding plan SKUs as business rules (**SP-19**)  
- Domains `switch(subscription.plan)` (**SP-19**)  
- RBAC granting features via roles  
- Subscription rewriting restaurant ownership  
- Payment provider webhooks as sole entitlement SSOT (provider is a signal; Platform evaluates)  
- Silent Feature Key rename/reuse (**SP-17**)
