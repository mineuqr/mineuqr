# 07 — BINDING PROOF

Production `commercial_subscription_bindings` at 2026-08-15T13:29:47.217Z.

| Fact | Value |
|------|-------|
| row count | 2 |
| `planId` column | varchar(36) NOT NULL |
| `planId` shape | 2 UUID |
| orphan binding UUID | 0 |
| disagreement `binding.planId` ≠ `user_subscriptions.planId` | **0** |
| `legacyPlanId` | populated: one `30001`, one `30003` |

`bindings.planId` = Live Plan UUID and equals the corresponding subscription UUID.

`bindings.legacyPlanId` remains temporarily. **Not removed.**

Writers still reverse-map leftover integers into `legacyPlanId` via `resolveLegacyPlanIdFromPlan`. That is existing compatibility, not a new integer subscription-identity writer.

Charged Terms on the same 2 rows: complete 2 / incomplete 0; currency USD; cycle monthly. Not rebuilt by this program.

## Decision

**BINDING GATE: PASS**
