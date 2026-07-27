# Constitution Extension Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Date** | 2026-07-27 |
| **Base constitutions** | Reporting UX v1.0 · KPI Ownership v1.0 |

## What this extension adds

| Addition | Rules |
|----------|-------|
| Reporting Object Model | OBJ-01 KPI · OBJ-02 Widget · OBJ-03 Analytics · OBJ-04 Dashboard Card |
| Layered relationship chain | Event → Source → KPI → Widget → Card → Dashboard → Export |
| KPI Lifecycle | KPI-07 mandatory lifecycle documentation + change governance |

## What this extension does not do

- Does not introduce product features  
- Does not change KPI formulas, owners, or sources  
- Does not elevate Payment Overview to a KPI  
- Does not amend financial laws or APIs  

## Ambiguity eliminated

| Before | After |
|--------|-------|
| “Card” vs “KPI” conflated | Card presents KPI; KPI owns semantics |
| Payment Overview unclear class | Widget / Card (not KPI) until ADR elevation |
| Analytics implied ownership | Analytics groups only (OBJ-03) |
| Lifecycle tribal knowledge | Mandatory Producer → Consumer chain (KPI-07) |

## Observations

1. Dual-layer Settlement Platform (plane) vs Check Management (write) retained.  
2. Payment Overview remains outside `KpiId` set by design.  
3. Parent constitutions still Pending adoption; this extension is likewise Pending until Architecture Authority approval.

## Final Verdict

**B. Adopted with observations**

Do not commit. Do not push. Do not deploy.  
Wait for Architecture Authority approval before adoption.
