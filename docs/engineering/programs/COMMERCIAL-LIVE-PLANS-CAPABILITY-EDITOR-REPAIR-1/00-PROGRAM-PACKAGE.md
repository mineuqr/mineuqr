# COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1

| Field | Value |
|-------|-------|
| **Type** | Focused implementation / remediation |
| **Date** | 2026-08-15 |
| **DB terminus** | **0086** (already applied; **not** modified) |
| **Mode** | Application + UI repair. Read-only production forensics. No migration. |
| **Verdict** | **READY FOR DEPLOY** |

This program does **not** authorize commit, push, or production deployment.

## Problem

The Live Plan Editor opened Basic but showed only **حزمة الميزات** / a bundle selector such as “Basic Features”. The administrator could not see or toggle individual commercial capabilities. Symptom: **لا استطيع اضافة المميزات**.

## Architecture (unchanged)

```
Discovery → Commercial Projection → Live Commercial Plan → Current Capabilities
```

No Plan Versions, Draft, Publish, Retire, Snapshots, or publication pipeline.

## Deliverables

| Document | Role |
|----------|------|
| [FORENSICS.md](./FORENSICS.md) | Owning layers, production mappings, mismatch |
| [CAPABILITY-DATA-FLOW.md](./CAPABILITY-DATA-FLOW.md) | Discovery → entitlement path |
| [EDITOR-UX-DESIGN.md](./EDITOR-UX-DESIGN.md) | Individual capability surface |
| [PERSISTENCE-REPAIR.md](./PERSISTENCE-REPAIR.md) | saveLive + atomic bundle-feature replace |
| [DEPENDENCY-AND-LOCK-POLICY.md](./DEPENDENCY-AND-LOCK-POLICY.md) | Foundational vs editable |
| [RUNTIME-PROPAGATION-VALIDATION.md](./RUNTIME-PROPAGATION-VALIDATION.md) | A/B add/remove without rebind |
| [REGRESSION-REPORT.md](./REGRESSION-REPORT.md) | Pricing, checkout, Public Pricing, typecheck |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Authoritative decision |

Read-only production snapshot: `_forensics.json` (written by `_forensics.mjs`; SELECT only).

**STOP after READY FOR DEPLOY.** Await Architecture Authority review.
