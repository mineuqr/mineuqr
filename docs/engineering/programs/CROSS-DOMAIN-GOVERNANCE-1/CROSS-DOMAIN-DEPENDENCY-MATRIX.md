# Cross-Domain Dependency Matrix

| Field | Value |
|-------|-------|
| **Program** | CROSS-DOMAIN-GOVERNANCE-1 |
| **Constitution** | CD-02 |
| **Date** | 2026-07-27 |

## Legend

- **C** = May Consume (events / contracts / read models)  
- **—** = No dependency expected  
- **X** = Forbidden (would imply ownership or reverse authority)

Rows = consumer · Columns = provider

| Consumer ↓ \ Provider → | Order | Settlement | Reporting | Register | Session | Kitchen | Menu | Device | Waiter |
|-------------------------|-------|------------|-----------|----------|---------|---------|------|--------|--------|
| Order | — | —* | — | — | C† | — | C | — | — |
| Settlement | C | — | — | C (attribution) | C† | — | — | — | — |
| Reporting | C | C | — | C (ops signals) | C | C | C | — | — |
| Register | C | C | — | — | C† | — | — | C | — |
| Session | C | — | — | — | — | — | — | — | — |
| Kitchen | C | — | — | — | — | — | C | C | — |
| Menu | — | — | — | — | — | — | — | — | — |
| Device | — | — | — | — | — | — | — | — | — |
| Waiter | C | C (display only) | C (read) | C | C | C | C | C | — |

\*Order MUST NOT consume Settlement as co-owner of Order money; Order may reference commercial constraints via ACL, not own settlement publications.  
†Session coupling only through explicit contracts/events after graduation — no silent co-ownership.

## Directional rules

| Allowed | Forbidden |
|---------|-----------|
| Reporting consumes Settlement Record read models | Reporting writes Settlement Records |
| Kitchen consumes Order events | Kitchen mutates `orders` tables directly |
| Register attributes custody on settlement/refund | Register owns Check grand totals |
| Waiter UI calls Order application APIs | Waiter embeds Order invariants |
| Mutual event interest | Mutual write ownership |

## Shared enterprise services

Identity, Security, Time, Audit, Event bus — consumed by all; owned by their supporting/platform contexts, not by feature platforms (CD-03).
