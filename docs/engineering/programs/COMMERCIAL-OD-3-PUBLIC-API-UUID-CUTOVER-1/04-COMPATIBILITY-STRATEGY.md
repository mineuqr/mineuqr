# 04 — COMPATIBILITY STRATEGY

```
                 INPUT
                   │
          ┌────────┴────────┐
          ▼                 ▼
    Public/admin        Webhook
    UUID only           UUID or leftover integer
          │                 │
          │          parseWebhookPlanRef
          │                 │
          └────────┬────────┘
                   ▼
          Live Plan UUID
                   │
                   ▼
          Canonical runtime
                   │
                   ▼
              PERSIST UUID
```

| Boundary | Legacy Read | Legacy Write | UUID Read | UUID Write |
|----------|-------------|--------------|-----------|------------|
| Public checkout / Pricing | no | no | yes | yes |
| Admin / CS | no | no | yes | yes |
| listPlans | no | n/a | yes | n/a |
| Trial ingress | no | no | yes | yes |
| Webhooks | **yes** (in-flight) | no | yes | yes (new checkout) |
| Internal persist | no | no | yes | yes |
| Bind `legacyPlanId` | yes | reverse-map only (existing) | yes (`planId`) | UUID `planId` |

Deviation: webhook leftover **read** remains because in-flight PayPal/Tap payloads cannot be proven empty. New checkout **writes** UUID only.

No new `legacyPlanId` writer type. Bind still reverse-maps UUID → leftover integer for the existing column.
