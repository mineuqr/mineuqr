# 07 — RESOLVER RETIREMENT

| Function | Role after this program |
|----------|-------------------------|
| `resolveLivePlanById` | Canonical UUID resolver (checkout) |
| `resolveCanonicalLivePlanId` | Webhook dual-read only |
| `parseWebhookPlanRef` | Webhook leftover + UUID parse |
| `livePlanUuidInput` | Public/admin Zod UUID |

`resolveCanonicalLivePlanId` was **not** deleted because webhook leftover read is blocked.

Misleading name remains documented: do not use it for public contracts.
