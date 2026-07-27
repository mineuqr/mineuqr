# Root Cause Analysis

## Root cause

**Missing Reporting Platform projection / DTO for sales-by-ordering-channel.**

Data flow stops **before** the presentation layer:

| Stage | Status |
|-------|--------|
| Session / Order / Check Settlement | Works (Total Sales & payments appear elsewhere) |
| Settlement Record publication | Works |
| Reporting projections for Total Sales / payments / refunds / orders | Works |
| **Channel-attributed sales projection** | **Does not exist** |
| Sales Source UI | Had no facts to bind — showed placeholders |

## Not the root cause

- ExecutivePeriodDashboard (unrelated period cards)  
- Excel export  
- Payment Method Analytics  
- Client formatting bugs  

## Why hotfix cannot fully close success criteria

Architecture protection forbids modifying Reporting Platform, APIs, Read Models, and DTO contracts in this program. Publishing channel facts requires a separate architecture-approved reporting program.
