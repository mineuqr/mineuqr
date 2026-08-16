# CHECK OWNERSHIP

| Concern | Owner |
|---------|--------|
| Check identity / outcome | Check Domain (`operational_checks`) |
| Tax / currency snapshots | Check Domain |
| Monetary totals | Check Domain (`computeCheckMoney`) |
| Order ↔ Check membership | Check Domain (`check_order_membership`) |
| Settlement / paid | Check Domain (not this program) |
| POS authorization / terminal | POS |
| Intake command / POS idempotency | POS |

No `pos_checks` table. No POS monetary aggregate. POS does not calculate authoritative totals.
