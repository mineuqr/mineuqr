# Risk Analysis

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Risks if not adopted

| ID | Risk | Severity |
|----|------|----------|
| **R-N1** | Mutating live plan rows rewrites customer history | Critical |
| **R-N2** | Subscriptions bind to plan name → broken on rename | High |
| **R-N3** | Billing invents SKUs → dual SSOT | High |
| **R-N4** | Promotions edit “plan price” → audit failure | High |
| **R-N5** | Silent auto-migrate on publish → customer surprise | High |
| **R-N6** | Cannot evolve pricing by region/currency | Medium |

---

## 2. Adoption risks (future implementation)

| ID | Risk | Mitigation |
|----|------|------------|
| **R-A1** | Confusion Catalog vs Subscription ownership | OWN matrix; ADR-037 + refine 036 |
| **R-A2** | Version sprawl | Deprecation/retirement governance |
| **R-A3** | Incomplete migration audit | MIG-02 mandatory |
| **R-A4** | Draft leakage to storefront | Publish gate only |
| **R-A5** | Legacy binary plans migration | Dual-read map to Version ids |
| **R-A7** | Missing Commercial Snapshot on activate | Critical | **CC-13** mandatory; Foundation gate |
| **R-A8** | Unlimited version graph migrations | High | **CC-14** allow-lists |
| **R-A9** | Billing owns regional prices | High | **CC-15** Catalog ownership |
| **R-A10** | Incomplete Draft published | High | **CC-16** fail-closed gate |

---

## 3. Residual (architecture stage)

Docs only — runtime still has coarser commercial tables. Accepted until Foundation.

---

## 4. Authority summary

Commercial Catalog versioning is required for decade-scale SaaS integrity. Largest future risk is ownership confusion with Subscription — mitigated by explicit consume/own split and CC-03 binding.
