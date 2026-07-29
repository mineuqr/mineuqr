# Risk Assessment

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Risks if architecture is **not** adopted

| ID | Risk | Severity | Impact |
|----|------|----------|--------|
| **R-N1** | Binary admin remains sole platform power | High | Accidental over-privilege; no Support/Auditor separation |
| **R-N2** | Staff roles never modeled | High | Blocks multi-user venues; CRMP continues mapping Manager→owner |
| **R-N3** | Domains invent local permission hacks | High | Inconsistent security; audit gaps |
| **R-N4** | AI Operations ships without inherit-caller law | Critical | Privilege escalation via tools |
| **R-N5** | Subscription conflated with authz | High | Paying ≠ authorized; or authorized ≠ entitled |
| **R-N6** | Ownership duplicated in ad-hoc tables | Medium | Tenant Identity conflict |

---

## 2. Risks of **adopting** this architecture (implementation phase)

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| **R-A1** | Big-bang migration breaks production access | High | Dual-read interim; map owner/admin → seed roles; feature flags |
| **R-A2** | Role explosion / mega-roles | Medium | Composition + catalog review; AG-05 grant subset rule |
| **R-A3** | Performance of authorize on hot paths | Medium | Cache effective grants per principal+scope; deny-fast |
| **R-A4** | Scope confusion (Tenant vs Restaurant today) | Medium | Explicit interim: Restaurant = Tenant boundary until Identity ships |
| **R-A5** | UI hides buttons but API open | High | AP-05/06; audit procedure coverage |
| **R-A6** | Platform support treated as ownership | High | TI-04; audited support grants only |
| **R-A7** | Custom roles exceed granter | Medium | AG-05 enforcement in assignment API |
| **R-A8** | Device roles merged into human RBAC | Medium | Keep parallel plane; document mapping only |
| **R-A9** | Premature schema before Identity | Medium | Foundation program after ADR-034; Identity before staff UX |
| **R-A10** | Catalog drift across modules | Medium | RBAC owns catalog; **AP-15** forbids rename/reuse; PR checklist / governance ops |
| **R-A11** | Domains reintroduce role switches | High | **AP-16** constitutional ban; adoption lint / review gate |

---

## 3. Residual risks accepted at architecture stage

| Residual | Acceptance |
|----------|------------|
| Architecture alone does not harden runtime | Accepted — implementation is future programs |
| Today’s binary model remains live | Accepted — explicit constraint of this program |
| Org/Branch entities do not exist yet | Accepted — modeled as target; Identity platform delivers |

---

## 4. Risk summary for Architecture Authority

**Proceeding without a canonical RBAC architecture** leaves MineuQR unable to safely host Tenant Identity, Subscription governance, and AI Operations.

**Adopting this architecture** is low immediate runtime risk (docs only) and sets controlled migration rails. Largest future delivery risk is **R-A1** (migration), mitigated by dual-read and seeded role mapping — not by redesign.
