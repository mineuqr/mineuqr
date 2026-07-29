# Future Roadmap & Extensibility — Deliverable 9 + Roadmap

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Extensibility guarantees (no redesign)

The model already accommodates:

| Capability | Mechanism |
|------------|-----------|
| **Custom Roles** | Tenant-scoped role records = permission subsets; AG-05 grantability |
| **Permission Groups** | Catalog bundles expanded at decision time |
| **Feature Permissions** | Normal permissions + Subscription entitlement intersection |
| **Subscription-aware permissions** | SUB-01…05 — independent planes |
| **Temporary access** | Membership `validFrom` / `validTo` |
| **Delegation** | `delegatedFrom` + depth/time bounds (AG-10) |
| **API Tokens** | Machine principals with scoped grants |
| **Service Accounts** | SYSTEM classification + explicit role bindings |
| **Partner Access** | Partner role + contract Custom Scope |
| **Organization Hierarchy** | Organization → Tenant → Restaurant → Branch scopes |

---

## 2. Recommended program sequence

```
RBAC-PLATFORM-ARCHITECTURE-1          ← this program (docs)
        │
        ▼
ADR-ARCH-034 publication              (governance)
        │
        ├──────────────────────────────┐
        ▼                              ▼
TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1
        │                      SUBSCRIPTION-PLATFORM-ARCHITECTURE-1
        ▼                              │
RBAC-PLATFORM-FOUNDATION-1             │
  • permission catalog package         │
  • decision API                       │
  • dual-read with assert* guards      │
        │                              │
        ▼                              ▼
RBAC-PLATFORM-ADOPTION-1         entitlement ∩ authorize
  • migrate adminProcedure
  • migrate assertRestaurantAccess
        │
        ├─ STAFF-MEMBERSHIP-ADOPTION-1
        ├─ PLATFORM-ROLE-SPLIT-1 (Support/CS/Finance/Auditor)
        ├─ AI-OPERATIONS-PLATFORM-ARCHITECTURE-1 (consumes AI-01…06)
        └─ SERVICE-ACCOUNTS-AND-TOKENS-1
```

Exact names are proposals for Architecture Authority scheduling.

---

## 3. Phase goals

### Phase A — Constitution

- Accept this architecture  
- Publish ADR-ARCH-034  
- Freeze principles AP-01…16 (including **AP-15** Permission Stability · **AP-16** Domain Independence)  

### Phase B — Foundations (implementation — future)

- Package permission catalog + role seeds  
- `authorize()` server API  
- Dual-read: ownership → Restaurant Owner; admin → Platform Admin/Owner  
- No UI redesign required yet  

### Phase C — Identity binding

- Membership table  
- Org/Tenant/Branch as Identity delivers  
- Staff invite flows  

### Phase D — Role specialization

- Split platform operators into Support/CS/Sales/Finance/Auditor  
- Venue ops roles for CRMP/Orders  

### Phase E — Advanced

- Custom roles, delegation, tokens, partners  
- AI tool authorization enforcement  

---

## 4. Explicit non-goals of early phases

- Rewriting Authentication  
- Replacing device capability roles  
- Changing financial ADR ownership  
- Building AI product features inside RBAC  

---

## 5. Success metrics (future adoption)

| Metric | Target |
|--------|--------|
| Domain call sites using role string compares | → 0 for new code; declining for legacy (**AP-16**) |
| Permission key silent renames / semantic reuse | 0 (**AP-15**) |
| Procedures covered by permission checks | 100% of mutating admin/tenant APIs |
| Audit coverage of deny/allow on sensitive ops | 100% |
| Platform Owner demotion via UI | Impossible |
| AI tool invocations without authorize | 0 |
