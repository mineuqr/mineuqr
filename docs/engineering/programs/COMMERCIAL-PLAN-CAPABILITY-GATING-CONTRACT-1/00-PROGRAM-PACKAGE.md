# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-PLAN-CAPABILITY-GATING-CONTRACT-1  
**Date:** 2026-08-16  
**Mode:** ARCHITECTURAL CONTRACT ONLY  
**Baseline:** COMMERCIAL-PLAN-CAPABILITY-GATING-FORENSICS-1  
**STATUS:** CONTRACT COMPLETE — READY FOR IMPLEMENTATION  

No code, schema file, Production row, commit, push, or deploy was changed.

| Item | Value |
|------|--------|
| Model | **A** — join existing Commercial Projection |
| Canonical keys | `sessionTableManagement`, `menuManagement`, `menuDesign`, `smartQr` |
| Schema change | **NO** |
| Data cutover | **YES** — seed `included=true` on existing Live Plan bundles (preserve Always-On until Admin changes) |
| Enforcement | `requireFeature(ownerId, <canonical key>)` before persist |
| Next | `COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1` — **do not start here** |

Financial authorities (Live Plan price, Charged Terms, concession, `planId`, MRR, ARR) are unchanged. Capability state must not enter snapshots.
