# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Workflow Audit

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Settlement Ledger actions (after adoption)

| Action | Location | Notes |
|--------|----------|-------|
| View / Receipt | History + Detail | Unchanged |
| Filter Paid/Refunded/… | History | Prior presentation adoption |
| **Refund** | Detail (eligible only) | **New — additive** |
| Mark Paid / Complimentary / Close | Session / Orders | Unchanged; outside Ledger |

## Backward compatibility

Paid / Complimentary / Voided settlement workflows unchanged. Refund is additive when domain-eligible.

## Post-execution refresh

| Artifact | Refresh |
|----------|---------|
| History list | `listByRestaurant` invalidate |
| Detail / receipt | invalidate |
| Chain | `getByCheck` invalidate |
| Budget | `getBudget` invalidate |
| Status / generation | Shown via refreshed publication DTOs |

---

## Final Certification

**PRODUCTION CERTIFIED**
