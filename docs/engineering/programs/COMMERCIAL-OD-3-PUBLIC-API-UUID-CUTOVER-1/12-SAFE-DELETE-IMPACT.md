# 12 — SAFE DELETE IMPACT

OD-3 does **not** make `subscription_plans` safe to delete.

| Gate | After OD-3 |
|------|------------|
| Public integer identity | Removed |
| Runtime leftover-table read | Still none |
| ORM / seeds / reset KEEP | Still present |
| Bridges | Still present |
| `bindings.legacyPlanId` | Still present |
| Historical migrations | Must remain |
| AA deletion approval | Not requested |

**SAFE DELETE: BLOCKED**

Exact blockers: leftover table + ORM + seeds + reset scripts + bridges + `legacyPlanId` column + AA approval. Separate gated program after OD-4.
