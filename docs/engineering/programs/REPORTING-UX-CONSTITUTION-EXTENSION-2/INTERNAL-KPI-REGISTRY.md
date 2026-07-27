# Internal KPI Registry (Class 5)

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-08 Class 5 |
| **Date** | 2026-07-27 |

Internal KPIs MUST **NEVER** appear in customer-facing reporting (Dashboard, Excel, PDF for restaurants).

## Product dictionary

No Class 5 entries exist in `shared/reporting-platform/kpiDictionary.ts` (customer reporting SSOT). That is intentional.

## Platform monitoring candidates (architecture / ops — not product KPIs)

| Candidate name | Purpose | Allowed surfaces |
|----------------|---------|------------------|
| Projection Lag | Order Read / analytics freshness | Internal ops dashboards, alerts |
| Event Processing Delay | Domain event pipeline health | Internal ops / SRE |
| Queue Length | Async backlog | Internal ops / SRE |
| Projection Health | Read-model integrity | Internal ops / Architecture |

## Elevation rule

If an internal signal is proposed for customer UI, it MUST:

1. Be redefined as a product KPI (definition, owner, source, business name)  
2. Receive Class 1–4 classification (not remain Class 5)  
3. Pass KPI-07 lifecycle + KPI-09 if Executive  
4. Never ship as a leaked technical metric under Class 5 rules  
