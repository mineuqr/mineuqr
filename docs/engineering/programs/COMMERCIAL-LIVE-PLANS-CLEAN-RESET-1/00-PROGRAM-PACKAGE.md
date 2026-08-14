# COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1

| Field | Value |
|-------|-------|
| **Type** | Implementation — clean catalog reset to Live Plans |
| **Date** | 2026-08-15 |
| **Preflight** | **PASS** (bindings 0, snapshots 0, no non-commercial catalog FKs) |
| **Migration** | `0086_commercial_live_plans` **replaced, not applied** |
| **Status** | **READY FOR ARCHITECTURE AUTHORITY** |

Do **not** commit, push, deploy, or apply `0086` until Architecture Authority authorizes production cutover.

## Deliverables

| Document | Role |
|----------|------|
| [PRE-RESET-DATA-VALIDATION.md](./PRE-RESET-DATA-VALIDATION.md) | Live preflight |
| [RESET-EXECUTION.md](./RESET-EXECUTION.md) | What the reset does (repo, not production) |
| [LIVE-PLAN-SCHEMA.md](./LIVE-PLAN-SCHEMA.md) | Target schema |
| [LIVE-PLAN-CAPABILITY-MAPPING.md](./LIVE-PLAN-CAPABILITY-MAPPING.md) | Projection → plans |
| [PRICING-VALIDATION.md](./PRICING-VALIDATION.md) | Catalog price book |
| [RUNTIME-VALIDATION.md](./RUNTIME-VALIDATION.md) | Entitlement path |
| [PUBLIC-PRICING-VALIDATION.md](./PUBLIC-PRICING-VALIDATION.md) | Admin save → public |
| [DATABASE-SAFETY-REPORT.md](./DATABASE-SAFETY-REPORT.md) | Forbidden tables + owner |
| [MIGRATION-REPORT.md](./MIGRATION-REPORT.md) | 0086 replacement |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Authoritative summary |
