# REGISTER-CATALOG-MANAGEMENT-1 — Gap Analysis (Phase 1)

| Field | Value |
|---|---|
| **Program** | REGISTER-CATALOG-MANAGEMENT-1 |
| **Date** | 2026-07-24 |

---

## Implemented today

| Capability | Status |
|------------|--------|
| Catalog statuses `provisioned \| active \| inactive` | Domain + DB |
| `provisionRegister` / activate / deactivate | Domain + `RegisterDomainService` |
| Duty plane independent | Certified |
| Deactivate blocked by active Shift + Duty≠closed | Domain |
| Duty Operations API / UI | Certified (`crmp.register.*`) |

## Missing (this program)

| Capability | Gap |
|------------|-----|
| Register `code` (unique per restaurant) | Not on AR / schema |
| Register `type` | Not on AR / schema |
| Rename / update / changeType | Missing commands |
| Catalog domain events | Missing (Duty events only) |
| Catalog API surface | Not exposed (provision only via domain tests) |
| Manager Catalog UI | Missing |
| Ops empty-state → Create | Disabled CTA (no catalog API) |

## Architecture-only / N/A

| Item | Decision |
|------|----------|
| Catalog `archived` status | **Not in ADR-030** — use soft `archivedAt` + inactive; no new catalog status enum |
| Destructive delete | **Forbidden** |

## STOP check

| Condition | Triggered? |
|-----------|------------|
| Catalog/Duty coupling | No — keep planes independent |
| Ownership redesign | No |
| Non-additive schema | No — ADD COLUMN + unique index |

**Proceed.**
