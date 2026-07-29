# Risk Assessment

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Risks if architecture is **not** adopted

| ID | Risk | Severity | Impact |
|----|------|----------|--------|
| **R-N1** | Identity remains restaurant name / userId heuristics | High | Breaks enterprise org/franchise models |
| **R-N2** | DB ids leak as public contracts | High | Coupling, enumeration, hard federation |
| **R-N3** | RBAC scopes cannot stabilize | High | Authorization churn on rename/transfer |
| **R-N4** | Subscription attaches to unstable keys | High | Billing/identity desync |
| **R-N5** | AI keys on names | Medium | Cross-tenant confusion / wrong tool targets |
| **R-N6** | ID reuse after delete | Critical | Historical audit corruption |

---

## 2. Risks of **adopting** (future implementation)

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| **R-A1** | Big-bang Org/Tenant introduction | High | Interim Restaurant≈Tenant; dual-read; phased Foundation |
| **R-A2** | Choosing wrong ID format early | Medium | Architecture leaves codec unbound; Foundation ADR locks format |
| **R-A3** | Operational number enumeration | Medium | Authz on lookups; prefer canonical in public APIs |
| **R-A4** | Accountable-owner transfer orphans RBAC | Medium | Identity events → RBAC re-seed; lineage unchanged (**RI-01**) |
| **R-A5** | Slug treated as canonical in new APIs | High | **RI-02** / **RI-03**; review gates |
| **R-A6** | Cascade suspend too aggressive | Medium | Explicit cascade policy + override audit |
| **R-A7** | Confusing Document # (027) with Restaurant # | Low | Separate namespaces; **ON-LAW** training |
| **R-A8** | Premature schema before RBAC Foundation | Medium | Sequence: Identity architecture → coordinated Foundations |
| **R-A9** | Silent reparenting disguised as ownership transfer | High | **RI-01** ban; migration-only restructuring |
| **R-A10** | Domains resolve via name/ops number | High | **RI-03** sole resolution authority |
| **R-A11** | Business rename breaks QR/API/webhooks | High | **RI-02** bind external refs to Canonical ID |

---

## 3. Residuals accepted at architecture stage

| Residual | Acceptance |
|----------|------------|
| Docs only — runtime still Restaurant-centric | Accepted |
| ID codec not chosen | Accepted — deliberately unbound |
| Migration strategy out of scope | Accepted — future program |

---

## 4. Authority summary

Without Tenant Identity, MineuQR cannot safely scale multi-org tenancy, stable RBAC scopes, or AI-safe references.  
Adopting this architecture is **low immediate runtime risk** (documentation only). Largest future risk is **R-A1** (hierarchy introduction), mitigated by interim dual-read — not by redesign.
