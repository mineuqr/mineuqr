# Root Cause Report

**Program:** CAPABILITY-EXCLUDED-FORENSICS-1

| ID | Why excluded (forensic) | Root-cause class | Incorrect exclusion? |
|----|-------------------------|------------------|----------------------|
| CAP-14 | ADR-023 defines **language/constitution**, explicitly not a schema/API/runtime product; specializations already Canonical (CAP-08–13) | Merged into / embodied by other capabilities · Governance artifact | **No** |
| CAP-18 | ADR-033 is **governance plane**; operational code lives in CRMP (CAP-16) | Governance artifact · Merged into CAP-16 specializations | **No** |
| CAP-38 | Shared architecture package with explicit “no collectors/APIs”; Platform Ops page is architecture-only | Never implemented as product · Experimental prototype architecture | **No** |
| CAP-39 | Architecture package; workers reserved; live outbox already CAP-40 | Never implemented as product · Superseded ownership by CAP-40 | **No** |
| CAP-44 | Architecture Authority process/docs; no merchant/platform product | Governance artifact | **No** |
| CAP-45 | Future entitlement reservation; zero runtime/LLM/stub | Never implemented · Planned | **No** |

### Discovery-1 vs Reconstruction tension

| Issue | Evidence |
|-------|----------|
| CAP-14/18/44 marked “Certified” in Discovery-1 | Meant **architecture/process certification**, not Canonical product capability |
| Reconstruction correctly re-scoped | Canonical Registry = production-implemented platform capabilities only |

No case of “incorrect exclusion of a live orphan product.”
