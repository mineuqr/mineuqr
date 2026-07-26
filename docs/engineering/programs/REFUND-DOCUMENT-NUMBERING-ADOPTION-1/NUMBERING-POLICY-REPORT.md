# REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — Numbering Policy Report

| Field | Value |
|---|---|
| **Program** | REFUND-DOCUMENT-NUMBERING-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Policy

| Rule | Adoption |
|------|----------|
| Prefix | `RF` |
| Format | `RF-######` (6-digit pad) |
| Scope | Restaurant-scoped monotonic sequence |
| Independence | Not derived from ST, Check, Order, or Session numbers |
| Immutability | Sequence bound once to `settlementRecordId`; never reassigned |
| Reuse | Deleted/cancelled numbers are not reused (append-only binding) |
| Historical | Backfill by creation order; unbound rows keep legacy ST-gen display |

## Examples

| Document | Number |
|----------|--------|
| Settlement | `ST-570004` |
| First refund | `RF-000001` |
| Second refund | `RF-000002` |

Relationship: Refund `RF-000001` → Origin Settlement `ST-570004`.

---

## Final Certification

**PRODUCTION CERTIFIED**
