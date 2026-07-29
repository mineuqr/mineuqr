# Future Roadmap & Extensibility — Deliverable 12

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Extensibility without redesign

| Capability | Mechanism |
|------------|-----------|
| **Multiple organizations** | First-class Organization nodes |
| **Enterprise customers** | Org → many Tenants → many Restaurants |
| **Franchises** | Org (brand) → Tenants (franchisees) or Tenant→Restaurants; relation metadata later |
| **Holding companies** | Parent Org portfolio; optional future Org-to-Org link object |
| **Resellers** | Partner principal manages Orgs under contract — hierarchy unchanged |
| **Partners** | Scoped membership + RBAC Partner role; Identity IDs stable |
| **Marketplace** | External refs map to canonical IDs (REF-05) |
| **Cross-region deployment** | Opaque globally unique IDs; region as metadata not identity |

---

## 2. Recommended program sequence

```
RBAC-PLATFORM-ARCHITECTURE-1          (prerequisite)
TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  ← this program
        │
        ▼
ADR-ARCH-035 publication
        │
        ├──────────────────────────────┐
        ▼                              ▼
TENANT-IDENTITY-FOUNDATION-1     (ADR-034 RBAC track)
  • ID issuance contract
  • hierarchy tables (future)
  • dual-read Restaurant≈Tenant
        │
        ▼
MEMBERSHIP-AND-OWNERSHIP-ADOPTION-1
        │
        ├─ ORGANIZATION-TENANT-ROLLOUT-1
        ├─ BRANCH-ENTITY-ADOPTION-1
        └─ SUBSCRIPTION attachment to Tenant ID
```

Names are proposals for Architecture Authority scheduling.

---

## 3. Phase goals

### Phase A — Constitution

- Accept this architecture  
- Publish ADR-ARCH-035  
- Freeze TIP-01…15 + **RI-01 · RI-02 · RI-03 · ON-LAW**  

### Phase B — Foundation (future implementation)

- Canonical ID issuance  
- Operational number issuance  
- Lifecycle states  
- Mapping from legacy restaurant rows  

### Phase C — Hierarchy expansion

- Organization / Tenant entities  
- Branch first-class entity  
- Accountable-owner transfer APIs (lineage immutable — **RI-01**)  
- Controlled migration playbooks for enterprise restructuring (archive + new ID — never reparent)  

### Phase D — Ecosystem

- Reseller/partner relations  
- Marketplace external refs  
- Multi-region issuance hardening  

---

## 4. Non-goals of early phases

- Auth redesign  
- RBAC catalog implementation (RBAC Foundation)  
- Billing engine  
- AI product features  

---

## 5. Success metrics (future)

| Metric | Target |
|--------|--------|
| New APIs accepting name/email/ops# as identity | 0 (**RI-03**, **ON-LAW**) |
| Resources without Tenant/Restaurant canonical home | 0 |
| Recycled canonical IDs | 0 |
| Same-ID parent reassignments | 0 (**RI-01**) |
| External refs broken by rename/brand change | 0 (**RI-02**) |
| Cross-tenant reads without RBAC grant | 0 |
| Domain-local identity resolvers | 0 (**RI-03**) |
| AI identity mutations | 0 |
