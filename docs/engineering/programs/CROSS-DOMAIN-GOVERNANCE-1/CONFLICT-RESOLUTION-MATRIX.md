# Conflict Resolution Matrix

| Field | Value |
|-------|-------|
| **Program** | CROSS-DOMAIN-GOVERNANCE-1 |
| **Constitution** | CD-04 |
| **Date** | 2026-07-27 |

## Authority stack

```
Business Law
      ↓
Architecture
      ↓
Domain Ownership
      ↓
Implementation
```

## Worked conflicts

| Conflict | Higher authority | Resolution |
|----------|------------------|------------|
| Reporting UI labels Order totals as Total Sales | Business / Settlement Law + KPI Ownership | Fix Reporting presentation; Settlement Record remains SoT |
| Kitchen wants to complete Order status in KDS DB | Architecture + Order ownership | Kitchen emits/consumes events; Order production path only |
| Register claims ownership of Check grand total | Settlement / Check money ownership | Register = custody only (ADR-028) |
| Two domains claim same Aggregate write | Architecture + CD-01 | ADR; single owner; other becomes consumer |
| New “Analytics Platform” duplicates Reporting KPIs | Architecture + Reporting Constitutions | Merge or explicit boundary ADR; no dual SoT |
| Domain constitution contradicts Architecture Constitution | Architecture Constitution | Amend domain constitution or ADR exception |
| Implementation convenience vs Domain Ownership | Domain Ownership (above Implementation) | Refactor implementation |

## Process

1. Classify conflict layer  
2. Apply stack (higher wins)  
3. If intentional break needed → ADR (CV-03 / GOV-10)  
4. Update Constitution Registry / domain matrices  
5. Correct lower-layer mirrors/implementations (never elevate runtime to authority)
