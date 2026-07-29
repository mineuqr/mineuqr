# Risk Assessment

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Risks if architecture is **not** adopted

| ID | Risk | Severity | Impact |
|----|------|----------|--------|
| **R-N1** | Domains encode plan SKUs | High | Unmaintainable commerce; upgrade bugs |
| **R-N2** | Entitlement conflated with RBAC | High | Paying ≠ permitted or reverse |
| **R-N3** | Entitlement conflated with Identity | High | Billing moves ownership |
| **R-N4** | Feature keys unstable | High | Integrations/AI break |
| **R-N5** | AI bypasses paid gates | Critical | Revenue & abuse |
| **R-N6** | Payment provider becomes entitlement SSOT | High | Vendor lock-in; inconsistent state |

---

## 2. Risks of **adopting** (future implementation)

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| **R-A1** | Dual checks hurt latency | Medium | Cache entitlement snapshots per Tenant; invalidate on lifecycle |
| **R-A2** | Legacy admin commercial bypass drift | High | Explicit migration off `plan: ADMIN` conflation |
| **R-A3** | Soft vs hard limit UX confusion | Medium | Reason codes + product copy standards |
| **R-A4** | Trial fraud | Medium | Multi-trial policy + Identity risk signals |
| **R-A5** | Override sprawl | Medium | Time-bound audited overrides only |
| **R-A6** | Deploy flags vs commercial flags dual SSOT | High | SP-02; deploy flags ≠ entitlement |
| **R-A7** | Downgrade leaves over-limit resources | Medium | Grace/read-only policies documented |
| **R-A9** | Domain plan switches reintroduced | High | **SP-19**; lint/review gate on `plan ==` |
| **R-A10** | Mid-job downgrade corrupts export/AI output | High | **SP-18** snapshot policy |
| **R-A11** | Feature redesign to fit new plan marketing | Medium | **SP-17** / **SP-20**; packaging-only changes |
| **R-A12** | Marketplace modules bind to plan names | High | Bind to Feature Keys (**SP-17**) |

---

## 3. Residuals accepted now

| Residual | Acceptance |
|----------|------------|
| Docs only — runtime commercial layer unchanged | Accepted |
| Pricing amounts / tax out of scope | Accepted |
| Exact meter implementations deferred | Accepted |

---

## 4. Authority summary

Without a Subscription Platform constitution, MineuQR cannot safely scale plans, trials, AI metering, or marketplace modules. Documentation-only adoption is low runtime risk; largest future risk is **dual-SSOT** with ad-hoc flags/providers — mitigated by SP-02 and single entitlement evaluator.
