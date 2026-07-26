# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Permission Audit

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Model

| Gate | Mechanism |
|------|-----------|
| Authentication | `verifiedProcedure` (email-verified session) |
| Tenant / restaurant | `assertRestaurantAccess(ctx, restaurantId, "checkRefund.*")` — owner or admin |
| Role | Same restaurant access model as Settlement Record reads / session settle |
| Register | Hint only (`readActiveRegister`); attribution fail-open (ADR-030) — no bypass of Check money |
| Business / budget | Enforced by Check Aggregate refund commands |

No permission bypass in presentation. Forbidden access surfaces as permission-denied copy.

Fine-grained `refund:*` RBAC keys do not exist platform-wide; this program does not invent a parallel permission system.

---

## Final Certification

**PRODUCTION CERTIFIED**
