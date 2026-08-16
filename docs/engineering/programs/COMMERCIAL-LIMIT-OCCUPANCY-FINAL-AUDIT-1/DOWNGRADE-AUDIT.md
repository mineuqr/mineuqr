# DOWNGRADE AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

G-11 Policy B independently re-confirmed (15/15).

| Check | Result |
|-------|--------|
| Existing rows remain | Yes |
| New create at occupancy > cap | Rejected |
| occupancy 1 / cap 1 create | Rejected (`1+1 > 1`) |
| occupancy 0 / cap 1 create | Allowed |
| Hide category to “fit” cap | Occupancy unchanged (G-10) |
| POS replace occupancy > cap, delta 0 | Allowed |
| POS provision occupancy+1 > cap | Rejected |
| Upgrade | Immediate; occupancy 3 / cap 3 |
| Bind mutates domain rows | No |
| Debt table | None |

Exact create permission: `COUNT(*) + 1 <= effectiveCap`. At occupancy === new cap, create still fails.
